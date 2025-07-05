# gemini-proxy-panel

## 简介

`gemini-proxy-panel` 是一个代理服务。它可以将 OpenAI API 格式的请求转发给 Google Gemini Pro API，使得为 OpenAI 开发的应用能够无缝切换或利用 Gemini 模型的能力。

## 功能

* **OpenAI 到 Gemini 代理**: 无缝将 OpenAI Chat API 请求转换为 Gemini Pro API 请求。
* **多 API Key 轮询**: 支持配置多个 Gemini API Key，并自动轮询使用，以分摊请求负载和规避速率限制。
* **配额与用量管理**: 通过直观的管理界面监控每个 Gemini API Key 的使用情况。
* **密钥管理**: 在管理面板中集中管理多个 Gemini API Key 和 Worker API Key（用于访问此代理服务）。
* **模型配置**: 在管理面板中定义和管理此代理支持的 Gemini 模型。
* **直观的管理界面**: 提供 Web UI (`/login` 或 `/admin`) 查看 API 使用统计和配置设置。
* **一键部署**: 支持通过 "Deploy to Cloudflare" 按钮快速部署到 Cloudflare Workers 平台。
* **GitHub Actions 自动部署**: Fork 仓库后，可通过 GitHub Actions 实现推送代码时自动部署。
* **GitHub 同步数据库**: 利用GitHub仓库自动同步数据库

## Hugging Face Space 部署

此部署方式利用 Hugging Face Space 的 Docker 环境运行，并**强制要求启用 GitHub 同步**功能以实现数据持久化。

1. **准备 GitHub 仓库和 PAT**:
   
   * 你需要一个**自己的** GitHub 仓库来存储同步的数据。建议使用私有仓库。
   * 创建一个 GitHub Personal Access Token (PAT)，并确保勾选了 `repo` 权限范围。**请妥善保管此 Token**。
2. **创建 Hugging Face Space**:
   
   * 访问 Hugging Face 并创建一个新的 Space。
   * 选择 "Docker" 作为 Space SDK。
   * 选择 "Use existing Dockerfile from repository"。
3. **配置 Space Secrets**:
   
   * 进入你创建的 Space 的 "Settings" -> "Repository secrets"。
   * 添加以下 Secrets：
     * `ADMIN_PASSWORD`: 设置管理面板的登录密码。
     * `SESSION_SECRET_KEY`: 设置一个长且随机的会话密钥。
     * `GITHUB_PROJECT`: 填入你**自己的** GitHub 仓库路径，格式为 `your-username/your-repo-name`。
     * `GITHUB_PROJECT_PAT`: 填入你创建的 GitHub PAT。
     * `GITHUB_ENCRYPT_KEY`: 设置一个用于加密同步数据的密钥，**必须是 32 位或更长的字符串**。
4. **创建 Dockerfile**:
   
   * 在你的 Hugging Face Space 的 "Files" 标签页中，点击 "Add file" -> "Create new file"。
   * 将文件名设置为 `Dockerfile`。
   * 将以下内容粘贴到文件中：
     ```dockerfile
     FROM dreamhartley705/gemini-proxy-panel:huggingface
     ```
   * 点击 "Commit new file"。
5. **启动和访问**:
   
   * Hugging Face Space 会自动使用此 `Dockerfile` 构建并启动应用。
   * 应用启动后，会使用你配置的 Secrets 连接到你的 GitHub 仓库进行数据同步。
   * 你可以通过 Space 提供的 URL 访问管理面板 (`/login` 或 `/admin`) 和 API (`/v1`)。



## 本地 Node.js 部署

此方式适合本地开发和测试。

1. **克隆仓库**:
    
    ```bash
    git clone https://github.com/dreamhartley/gemini-proxy-panel.git
    cd gemini-proxy-panel
    ```
2. **安装依赖**:
    
    ```bash
    npm install
    ```
3. **配置环境变量**:
    
    * 复制 `.env.example` 文件为 `.env`:
        ```bash
        cp .env.example .env
        ```
    * 编辑 `.env` 文件，至少设置以下变量：
        * `ADMIN_PASSWORD`: 设置管理面板的登录密码。
        * `SESSION_SECRET_KEY`: 设置一个长且随机的字符串用于会话安全（例如，使用 `openssl rand -base64 32` 生成）。
        * `PORT` (可选): 默认是 3000，可以根据需要修改。
    * **(可选) 配置 GitHub 同步**: 如果需要将数据同步到 GitHub 仓库，请配置以下变量：
        * `GITHUB_PROJECT`: 你的 GitHub 仓库路径，格式为 `username/repo-name`。**注意：这是你自己的仓库，用于存储数据备份，并非本项目仓库。**
        * `GITHUB_PROJECT_PAT`: 你的 GitHub Personal Access Token，需要 `repo` 权限。
        * `GITHUB_ENCRYPT_KEY`: 用于加密同步数据的密钥，必须是 32 位或更长的字符串。
