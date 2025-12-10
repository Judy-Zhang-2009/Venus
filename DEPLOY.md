# Cloudflare 部署指南

本项目已配置支持 Cloudflare Pages 部署。

## 部署方式

### 方式一：通过 Cloudflare Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 部分
3. 点击 **Create a project**
4. 连接你的 Git 仓库（GitHub/GitLab/Bitbucket）
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (项目根目录)
   - **Node version**: `20` (或根据 .nvmrc 文件自动检测)
6. 点击 **Save and Deploy**

### 方式二：使用 Wrangler CLI

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

3. 构建项目：
```bash
npm run build
```

4. 部署到 Cloudflare Pages：
```bash
npm run deploy
```

或者直接使用：
```bash
wrangler pages deploy dist
```

### 方式三：使用 GitHub Actions（自动部署）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: venus-astronomy-club
          directory: dist
```

## 配置文件说明

- **wrangler.toml**: Cloudflare Workers/Pages 配置文件
- **_redirects**: 处理 SPA 路由重定向（所有路由指向 index.html）
- **_headers**: 设置 HTTP 安全头
- **cloudflare-pages.json**: Cloudflare Pages 构建配置（可选）
- **.nvmrc**: 指定 Node.js 版本

## 环境变量

如果需要设置环境变量，可以在 Cloudflare Dashboard 的 Pages 设置中添加，或在 `wrangler.toml` 中配置：

```toml
[vars]
NODE_ENV = "production"
```

## 自定义域名

1. 在 Cloudflare Dashboard 中进入你的 Pages 项目
2. 点击 **Custom domains**
3. 添加你的域名
4. 按照提示配置 DNS 记录

## 注意事项

- 确保 `dist` 目录包含所有构建文件
- `_redirects` 文件确保 SPA 路由正常工作
- `_headers` 文件提供额外的安全保护
- 构建输出会自动优化和压缩

## 故障排除

如果部署后页面无法正常显示：

1. 检查构建日志是否有错误
2. 确认 `dist` 目录包含 `index.html`
3. 检查 `_redirects` 文件是否正确复制到 `dist` 目录
4. 查看 Cloudflare Dashboard 中的部署日志

