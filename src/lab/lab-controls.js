import { currentSimulation, scene, isPlaying, setPlaying } from './lab-core.js';
import { initSimulation } from './lab-core.js';
import { updateSimulationParameter } from './lab-controls-params.js';

// 更新参数控制面板
export function updateParameterControls() {
    const controlsContainer = document.getElementById('parameter-controls');
    controlsContainer.innerHTML = '';
    
    switch(currentSimulation) {
        case 'solar-system':
            addRangeControl(controlsContainer, 'speed', '运行速度', 0.1, 2, 1, 0.1);
            addRangeControl(controlsContainer, 'cameraDistance', '视角距离', 30, 100, 50, 1);
            break;
        case 'orbital-mechanics':
            addRangeControl(controlsContainer, 'orbitalSpeed', '轨道速度', 0.01, 0.1, 0.05, 0.01);
            addRangeControl(controlsContainer, 'gravity', '引力强度', 0.5, 2, 1, 0.1);
            break;
        case 'gravity-well':
            addRangeControl(controlsContainer, 'mass', '中心质量', 0.5, 3, 1, 0.1);
            addRangeControl(controlsContainer, 'particleSpeed', '粒子速度', 0.1, 1, 0.3, 0.1);
            addButtonControl(controlsContainer, 'resetParticles', '重置粒子');
            break;
        case 'stellar-evolution':
            addRangeControl(controlsContainer, 'starAge', '恒星年龄', 0, 10, 0, 0.1);
            addRangeControl(controlsContainer, 'brightness', '亮度', 0.3, 1, 0.5, 0.1);
            break;
        case 'star-map':
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 0);
            const dayOfYear = Math.floor((today - startOfYear) / 1000 / 60 / 60 / 24);
            const currentDay = scene.userData.dayOfYear || dayOfYear;
            const currentHour = scene.userData.starMapDate ? scene.userData.starMapDate.getHours() : 20;
            addRangeControl(controlsContainer, 'dayOfYear', '一年中的第几天', 1, 365, currentDay, 1);
            addRangeControl(controlsContainer, 'hour', '时间（小时）', 0, 23, currentHour, 1);
            break;
    }
}

function addRangeControl(container, id, label, min, max, value, step) {
    const item = document.createElement('div');
    item.className = 'parameter-item';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.setAttribute('for', id);
    
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = min;
    input.max = max;
    input.value = value;
    input.step = step;
    
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = value;
    
    input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueDisplay.textContent = val.toFixed(2);
        updateSimulationParameter(id, val);
    });
    
    item.appendChild(labelEl);
    item.appendChild(input);
    item.appendChild(valueDisplay);
    container.appendChild(item);
}

function addButtonControl(container, id, label) {
    const item = document.createElement('div');
    item.className = 'parameter-item';
    
    const button = document.createElement('button');
    button.id = id;
    button.className = 'btn btn-outline';
    button.textContent = label;
    button.style.width = '100%';
    button.style.marginTop = '10px';
    
    button.addEventListener('click', () => {
        updateSimulationParameter(id, 1);
    });
    
    item.appendChild(button);
    container.appendChild(item);
}


// 事件监听
export function setupEventListeners() {
    document.getElementById('simulation-type').addEventListener('change', (e) => {
        initSimulation(e.target.value);
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        initSimulation(currentSimulation);
        if (camera && controls) {
            if (currentSimulation === 'solar-system') {
                camera.position.set(0, 20, 80);
            } else {
                camera.position.set(0, 0, 50);
            }
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
        }
    });
    
    document.getElementById('play-pause-btn').addEventListener('click', (e) => {
        const newValue = !isPlaying;
        setPlaying(newValue);
        e.target.textContent = newValue ? '暂停' : '播放';
    });
}

