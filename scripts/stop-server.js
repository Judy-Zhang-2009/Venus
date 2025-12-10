import { execSync } from 'child_process';
import { platform } from 'os';

const PORT = 3000;

try {
  if (platform() === 'win32') {
    // Windows
    const result = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' });
    const lines = result.trim().split('\n');
    
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      console.log(`未找到运行在端口 ${PORT} 的进程`);
      process.exit(0);
    }
    
    const pids = new Set();
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      }
    });
    
    if (pids.size === 0) {
      console.log(`未找到运行在端口 ${PORT} 的进程`);
      process.exit(0);
    }
    
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`✓ 已停止进程 ${pid}`);
      } catch (e) {
        console.log(`✗ 无法停止进程 ${pid}`);
      }
    });
  } else {
    // Linux/Mac
    const result = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' });
    const pids = result.trim().split('\n').filter(pid => pid);
    
    if (pids.length === 0) {
      console.log(`未找到运行在端口 ${PORT} 的进程`);
      process.exit(0);
    }
    
    pids.forEach(pid => {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`✓ 已停止进程 ${pid}`);
      } catch (e) {
        console.log(`✗ 无法停止进程 ${pid}`);
      }
    });
  }
} catch (e) {
  if (e.message.includes('findstr') || e.message.includes('lsof')) {
    console.log(`未找到运行在端口 ${PORT} 的进程`);
  } else {
    console.error('错误:', e.message);
    process.exit(1);
  }
}

