// 主入口文件 - 导入所有模块并初始化
import { initLab } from './lab/lab-core.js';
import { setupEventListeners } from './lab/lab-controls.js';

// 初始化事件监听
setupEventListeners();

// 初始化实验室
if (document.getElementById('lab-canvas')) {
    initLab();
}
