# 启明星天文社官网

北京市第二中学启明星天文社官方网站

## 功能特性

- 🌟 **精美封面** - 动态星空背景，渐变文字效果
- 📖 **社团介绍** - 展示社团使命、活动和成就
- 🎓 **天文学微课堂** - 提供多个主题的天文学习课程
- 🔬 **天文物理虚拟实验室** - 交互式3D模拟，支持多种天体物理现象模拟

## 技术栈

- HTML5 / CSS3
- JavaScript (ES6+)
- Three.js - 3D图形渲染
- Vite - 构建工具

## 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 部署到 Cloudflare Pages（需要先安装 wrangler）
npm run deploy
```

## Cloudflare 部署

本项目已配置支持 Cloudflare Pages 部署。详细部署说明请查看 [DEPLOY.md](./DEPLOY.md)。

### 快速部署

1. **通过 Cloudflare Dashboard**（推荐）：
   - 登录 Cloudflare Dashboard
   - 创建新的 Pages 项目
   - 连接 Git 仓库
   - 构建设置：`npm run build`，输出目录：`dist`

2. **使用 Wrangler CLI**：
   ```bash
   npm install -g wrangler
   wrangler login
   npm run deploy
   ```

## 虚拟实验室功能

实验室包含以下模拟类型：

1. **太阳系模拟** - 展示行星围绕太阳的运动
2. **轨道力学** - 演示多体轨道系统
3. **引力井** - 可视化引力场对粒子的影响
4. **恒星演化** - 展示恒星的演化过程

所有模拟都支持实时参数调整，提供交互式学习体验。

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License

