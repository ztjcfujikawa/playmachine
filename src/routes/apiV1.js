// src/routes/apiV1.js

const express = require('express');
const { Readable, Transform } = require('stream'); // For handling streams and transforming
const requireWorkerAuth = require('../middleware/workerAuth');
const geminiProxyService = require('../services/geminiProxyService');
const configService = require('../services/configService'); // For /v1/models
const transformUtils = require('../utils/transform');

// Import vertexProxyService, which now includes manual loading logic
const vertexProxyService = require('../services/vertexProxyService');

const router = express.Router();

// Apply worker authentication middleware to all /v1 routes
router.use(requireWorkerAuth);

// --- /v1/models ---
router.get('/models', async (req, res, next) => {
    try {
        const modelsConfig = await configService.getModelsConfig();
        let modelsData = Object.keys(modelsConfig).map(modelId => ({
            id: modelId,
            object: "model",
            created: Math.floor(Date.now() / 1000), // Placeholder timestamp
            owned_by: "google", // Assuming all configured models are Google's
            // Add other relevant properties if available/needed
        }));

        // Add search versions for gemini-2.0+ series models
        const searchModels = Object.keys(modelsConfig)
            .filter(modelId => 
                // Match gemini-2.0, gemini-2.5, gemini-3.0, etc. series models
                /^gemini-[2-9]\.\d/.test(modelId) && 
                // Exclude models that are already search versions
                !modelId.endsWith('-search')
            )
            .map(modelId => ({
                id: `${modelId}-search`,
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: "google",
            }));
        
        // Add non-thinking versions for gemini-2.5-flash-preview models
        const nonThinkingModels = Object.keys(modelsConfig)
            .filter(modelId => 
                // Currently only gemini-2.5-flash-preview supports thinkingBudget
                modelId.includes('gemini-2.5-flash-preview') && 
                // Exclude models that are already non-thinking versions
                !modelId.endsWith(':non-thinking')
            )
            .map(modelId => ({
                id: `${modelId}:non-thinking`,
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: "google",
            }));
        
        // Merge regular, search and non-thinking model lists
        modelsData = [...modelsData, ...searchModels, ...nonThinkingModels];

        // If Vertex feature is enabled (via manual loading), add Vertex AI supported models
        if (vertexProxyService.isVertexEnabled()) {
            const vertexModels = vertexProxyService.getVertexSupportedModels().map(modelId => ({
                id: modelId,  // Model ID including [v] prefix
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: "google",
            }));
            
            // Add Vertex models to the list
            modelsData = [...modelsData, ...vertexModels];
        }

        res.json({ object: "list", data: modelsData });
    } catch (error) {
        console.error("Error handling /v1/models:", error);
        next(error); // Pass to global error handler
    }
});

