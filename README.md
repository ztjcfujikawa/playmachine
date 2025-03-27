# gemini-proxy-panel

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel)
<!-- 请注意：你需要将上面的 deploy.workers.cloudflare.com 链接替换为通过 Cloudflare 为你的仓库生成的特定部署链接 -->

## 简介

`gemini-proxy-panel` 是一个部署在 Cloudflare Workers 上的代理服务。它能够将遵循 OpenAI API 格式的请求转发给 Google Gemini Pro API，从而允许为 OpenAI 开发的应用程序无缝切换或利用 Gemini 模型的能力。

项目地址：[https://github.com/dreamhartley/gemini-proxy-panel](https://github.com/dreamhartley/gemini-proxy-panel)

## 特色

*   **OpenAI 转 Gemini 代理**: 无缝地将 OpenAI 聊天 API 请求转换为 Gemini Pro API 请求。
*   **多 API 密钥轮询**: 支持配置多个 Gemini API 密钥，并自动轮询使用，以分摊请求负载和规避速率限制。
*   **额度与使用管理**: 通过直观的管理界面监控各个 Gemini API 密钥的使用情况。
*   **密钥管理**: 在管理面板中集中管理多个 Gemini API 密钥以及用于访问此代理服务的 Worker API 密钥。
*   **模型配置**: 在管理面板中定义和管理此代理支持的 Gemini 模型。
*   **直观的管理界面**: 提供 Web UI (`/login` 或 `/admin`) 查看 API 使用统计和进行配置。
*   **一键部署**: 支持通过 "Deploy to Cloudflare" 按钮快速部署到 Cloudflare Workers 平台。

## 部署

### 快速部署 (推荐)

1.  点击上方的 [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel) 按钮。
    *   **重要**: 你可能需要先 Fork 本仓库，然后通过 Cloudflare 仪表板为你的 Fork 生成特定的部署按钮链接，并更新此 README 中的链接。
2.  按照 Cloudflare 的提示完成部署流程，授权访问你的 GitHub 仓库。
3.  部署完成后，你需要进行必要的配置。

### 手动部署 (使用 Wrangler)

1.  克隆本仓库:
    ```bash
    git clone https://github.com/dreamhartley/gemini-proxy-panel.git
    cd gemini-proxy-panel
    ```
2.  安装依赖:
    ```bash
    npm install
    ```
3.  登录 Wrangler:
    ```bash
    npx wrangler login
    ```
4.  (可选) 修改 `wrangler.toml` 文件中的 `name` 和 `account_id`。
5.  部署:
    ```bash
    npx wrangler deploy
    ```

### 部署后配置 (关键步骤)

无论使用哪种部署方式，首次部署后都需要在 Cloudflare 仪表板中进行以下配置：

1.  **创建 KV Namespace**:
    *   在 Cloudflare 仪表板中，导航到 "Workers & Pages" -> "KV"。
    *   创建两个 KV Namespace：
        *   `GEMINI_KEYS_KV`
        *   `WORKER_CONFIG_KV`
    *   记下它们的 Namespace ID。

2.  **绑定 KV Namespace 到 Worker**:
    *   导航到你部署的 Worker (位于 "Workers & Pages" 下)。
    *   进入 Worker 的 "Settings" -> "Variables"。
    *   在 "KV Namespace Bindings" 部分，添加两个绑定：
        *   变量名称: `GEMINI_KEYS_KV`, KV Namespace: 选择你刚创建的 `GEMINI_KEYS_KV`。
        *   变量名称: `WORKER_CONFIG_KV`, KV Namespace: 选择你刚创建的 `WORKER_CONFIG_KV`。
    *   点击 "Save"。

3.  **设置环境变量**:
    *   在同一 Worker 的 "Settings" -> "Variables" 页面。
    *   在 "Environment Variables" 部分，添加以下变量（点击 "Encrypt" 对其加密以增加安全性）：
        *   `ADMIN_PASSWORD`: 设置一个安全的密码，用于登录管理面板。
        *   `SESSION_SECRET_KEY`: 设置一个长且随机的字符串，用于会话管理。你可以使用密码生成器生成一个强随机字符串（例如，至少 32 个字符）。
    *   点击 "Save"。

4.  **重新部署 (如果需要)**: 如果 Worker 未能自动获取最新的绑定和环境变量，你可能需要手动触发一次新的部署 (例如通过 Wrangler `npx wrangler deploy` 或在 Cloudflare 仪表板更新代码后点击 "Deploy")。

## 使用方法

### 管理面板

1.  访问你的 Worker URL 的 `/login` 或 `/admin` 路径 (例如: `https://your-worker-name.your-subdomain.workers.dev/login`)。
2.  使用你设置的 `ADMIN_PASSWORD` 登录。
3.  在管理面板中，你可以：
    *   添加和管理你的 Gemini API 密钥。
    *   添加和管理用于访问此 Worker 代理的 API 密钥 (Worker API Keys)。
    *   查看各个 Gemini API 密钥的使用统计。
    *   配置支持的 Gemini 模型。

### API 代理

1.  将你的应用程序 (原本配置为调用 OpenAI API) 的 API 端点指向你部署的 Worker URL (例如: `https://your-worker-name.your-subdomain.workers.dev`)。
2.  确保你的应用程序在发送请求时，包含有效的身份验证信息。这通常是通过 `Authorization` 请求头携带在管理面板中配置的 "Worker API Key" 来完成：
    ```
    Authorization: Bearer <your_worker_api_key>
    ```
3.  发送与 OpenAI Chat Completions API 兼容的请求。Worker 会将其转换为 Gemini API 请求，并将响应格式化后返回。

## 配置概览

*   **KV Namespaces (必须绑定)**:
    *   `GEMINI_KEYS_KV`: 存储 Gemini API 密钥及其使用情况。
    *   `WORKER_CONFIG_KV`: 存储 Worker 配置，如 Worker API 密钥、支持的模型等。
*   **Environment Variables (必须设置)**:
    *   `ADMIN_PASSWORD`: 管理面板的登录密码。
    *   `SESSION_SECRET_KEY`: 用于保护用户会话安全的密钥。
