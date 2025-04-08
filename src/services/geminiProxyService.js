const fetch = require('node-fetch');
const { syncToGitHub } = require('../db'); 
const configService = require('./configService');
const geminiKeyService = require('./geminiKeyService');
const transformUtils = require('../utils/transform');

// Base Gemini API URL
const BASE_GEMINI_URL = 'https://generativelanguage.googleapis.com';
// Cloudflare Gateway base path
const CF_GATEWAY_BASE = 'https://gateway.ai.cloudflare.com/v1';
// Project ID regex pattern - 32 character hex string
const PROJECT_ID_REGEX = /^[0-9a-f]{32}$/i;
// Default Cloudflare Gateway project ID
const DEFAULT_PROJECT_ID = 'db16589aa22233d56fe69a2c3161fe3c';

async function proxyChatCompletions(openAIRequestBody, workerApiKey, stream) {
    const requestedModelId = openAIRequestBody?.model;

    if (!requestedModelId) {
        return { error: { message: "Missing 'model' field in request body" }, status: 400 };
    }
    if (!openAIRequestBody.messages || !Array.isArray(openAIRequestBody.messages)) {
        return { error: { message: "Missing or invalid 'messages' field in request body" }, status: 400 };
    }

    const MAX_RETRIES = 3;
    let lastError = null;
    let lastErrorStatus = 500;
    let modelInfo;
    let modelCategory;
    let isSafetyEnabled;
    let modelsConfig;

    try {
        // Fetch model config and safety settings once before the loop
        [modelsConfig, isSafetyEnabled] = await Promise.all([
            configService.getModelsConfig(),
            configService.getWorkerKeySafetySetting(workerApiKey) // Get safety setting for this worker key
        ]);

        modelInfo = modelsConfig[requestedModelId];
        if (!modelInfo) {
            return { error: { message: `Model '${requestedModelId}' is not configured in the proxy.` }, status: 400 };
        }
        modelCategory = modelInfo.category;

        // --- Retry Loop ---
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            let selectedKey;
            try {
                // 1. Get Key inside the loop for each attempt
                selectedKey = await geminiKeyService.getNextAvailableGeminiKey(requestedModelId);

                // 2. Validate Key
                if (!selectedKey) {
                    console.error(`Attempt ${attempt}: No available Gemini API Key found.`);
                    if (attempt === 1) {
                        // If no key on first try, return 503 immediately
                        return { error: { message: "No available Gemini API Key configured or all keys are currently rate-limited/invalid." }, status: 503 };
                    } else {
                        // If no key on subsequent tries (after 429), return the last recorded 429 error
                         console.error(`Attempt ${attempt}: No more keys to try after previous 429.`);
                         return { error: lastError, status: lastErrorStatus };
                    }
                }

                console.log(`Attempt ${attempt}: Proxying request for model: ${requestedModelId}, Category: ${modelCategory}, KeyID: ${selectedKey.id}, Safety: ${isSafetyEnabled}`);

                // 3. Transform Request Body (remains the same)
                const { contents, systemInstruction, tools: geminiTools } = transformUtils.transformOpenAiToGemini(
                    openAIRequestBody,
                    requestedModelId,
                    isSafetyEnabled // Pass safety setting to transformer
                );

                if (contents.length === 0 && !systemInstruction) {
                    return { error: { message: "Request must contain at least one user or assistant message." }, status: 400 };
                }

                const geminiRequestBody = {
                    contents: contents,
                    generationConfig: {
                        ...(openAIRequestBody.temperature !== undefined && { temperature: openAIRequestBody.temperature }),
                        ...(openAIRequestBody.top_p !== undefined && { topP: openAIRequestBody.top_p }),
                        ...(openAIRequestBody.max_tokens !== undefined && { maxOutputTokens: openAIRequestBody.max_tokens }),
                        ...(openAIRequestBody.stop && { stopSequences: Array.isArray(openAIRequestBody.stop) ? openAIRequestBody.stop : [openAIRequestBody.stop] }),
                    },
                    ...(geminiTools && { tools: geminiTools }),
                    ...(systemInstruction && { systemInstruction: systemInstruction }),
                };

                if (!isSafetyEnabled) {
                    geminiRequestBody.safetySettings = [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }, 
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' }, 
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' }, 
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' }, 
                        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }, 
                    ];
                     console.log("Applying safety settings.");
                }

                // 4. Prepare and Send Request to Gemini
                const apiAction = stream ? 'streamGenerateContent' : 'generateContent';
                
                // Build base URL based on CF_GATEWAY environment variable
                let baseUrl = BASE_GEMINI_URL;
                let cfGateway = process.env.CF_GATEWAY;
                
                // Return default URL if CF_GATEWAY is not set
                if (!cfGateway) {
                    // Use default Gemini API URL
                } else {
                    // Handle case 1: CF_GATEWAY = "1" (use default project ID)
                    if (cfGateway === '1') {
                        // Validate default project ID format
                        if (PROJECT_ID_REGEX.test(DEFAULT_PROJECT_ID)) {
                            // Only use default Cloudflare Gateway if project ID format is valid
                            baseUrl = `${CF_GATEWAY_BASE}/${DEFAULT_PROJECT_ID}/gemini/google-ai-studio`;
                        }
                        // If invalid, fall back to default Gemini API URL
                    } else {
                        // Extract projectId/gatewayName from any string that contains it
                        try {
                            // Remove trailing slashes
                            cfGateway = cfGateway.replace(/\/+$/, '');
                            
                            // Try to extract projectId/gatewayName pattern from anywhere in the string
                            // This will work for both full URLs and direct format strings
                            const pattern = /([0-9a-f]{32})\/([^\/\s]+)/i;
                            const matches = cfGateway.match(pattern);
                            
                            if (matches && matches.length >= 3) {
                                const projectId = matches[1];
                                const gatewayName = matches[2];
                                
                                if (PROJECT_ID_REGEX.test(projectId)) {
                                    baseUrl = `${CF_GATEWAY_BASE}/${projectId}/${gatewayName}/google-ai-studio`;
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing CF_GATEWAY value:', error);
                            // Fall back to default URL on error
                        }
                    }
                    // For any other value of CF_GATEWAY, keep using default Gemini API URL
                }
                
                // Build complete API URL
                const geminiUrl = `${baseUrl}/v1beta/models/${requestedModelId}:${apiAction}`;
                
                const geminiRequestHeaders = {
                    'Content-Type': 'application/json',
                    'User-Agent': `gemini-proxy-panel-node/1.0`,
                    'x-goog-api-key': selectedKey.key
                };

                console.log(`Attempt ${attempt}: Sending ${stream ? 'streaming' : 'non-streaming'} request to Gemini URL: ${geminiUrl}`);

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: geminiRequestHeaders,
                    body: JSON.stringify(geminiRequestBody),
                    size: 100 * 1024 * 1024,
                    timeout: 300000
                });

                // 5. Handle Gemini Response Status and Errors
                if (!geminiResponse.ok) {
                    const errorBodyText = await geminiResponse.text();
                    console.error(`Attempt ${attempt}: Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`, errorBodyText);

                    lastErrorStatus = geminiResponse.status; // Store status
                    try {
                        lastError = JSON.parse(errorBodyText).error || { message: errorBodyText }; // Try parsing, fallback to text
                    } catch {
                        lastError = { message: errorBodyText };
                    }
                     // Add type and code if not present from Gemini
                    if (!lastError.type) lastError.type = `gemini_api_error_${geminiResponse.status}`;
                    if (!lastError.code) lastError.code = geminiResponse.status;


                    // Handle specific errors impacting key status
                    if (geminiResponse.status === 429) {
                        // Record 429 for the key
                        geminiKeyService.handle429Error(selectedKey.id, modelCategory, requestedModelId)
                            .catch(err => console.error(`Error handling 429 for key ${selectedKey.id} in background:`, err));

                        // If not the last attempt, continue to the next key
                        if (attempt < MAX_RETRIES) {
                            console.warn(`Attempt ${attempt}: Received 429, trying next key...`);
                            continue; // Go to the next iteration of the loop
                        } else {
                            console.error(`Attempt ${attempt}: Received 429, but max retries reached.`);
                            // Fall through to return the last recorded 429 error after the loop
                        }
                    } else if (geminiResponse.status === 401 || geminiResponse.status === 403) {
                        // Record persistent error for the key
                        geminiKeyService.recordKeyError(selectedKey.id, geminiResponse.status)
                             .catch(err => console.error(`Error recording key error ${geminiResponse.status} for key ${selectedKey.id} in background:`, err));
                        // Do not retry for 401/403, break and return this error
                        break;
                    } else {
                         // For other errors (400, 500, etc.), don't retry, break and return the error
                         console.error(`Attempt ${attempt}: Received non-retryable error ${geminiResponse.status}.`);
                         break;
                    }
                } else {
                    // 6. Process Successful Response
                    console.log(`Attempt ${attempt}: Request successful with key ${selectedKey.id}.`);
                    // Increment usage count (assume this updates DB but doesn't sync every time, or its internal sync is secondary)
                    geminiKeyService.incrementKeyUsage(selectedKey.id, requestedModelId, modelCategory)
                          .catch(err => console.error(`Error incrementing usage for key ${selectedKey.id} in background:`, err));

                    console.log(`Chat completions call completed successfully.`);

                    // Return the successful response object
                    return {
                        response: geminiResponse,
                        selectedKeyId: selectedKey.id,
                        modelCategory: modelCategory
                    };
                }

            } catch (fetchError) {
                 // Catch network errors or other errors during fetch/key selection within an attempt
                 console.error(`Attempt ${attempt}: Error during proxy call:`, fetchError);
                 lastError = { message: `Internal Proxy Error during attempt ${attempt}: ${fetchError.message}`, type: 'proxy_internal_error' };
                 lastErrorStatus = 500;
                 // If a network error occurs, break the loop, don't retry immediately
                 break;
            }
        } // --- End Retry Loop ---

        // If the loop finished without returning a success or a specific non-retryable error,
        // it means all retries resulted in 429 or we broke due to an error. Return the last recorded error.
        console.error(`All ${MAX_RETRIES} attempts failed. Returning last recorded error (Status: ${lastErrorStatus}).`);
        return { error: lastError, status: lastErrorStatus };


    } catch (initialError) {
         // Catch errors happening *before* the loop starts (e.g., getting initial config)
        console.error("Error before starting proxy attempts:", initialError);
        return {
            error: {
                message: `Internal Proxy Error: ${error.message}`,
                type: 'proxy_internal_error'
            },
            status: 500
        };
    }
}


module.exports = {
    proxyChatCompletions,
};
