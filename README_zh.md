# gemini-proxy-panel

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel)

## 简介

`gemini-proxy-panel` 是一个部署在 Cloudflare Workers 上的代理服务。它可以将 OpenAI API 格式的请求转发给 Google Gemini Pro API，使得为 OpenAI 开发的应用能够无缝切换或利用 Gemini 模型的能力。

## 功能

*   **OpenAI 到 Gemini 代理**: 无缝将 OpenAI Chat API 请求转换为 Gemini Pro API 请求。
*   **多 API Key 轮询**: 支持配置多个 Gemini API Key，并自动轮询使用，以分摊请求负载和规避速率限制。
*   **配额与用量管理**: 通过直观的管理界面监控每个 Gemini API Key 的使用情况。
*   **密钥管理**: 在管理面板中集中管理多个 Gemini API Key 和 Worker API Key（用于访问此代理服务）。
*   **模型配置**: 在管理面板中定义和管理此代理支持的 Gemini 模型。
*   **直观的管理界面**: 提供 Web UI (`/login` 或 `/admin`) 查看 API 使用统计和配置设置。
*   **一键部署**: 支持通过 "Deploy to Cloudflare" 按钮快速部署到 Cloudflare Workers 平台。
*   **GitHub Actions 自动部署**: Fork 仓库后，可通过 GitHub Actions 实现推送代码时自动部署。

## 部署

你可以选择以下任一方式进行部署：

### 方式一：快速部署

1.  点击上方的 [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dreamhartley/gemini-proxy-panel) 按钮。
2.  根据 Cloudflare 的提示完成部署流程，授权访问你的 GitHub 仓库。
3.  部署完成后，你需要进行必要的 **部署后配置**。
    *   注意，当前项目还在开发中，使用Deploy to Cloudflare一键部署可能导致无法支持后续更新。

### 方式二：通过 GitHub Actions 自动部署 (推荐)

这种方式适合希望worker自动与原仓库同步更新的用户。

1.  **Fork 仓库**:
    *   点击本仓库右上角的 "Fork" 按钮，将此仓库 Fork到你自己的 GitHub 账户下。

2.  **获取 Cloudflare 信息**:
    *   **获取 Account ID**:
        *   登录 Cloudflare Dashboard。
        *   在主页右侧栏找到并复制你的 "账户 ID" (Account ID)。或者，导航到 "Workers & Pages"，在概览页面的右侧也能找到它。
    *   **获取 API Token**:
        *   在 Cloudflare Dashboard，点击右上角用户图标 -> "我的个人资料" (My Profile) -> "API 令牌" (API Tokens)。
        *   点击 "创建令牌" (Create Token)。
        *   找到 "Cloudflare Workers 编辑" (Edit Cloudflare Workers) 模板，点击 "使用模板" (Use template)。
        *   (可选) 你可以根据需要调整权限范围，但模板默认权限通常足够。确保至少包含 `Account` 资源的 `Workers Scripts:Edit` 和 `Workers KV Storage:Edit` 权限。
        *   选择你的账户资源和区域资源（通常保持默认的 "包括" -> "所有区域"）。
        *   点击 "继续以显示摘要" (Continue to summary)，然后点击 "创建令牌" (Create Token)。
        *   **立即复制生成的 API Token**，这个 Token 只会显示一次，请妥善保管。

3.  **在 GitHub 仓库中设置 Secrets**:
    *   进入你 **Fork 后的仓库** 的 GitHub 页面。
    *   点击 "Settings" -> "Secrets and variables" -> "Actions"。
    *   点击 "New repository secret" 按钮，添加以下两个 Secrets：
        *   `CF_ACCOUNT_ID`: 粘贴你之前获取的 Cloudflare Account ID。
        *   `CF_API_TOKEN`: 粘贴你之前创建并复制的 Cloudflare API Token。

4.  **(可选) 配置 PAT 以自动更新 Actions**:
    *   如果你希望 GitHub Actions 在运行时能够自动更新工作流文件（例如，当上游仓库更新了 `.github/workflows/deploy.yml` 文件后，你的 Fork 仓库也能通过某种机制自动拉取更新），或者执行需要写权限的操作，你可能需要配置一个 Personal Access Token (PAT)。
    *   **创建 PAT**:
        *   前往你的 GitHub "Settings" -> "Developer settings" -> "Personal access tokens" -> "Tokens (classic)"。
        *   点击 "Generate new token" -> "Generate new token (classic)"。
        *   给 Token 起一个描述性的名字，例如 `WORKFLOW_UPDATE_PAT`。
        *   设置过期时间。
        *   在 "Select scopes" 中，勾选 `workflow` (Update GitHub Action workflows)。
        *   点击 "Generate token"。
        *   **立即复制生成的 PAT**，并妥善保管。
    *   **设置 PAT Secret**:
        *   回到你 Fork 仓库的 "Settings" -> "Secrets and variables" -> "Actions"。
        *   点击 "New repository secret"，添加以下 Secret：
            *   `PAT`: 粘贴你刚刚创建并复制的 GitHub Personal Access Token。

