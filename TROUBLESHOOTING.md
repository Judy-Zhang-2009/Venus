# 故障排除指南

## 浏览器无法打开问题

### 解决方案 1：检查服务器是否正在运行

1. 确保服务器已启动：
```bash
npm start
```

2. 查看终端输出，应该会显示类似：
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### 解决方案 2：尝试不同的 URL

如果 `http://localhost:3000` 无法访问，尝试：

- `http://127.0.0.1:3000`
- `http://[::1]:3000` (IPv6)
- 使用终端显示的 Network 地址

### 解决方案 3：检查端口占用

如果端口 3000 被占用：

```powershell
# 查看端口占用
netstat -ano | findstr :3000

# 如果需要，可以终止占用端口的进程
taskkill /PID <进程ID> /F
```

或者修改 `vite.config.js` 中的端口号。

### 解决方案 4：检查防火墙

确保 Windows 防火墙允许 Node.js 访问网络。

### 解决方案 5：清除缓存并重新安装

```bash
# 删除 node_modules 和 package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 重新安装
npm install

# 重新启动
npm start
```

### 解决方案 6：检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页是否有错误信息。

### 常见错误

1. **模块未找到错误**
   - 运行 `npm install` 安装依赖

2. **端口已被占用**
   - 修改 `vite.config.js` 中的端口号
   - 或终止占用端口的进程

3. **CORS 错误**
   - 确保使用开发服务器访问，不要直接打开 HTML 文件

4. **Three.js 加载失败**
   - 检查 `node_modules/three` 是否存在
   - 运行 `npm install three` 重新安装

## 获取帮助

如果以上方法都无法解决问题，请检查：
- Node.js 版本（推荐 v20+）
- npm 版本
- 浏览器控制台的错误信息
- 终端中的错误日志