4. **启动服务**:
    
    ```bash
    npm start
    ```
    
    服务将在 `http://localhost:3000` (或你配置的端口) 运行。

## Docker 部署

你可以使用 Docker 或 Docker Compose 快速部署。

### 方式一：使用 `docker build` 和 `docker run`

1. **克隆仓库**:
    
    ```bash
    git clone https://github.com/dreamhartley/gemini-proxy-panel.git
    cd gemini-proxy-panel
    ```
2. **配置环境变量**:
    
    * 复制 `.env.example` 文件为 `.env`:
        ```bash
        cp .env.example .env
        ```
    * 编辑 `.env` 文件，设置必要的变量（`ADMIN_PASSWORD`, `SESSION_SECRET_KEY`）以及可选的 GitHub 同步变量（`GITHUB_PROJECT`, `GITHUB_PROJECT_PAT`, `GITHUB_ENCRYPT_KEY`）。**注意：`PORT` 变量在 Docker 部署中通常不需要在 `.env` 文件中设置，端口映射在 `docker run` 命令中完成。**
3. **构建 Docker 镜像**:
    
    ```bash
    docker build -t gemini-proxy-panel .
    ```
4. **运行 Docker 容器**:
    
    ```bash
    docker run -d --name gemini-proxy-panel \
      -p 3000:3000 \
      --env-file .env \
      -v ./data:/usr/src/app/data \
      gemini-proxy-panel
    ```
    
    * `-d`: 后台运行容器。
    * `--name gemini-proxy-panel`: 给容器命名。
    * `-p 3000:3000`: 将主机的 3000 端口映射到容器的 3000 端口。
    * `--env-file .env`: 从 `.env` 文件加载环境变量。
    * `-v ./data:/usr/src/app/data`: 将本地的 `data` 目录挂载到容器内，用于持久化 SQLite 数据库。请确保本地存在 `data` 目录。

### 方式二：使用 `docker-compose` (推荐)

1. **克隆仓库**:
   
   ```bash
   git clone https://github.com/dreamhartley/gemini-proxy-panel.git
   cd gemini-proxy-panel
   ```
2. **配置环境变量**:
   
   * 复制 `.env.example` 文件为 `.env`:
     ```bash
     cp .env.example .env
     ```
   * 编辑 `.env` 文件，设置必要的变量（`ADMIN_PASSWORD`, `SESSION_SECRET_KEY`）以及可选的 GitHub 同步变量（`GITHUB_PROJECT`, `GITHUB_PROJECT_PAT`, `GITHUB_ENCRYPT_KEY`）。
3. **启动服务**:
   
   ```bash
   docker-compose up -d
   ```
   
   Docker Compose 会自动构建镜像（如果需要）、创建并启动容器，并根据 `docker-compose.yml` 文件处理端口映射、环境变量和数据卷。



## 使用

### 管理面板

1. 访问你的 URL 的 `/login` 或 `/admin` 路径 (例如: `https://your-worker-name.your-subdomain.workers.dev/login`)。
2. 使用你设置的 `ADMIN_PASSWORD` 登录。
3. 在管理面板中，你可以:
   * 添加和管理你的 Gemini API Key。
   * 添加和管理用于访问此 Worker 代理的 API Key (Worker API Keys)。
   * 为 Pro 和 Flash 系列模型设置全局配额。
   * 查看每个 Gemini API Key 的使用统计。
   * 配置支持的 Gemini 模型。

### API 代理

1. 将你的应用程序的 API 端点（原本配置为调用 OpenAI API 的地址）指向你部署的 Worker URL (例如: `https://your-worker-name.your-subdomain.workers.dev/v1`)。
2. 确保你的应用在发送请求时包含有效的身份验证信息。这通常通过在 `Authorization` 请求头中携带在管理面板配置的 "Worker API Key" 来完成：
   ```
   Authorization: Bearer <your_worker_api_key>
   ```
3. 发送与 OpenAI Chat Completions API 兼容的请求。Worker 会将其转换为 Gemini API 请求，并返回格式化的响应。

## 配置概览

### 本地 Node.js / Docker / Hugging Face 部署

这些部署方式通过 `.env` 文件或 Secrets (Hugging Face) 配置环境变量。

* **核心环境变量 (必须)**:
  * `ADMIN_PASSWORD`: 管理面板的登录密码。
  * `SESSION_SECRET_KEY`: 用于保护用户会话安全的密钥 (建议使用长随机字符串)。
* **可选环境变量**:
  * `PORT`: (仅本地 Node.js/Docker) 服务监听的端口，默认为 3000。Hugging Face 会自动处理端口。
* **GitHub 同步环境变量 (可选, Hugging Face 必需)**:
  * `GITHUB_PROJECT`: 用于数据同步的**你自己的** GitHub 仓库路径 (格式: `username/repo-name`)。
  * `GITHUB_PROJECT_PAT`: 具有 `repo` 权限的 GitHub Personal Access Token。
  * `GITHUB_ENCRYPT_KEY`: 用于加密同步数据的密钥 (至少 32 位)。