// --- /v1/chat/completions ---
router.post('/chat/completions', async (req, res, next) => {
    const openAIRequestBody = req.body;
    const workerApiKey = req.workerApiKey; // Attached by requireWorkerAuth middleware
    const stream = openAIRequestBody?.stream ?? false;
    const requestedModelId = openAIRequestBody?.model; // Keep track for transformations
    
    try {
        // Check if this is a non-thinking model request
        const isNonThinking = requestedModelId?.endsWith(':non-thinking');
        // Remove the suffix for actual model lookup, but keep original for response
        const actualModelId = isNonThinking ? requestedModelId.replace(':non-thinking', '') : requestedModelId;
        
        // Set thinkingBudget to 0 for non-thinking models
        const thinkingBudget = isNonThinking ? 0 : undefined;
        
        // If model was modified, update the request body with the actual model ID
        if (isNonThinking) {
            openAIRequestBody.model = actualModelId;
        }

        let result;
        
        // Check if it's a Vertex model (with [v] prefix) and confirm Vertex feature is enabled
        if (requestedModelId && requestedModelId.startsWith('[v]') && vertexProxyService.isVertexEnabled()) {
            // Use Vertex proxy service to handle the request
            console.log(`Using Vertex AI to process model: ${requestedModelId}`);
            result = await vertexProxyService.proxyVertexChatCompletions(
                openAIRequestBody,
                workerApiKey,
                stream
            );
        } else {
            // Use Gemini proxy service to handle the request with optional thinkingBudget
            result = await geminiProxyService.proxyChatCompletions(
                openAIRequestBody,
                workerApiKey,
                stream,
                thinkingBudget
            );
        }

        // Check if the service returned an error
        if (result.error) {
            // Ensure Content-Type is set for error responses
            res.setHeader('Content-Type', 'application/json');
            return res.status(result.status || 500).json({ error: result.error });
        }

        // Destructure the successful result
        const { response: geminiResponse, selectedKeyId, modelCategory } = result;

        // --- Handle Response ---

        // Set common headers
        res.setHeader('X-Proxied-By', 'gemini-proxy-panel-node');
        res.setHeader('X-Selected-Key-ID', selectedKeyId); // Send back which key was used (optional)

        if (stream) {
            // --- Streaming Response ---
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            // Apply CORS headers if not already handled globally by middleware
            // res.setHeader('Access-Control-Allow-Origin', '*'); // Example if needed


            // Check in advance if it's keepalive mode, if so, no need to check the body stream
            if (!result.isKeepAlive) {
                if (!geminiResponse.body || typeof geminiResponse.body.pipe !== 'function') {
                    console.error('Gemini response body is not a readable stream for streaming request.');
                    // Send a valid SSE error event before closing
                    const errorPayload = JSON.stringify({ error: { message: 'Upstream response body is not readable.', type: 'proxy_error' } });
                    res.write(`data: ${errorPayload}\n\n`);
                    res.write('data: [DONE]\n\n');
                    return res.end();
                }
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let lineBuffer = '';
            let jsonCollector = '';
            let isCollectingJson = false;
            let openBraces = 0;
            let closeBraces = 0;

            // Implement stream processing transformer for both Gemini and Vertex streams
            const streamTransformer = new Transform({
                transform(chunk, encoding, callback) {
                    try {
                        const chunkStr = decoder.decode(chunk, { stream: true });
                        buffer += chunkStr;

                        // Process based on the source (Gemini or Vertex)
                        if (selectedKeyId === 'vertex-ai') {
                            // Vertex stream response is a series of continuous JSON objects without newline separation
                            // Use a method similar to Gemini to process JSON objects
                            let startPos = -1;
                            let endPos = -1;
                            let bracketDepth = 0;
                            let inString = false;
                            let escapeNext = false;
                            let flushed = false;
                            
                            // Scan the entire buffer to find complete JSON objects
                            for (let i = 0; i < buffer.length; i++) {
                                const char = buffer[i];
                                
                                // Handle characters inside strings
                                if (inString) {
                                    if (escapeNext) {
                                        escapeNext = false;
                                    } else if (char === '\\') {
                                        escapeNext = true;
                                    } else if (char === '"') {
                                        inString = false;
                                    }
                                    continue;
                                }
                                
                                // Handle characters outside strings
                                if (char === '{') {
                                    if (bracketDepth === 0) {
                                        startPos = i; // Record the starting position of a new JSON object
                                    }
                                    bracketDepth++;
                                } else if (char === '}') {
                                    bracketDepth--;
                                    if (bracketDepth === 0 && startPos !== -1) {
                                        endPos = i;
                                        
                                        // Extract and process the complete JSON object
                                        const jsonStr = buffer.substring(startPos, endPos + 1);
                                        try {
                                            const jsonObj = JSON.parse(jsonStr);
                                            if (jsonObj.done) {
                                                // console.log("Received [DONE] marker from Vertex stream."); // Removed log
                                                // Don't send [DONE] here, wait for flush
                                            } else {
                                                // Wrap in SSE format and send
                                                this.push(`data: ${JSON.stringify(jsonObj)}\n\n`);
                                                // Try to force flush the response
                                                if (typeof res.flush === 'function') res.flush();
                                            }
                                        } catch (e) {
                                            console.error("Error parsing Vertex JSON object:", e);
                                        }
                                        
                                        // Continue searching for the next object
                                        startPos = -1;
                                        
                                        // Truncate the processed part
                                        if (i + 1 < buffer.length) {
                                            buffer = buffer.substring(endPos + 1);
                                            i = -1; // Reset index to scan the remaining buffer from the beginning
                                        } else {
                                            buffer = '';
                                            break; // Exit loop if buffer is exhausted
                                        }
                                    }
                                } else if (char === '"') {
                                    inString = true;
                                }
                            }
                        } else {
                             // Original Gemini stream processing (find raw Gemini JSON chunks)
                            let startPos = -1;
                            let endPos = -1;
                        let bracketDepth = 0;
                        let inString = false;
                        let escapeNext = false;
                        
                        // Scan the entire buffer to find complete JSON objects
                        for (let i = 0; i < buffer.length; i++) {
                            const char = buffer[i];
                            
                            // Handle characters within strings
                            if (inString) {
                                if (escapeNext) {
                                    escapeNext = false;
                                } else if (char === '\\') {
                                    escapeNext = true;
                                } else if (char === '"') {
                                    inString = false;
                                }
                                continue;
                            }
                            
                            // Handle characters outside strings
                            if (char === '{') {
                                if (bracketDepth === 0) {
                                    startPos = i; // Record the starting position of a new JSON object
                                }
                                bracketDepth++;
                            } else if (char === '}') {
                                bracketDepth--;
                                if (bracketDepth === 0 && startPos !== -1) {
                                    endPos = i;
                                    
                                    // Extract and process the complete JSON object
                                    const jsonStr = buffer.substring(startPos, endPos + 1);
                                    try {
                                        const jsonObj = JSON.parse(jsonStr);
                                        // Immediately process and send this object
                                        processGeminiObject(jsonObj, this);
                                    } catch (e) {
                                        console.error("Error parsing JSON object:", e);
                                    }
                                    
                                                // Continue searching for the next object
                                                startPos = -1;
                                            }
                                        } else if (char === '"') {
                                            inString = true;
                                        } else if (char === '[' && !inString && startPos === -1) {
                                            // Ignore the start marker of JSON arrays, as we process each object individually
                                            continue;
                                        } else if (char === ']' && !inString && bracketDepth === 0) {
                                            // Ignore the end marker of JSON arrays
                                            continue;
                                        } else if (char === ',') {
                                            // If there's a comma after an object, continue processing the next object
                                            continue;
                                        }
                                    }
                                    
                                    // Keep the unprocessed part for Gemini stream
                                    if (startPos !== -1 && endPos !== -1 && endPos > startPos) {
                                        buffer = buffer.substring(endPos + 1);
                                    } else if (startPos !== -1) {
                                        buffer = buffer.substring(startPos);
                                    } else {
                                        buffer = '';
                                    }
                            } // End of else (Gemini stream processing)
                        
                        callback();
                    } catch (e) {
                        console.error("Error in stream transform:", e);
                        callback(e);
                    }
                },
                
                flush(callback) {
                    try {
                // Handling the remaining buffer
                if (buffer.trim()) {
                     if (selectedKeyId === 'vertex-ai') {
                        if (buffer.trim()) {
                            let startPos = -1;
                            let endPos = -1;
                            let bracketDepth = 0;
                            let inString = false;
                            let escapeNext = false;
                            
                            for (let i = 0; i < buffer.length; i++) {
                                const char = buffer[i];
                                
                                if (inString) {
                                    if (escapeNext) {
                                        escapeNext = false;
                                    } else if (char === '\\') {
                                        escapeNext = true;
                                    } else if (char === '"') {
                                        inString = false;
                                    }
                                    continue;
                                }
                                
                                if (char === '{') {
                                    if (bracketDepth === 0) {
                                        startPos = i;
                                    }
                                    bracketDepth++;
                                } else if (char === '}') {
                                    bracketDepth--;
                                    if (bracketDepth === 0 && startPos !== -1) {
                                        endPos = i;
                                        
                                        try {
                                            const jsonStr = buffer.substring(startPos, endPos + 1);
                                            const jsonObj = JSON.parse(jsonStr);
                                            if (!jsonObj.done) { // Avoid duplicate DONE
                                                this.push(`data: ${JSON.stringify(jsonObj)}\n\n`);
                                            }
                                        } catch (e) {
                                            console.debug("Could not parse Vertex buffer JSON:", e);
                                        }
                                        
                                        // Update the buffer and reset the index
                                        if (endPos + 1 < buffer.length) {
                                            buffer = buffer.substring(endPos + 1);
                                            i = -1; // Reset index
                                        } else {
                                            buffer = '';
                                            break;
                                        }
                                    }
                                } else if (char === '"') {
                                    inString = true;
                                }
                            }
                        }
                     } else {
                                // Try parsing remaining Gemini JSON object
                                try {
                                    const jsonObj = JSON.parse(buffer);
                                    processGeminiObject(jsonObj, this); // Use existing Gemini processing
                                } catch (e) {
                                    console.debug("Could not parse final Gemini buffer:", buffer, e);
                                }
                             }
                        }
                        
                        // Always send the final [DONE] event
                                                // console.log("Stream transformer flushing, sending [DONE]."); // Removed log
                                                this.push('data: [DONE]\n\n');
                                                callback();
                                            } catch (e) {
                                                console.error("Error in stream flush:", e); // Keep error log in English
                        callback(e);
                    }
                }
            });
            
            // Process a single Gemini API response object and convert it to OpenAI format
            function processGeminiObject(geminiObj, stream) {
                if (!geminiObj) return;
                
                // If it's a valid Gemini response object (contains candidates)
                if (geminiObj.candidates && geminiObj.candidates.length > 0) {
                    // Convert and send directly
                    const openaiChunkStr = transformUtils.transformGeminiStreamChunk(geminiObj, requestedModelId);
                    if (openaiChunkStr) {
                        stream.push(openaiChunkStr);
                    }
                } else if (Array.isArray(geminiObj)) {
                    // If it's an array, process each element
                    for (const item of geminiObj) {
                        processGeminiObject(item, stream);
                    }
                } else if (geminiObj.text) {
                    // Single text fragment, construct Gemini format
                    const mockGeminiChunk = {
                        candidates: [{
                            content: {
                                parts: [{ text: geminiObj.text }],
                                role: "model"
                            }
                        }]
                    };
                    
                    const openaiChunkStr = transformUtils.transformGeminiStreamChunk(mockGeminiChunk, requestedModelId);
                    if (openaiChunkStr) {
                        stream.push(openaiChunkStr);
                    }
                }
                // May need to handle other response types...
            }

            // Check if this is a keepalive special response or normal streaming
            if (result.isKeepAlive) { // Flag set by keepalive mode (non-streaming converted to streaming)
                const geminiResponseData = result.response; // Directly get the parsed JSON data
                const requestedModelId = result.requestedModelId;

                console.log(`Processing KEEPALIVE mode response`);

                // Create a Node.js Readable stream to send to the client
                const keepAliveStream = new Readable({
                    read() {} // Required empty read method
                });

                // Function to send keepalive messages
                const sendKeepAlive = () => {
                    const keepAliveData = {
                        id: "keepalive",
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: requestedModelId,
                        choices: [{
                            index: 0,
                            delta: {},
                            finish_reason: null
                        }]
                    };

                    // Send empty delta as keepalive signal
                    keepAliveStream.push(`data: ${JSON.stringify(keepAliveData)}\n\n`);
                };

                // Start sending keepalive messages
                const keepAliveInterval = setInterval(sendKeepAlive, 5000);

                // Send the first keepalive immediately
                sendKeepAlive();

                // Convert to OpenAI format
                const openAIResponse = JSON.parse(transformUtils.transformGeminiResponseToOpenAI(
                    geminiResponseData, 
                    requestedModelId
                ));

                // Get the complete response content
                const content = openAIResponse.choices[0].message.content || "";

                // Create role information and complete content block
                const roleChunk = {
                    id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: requestedModelId,
                    choices: [{
                        index: 0,
                        delta: { role: "assistant" },
                        finish_reason: null
                    }]
                };
                
                const contentChunk = {
                    id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: requestedModelId,
                    choices: [{
                        index: 0,
                        delta: { content: content },
                        finish_reason: null
                    }]
                };
                
                const finishChunk = {
                    id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: requestedModelId,
                    choices: [{
                        index: 0,
                        delta: {},
                        finish_reason: openAIResponse.choices[0].finish_reason || "stop"
                    }]
                };

                // Send the complete response immediately without delay or chunking
                try {
                    // Clear the keepalive timer
                    clearInterval(keepAliveInterval);

                    // Create a single complete response object instead of multiple chunks
                    const completeResponseChunk = {
                        id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: requestedModelId,
                        choices: [{
                            index: 0,
                            delta: { 
                                role: "assistant",
                                content: content 
                            },
                            finish_reason: openAIResponse.choices[0].finish_reason || "stop"
                        }]
                    };

                    // Send the complete response and end marker at once
                    keepAliveStream.push(`data: ${JSON.stringify(completeResponseChunk)}\n\n`);
                    keepAliveStream.push('data: [DONE]\n\n');
                    keepAliveStream.push(null);
                } catch (error) {
                    // Clear the timer on error
                    clearInterval(keepAliveInterval);

                    // Send error message
                    console.error("Error processing Gemini response in KEEPALIVE mode:", error);
                    const errorResponse = {
                        id: "error",
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: requestedModelId,
                        choices: [{
                            index: 0,
                            delta: { content: `Error: ${error.message}` },
                            finish_reason: "stop"
                        }]
                    };
                    keepAliveStream.push(`data: ${JSON.stringify(errorResponse)}\n\n`);
                    keepAliveStream.push('data: [DONE]\n\n');
                    keepAliveStream.push(null);
                }

                // Pipe keepAliveStream to the response
                keepAliveStream.pipe(res);
            } else {
                 // Standard Gemini and Vertex streams are now processed by the updated transformer
                 console.log(`Piping ${selectedKeyId === 'vertex-ai' ? 'Vertex' : 'Gemini'} stream through transformer.`);
                 geminiResponse.body.pipe(streamTransformer).pipe(res);
            }

            // Register error handling - needed for non-keepalive mode
            if (!result.isKeepAlive) {
                // Handle errors on the source stream (Gemini or Vertex)
                geminiResponse.body.on('error', (err) => {
                    console.error(`Error reading stream from upstream (${selectedKeyId}):`, err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: { message: 'Error reading stream from upstream API.' } });
                    } else {
                        res.end(); // End the connection
                    }
                });

                // Handle errors on the transformer stream
                streamTransformer.on('error', (err) => {
                    console.error('Error in stream transformer:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: { message: 'Error processing stream data.' } });
                    } else {
                        res.end();
                    }
                });
            }

             console.log(`Streaming response initiated for key ${selectedKeyId}`);


        } else {
            // --- Non-Streaming Response ---
            res.setHeader('Content-Type', 'application/json; charset=utf-8');

            try {
                if (selectedKeyId === 'vertex-ai') {
                    // Vertex service already transformed the response to OpenAI format
                    const openaiJson = await geminiResponse.json(); // Get the pre-transformed JSON
                    res.status(geminiResponse.status || 200).json(openaiJson); // Send it directly
                    console.log(`Non-stream Vertex request completed, status: ${geminiResponse.status || 200}`);
                } else {
                    // Original Gemini service response handling
                    const geminiJson = await geminiResponse.json(); // Parse the raw upstream Gemini JSON
                    const openaiJsonString = transformUtils.transformGeminiResponseToOpenAI(geminiJson, requestedModelId); // Transform it
                    // Use Gemini's original status code if available and OK, otherwise default to 200
                    res.status(geminiResponse.ok ? geminiResponse.status : 200).send(openaiJsonString);
                    console.log(`Non-stream Gemini request completed for key ${selectedKeyId}, status: ${geminiResponse.status}`);
                }
            } catch (jsonError) {
                 console.error("Error parsing Gemini non-stream JSON response:", jsonError);
                 // Check if response text might give clues
                 try {
                    const errorText = await geminiResponse.text(); // Need to re-read or clone earlier
                    console.error("Gemini non-stream response text:", errorText);
                 } catch(e){}
                 next(new Error("Failed to parse upstream API response.")); // Pass to global error handler
            }
        }

    } catch (error) {
        console.error("Error in /v1/chat/completions handler:", error);
        next(error); // Pass error to the global Express error handler
    }
});

module.exports = router;