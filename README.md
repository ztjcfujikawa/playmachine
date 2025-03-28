# gemini-proxy-panel

[中文介绍](./README_zh.md "中文介绍")<br>
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel)

## Introduction

`gemini-proxy-panel` is a proxy service deployed on Cloudflare Workers. It can forward requests formatted for the OpenAI API to the Google Gemini Pro API, allowing applications developed for OpenAI to seamlessly switch to or leverage the capabilities of Gemini models.

## Features

*   **OpenAI to Gemini Proxy**: Seamlessly translates OpenAI Chat API requests into Gemini Pro API requests.
*   **Multi-API Key Rotation**: Supports configuring multiple Gemini API keys and automatically rotates through them to distribute request load and circumvent rate limits.
*   **Quota and Usage Management**: Monitor the usage of each Gemini API key through an intuitive management interface.
*   **Key Management**: Centrally manage multiple Gemini API keys and Worker API keys (used to access this proxy service) within the management panel.
*   **Model Configuration**: Define and manage the Gemini models supported by this proxy in the management panel.
*   **Intuitive Management Interface**: Provides a Web UI (`/login` or `/admin`) to view API usage statistics and configure settings.
*   **One-Click Deployment**: Supports quick deployment to the Cloudflare Workers platform via the "Deploy to Cloudflare" button.

## Deployment

### Quick Deployment (Recommended)

1.  Click the [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel) button above.
2.  Follow the prompts from Cloudflare to complete the deployment process, authorizing access to your GitHub repository.
3.  After deployment, you will need to perform the necessary configurations.

### Manual Deployment (Using Wrangler)

1.  Clone this repository:
    ```bash
    git clone https://github.com/dreamhartley/gemini-proxy-panel.git
    cd gemini-proxy-panel
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Log in to Wrangler:
    ```bash
    npx wrangler login
    ```
4.  (Optional) Modify the `name` and `account_id` in the `wrangler.jsonc` file.
5.  Deploy:
    ```bash
    npx wrangler deploy
    ```

### Post-Deployment Configuration (Critical Steps)

Regardless of the deployment method used, you need to perform the following configurations in the Cloudflare dashboard after the initial deployment:

1.  **Create KV Namespaces**:
    *   In the Cloudflare dashboard, navigate to "Workers & Pages" -> "KV".
    *   Create two KV Namespaces:
        *   `GEMINI_KEYS_KV`
        *   `WORKER_CONFIG_KV`
    *   Note down their Namespace IDs.

2.  **Bind KV Namespaces to Worker**:
    *   Navigate to your deployed Worker (located under "Workers & Pages").
    *   Go to the Worker's "Settings" -> "Variables".
    *   In the "KV Namespace Bindings" section, add two bindings:
        *   Variable name: `GEMINI_KEYS_KV`, KV Namespace: Select the `GEMINI_KEYS_KV` you just created.
        *   Variable name: `WORKER_CONFIG_KV`, KV Namespace: Select the `WORKER_CONFIG_KV` you just created.
    *   Click "Save".

3.  **Set Environment Variables**:
    *   In the same Worker's "Settings" -> "Variables" page.
    *   In the "Environment Variables" section, add the following variables (click "Encrypt" to encrypt them for added security):
        *   `ADMIN_PASSWORD`: Set a secure password to log in to the management panel.
        *   `SESSION_SECRET_KEY`: Set a long and random string for session management. You can use a password generator to generate a strong random string (e.g., at least 32 characters).
    *   Click "Save".

4.  **Redeploy (If Necessary)**: If the Worker fails to automatically acquire the latest bindings and environment variables, you may need to manually trigger a new deployment (e.g., via Wrangler `npx wrangler deploy` or by updating the code in the Cloudflare dashboard and clicking "Deploy").

## Usage

### Management Panel

1.  Access the `/login` or `/admin` path of your Worker URL (e.g., `https://your-worker-name.your-subdomain.workers.dev/login`).
2.  Log in using the `ADMIN_PASSWORD` you set.
3.  In the management panel, you can:
    *   Add and manage your Gemini API keys.
    *   Add and manage API keys used to access this Worker proxy (Worker API Keys).
    *   Set global quotas for Pro and Flash series models.
    *   View usage statistics for each Gemini API key.
    *   Configure supported Gemini models.

### API Proxy

1.  Point the API endpoint of your application (originally configured to call the OpenAI API) to your deployed Worker URL (e.g., `https://your-worker-name.your-subdomain.workers.dev`).
2.  Ensure that your application includes valid authentication information when sending requests. This is usually done by carrying the "Worker API Key" configured in the management panel in the `Authorization` request header:
    ```
    Authorization: Bearer <your_worker_api_key>
    ```
3.  Send requests compatible with the OpenAI Chat Completions API. The Worker will convert them into Gemini API requests and return the formatted response.

## Configuration Overview

*   **KV Namespaces (Must Be Bound)**:
    *   `GEMINI_KEYS_KV`: Stores Gemini API keys and their usage.
    *   `WORKER_CONFIG_KV`: Stores Worker configurations, such as Worker API keys, supported models, etc.
*   **Environment Variables (Must Be Set)**:
    *   `ADMIN_PASSWORD`: The login password for the management panel.
    *   `SESSION_SECRET_KEY`: The key used to protect user session security.