5.  **触发部署**:
    *   当你向 Fork 仓库的 `main` 分支推送 (push) 代码更改时，GitHub Actions 会自动触发部署流程。
    *   你也可以在仓库的 "Actions" 标签页中，找到 "Deploy to Cloudflare Workers" 工作流，手动触发运行。

6.  **完成部署后配置**:
    *   首次通过 GitHub Actions 部署成功后，你仍然需要按照下面的 **部署后配置** 部分，在 Cloudflare Dashboard 中创建和绑定 KV Namespace，并设置环境变量。

### 方式三：手动部署

1.  克隆此仓库:
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
4.  (可选) 修改 `wrangler.toml` 文件中的 `name`（Worker 名称）和 `account_id`。如果你通过 GitHub Actions 部署，`account_id` 会从 Secret 读取。
5.  部署:
    ```bash
    npx wrangler deploy
    ```

### 部署后配置

在首次部署成功后，需要在 Cloudflare Dashboard 中执行以下配置：

1.  **创建 KV Namespace**: **（自动部署无须处理）**
    *   在 Cloudflare Dashboard 中，导航到 "Workers & Pages" -> "KV"。
    *   创建两个 KV Namespace:
        *   `GEMINI_KEYS_KV`
        *   `WORKER_CONFIG_KV`
    *   记下它们的 Namespace ID。

2.  **将 KV Namespace 绑定到 Worker**: **（自动部署无须处理）**
    *   导航到你部署的 Worker (位于 "Workers & Pages" 下)。
    *   进入 Worker 的 "设置" (Settings) -> "变量" (Variables)。
    *   在 "KV Namespace 绑定" (KV Namespace Bindings) 部分，点击 "编辑变量" (Edit variables)，然后添加两个绑定:
        *   变量名称 (Variable name): `GEMINI_KEYS_KV`, KV Namespace: 选择你刚创建的 `GEMINI_KEYS_KV`。
        *   变量名称 (Variable name): `WORKER_CONFIG_KV`, KV Namespace: 选择你刚创建的 `WORKER_CONFIG_KV`。
    *   点击 "保存" (Save)。

3.  **设置环境变量**: **（都需要处理）**
    *   在同一个 Worker 的 "设置" (Settings) -> "变量" (Variables) 页面。
    *   在 "环境变量" (Environment Variables) 部分，点击 "编辑变量" (Edit variables)，然后添加以下变量 (类型选择**密钥**):
        *   `ADMIN_PASSWORD`: 设置一个安全的密码，用于登录管理面板。
        *   `SESSION_SECRET_KEY`: 设置一个长且随机的字符串，用于会话管理。你可以使用密码生成器生成一个强随机字符串（例如，至少 32 个字符）。
    *   点击 "保存" (Save)。

4.  **重新部署 (如果需要)**:
    *   Cloudflare 通常会自动应用绑定和环境变量的更改。但如果 Worker 没有立即获取到最新的绑定和变量，你可能需要手动触发一次新的部署（例如，通过 Wrangler `npx wrangler deploy`，或者在 Cloudflare Dashboard 编辑代码后点击 "部署"，或者通过 GitHub Actions 再次推送或手动触发）。

## 使用

### 管理面板

1.  访问你的 Worker URL 的 `/login` 或 `/admin` 路径 (例如: `https://your-worker-name.your-subdomain.workers.dev/login`)。
2.  使用你设置的 `ADMIN_PASSWORD` 登录。
3.  在管理面板中，你可以:
    *   添加和管理你的 Gemini API Key。
    *   添加和管理用于访问此 Worker 代理的 API Key (Worker API Keys)。
    *   为 Pro 和 Flash 系列模型设置全局配额。
    *   查看每个 Gemini API Key 的使用统计。
    *   配置支持的 Gemini 模型。

### API 代理

1.  将你的应用程序的 API 端点（原本配置为调用 OpenAI API 的地址）指向你部署的 Worker URL (例如: `https://your-worker-name.your-subdomain.workers.dev/v1`)。
2.  确保你的应用在发送请求时包含有效的身份验证信息。这通常通过在 `Authorization` 请求头中携带在管理面板配置的 "Worker API Key" 来完成：
    ```
    Authorization: Bearer <your_worker_api_key>
    ```
3.  发送与 OpenAI Chat Completions API 兼容的请求。Worker 会将其转换为 Gemini API 请求，并返回格式化的响应。

## 配置概览

*   **KV Namespaces (必须绑定)**:
    *   `GEMINI_KEYS_KV`: 存储 Gemini API Key 及其使用情况。
    *   `WORKER_CONFIG_KV`: 存储 Worker 配置，如 Worker API Key、支持的模型等。
*   **环境变量 (必须设置)**:
    *   `ADMIN_PASSWORD`: 管理面板的登录密码。
    *   `SESSION_SECRET_KEY`: 用于保护用户会话安全的密钥。
*   **GitHub Actions Secrets (自动部署时需要)**:
    *   `CF_ACCOUNT_ID`: 你的 Cloudflare Account ID。
    *   `CF_API_TOKEN`: 用于部署 Worker 的 Cloudflare API Token。
    *   `PAT` (可选): 用于 GitHub Actions 工作流更新或其他需要仓库写权限操作的 Personal Access Token。
