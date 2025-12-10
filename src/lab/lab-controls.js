import { currentSimulation, scene, simulationObjects, camera, controls, isPlaying, setPlaying } from './lab-core.js';
import { initSimulation } from './lab-core.js';
import { updateSimulationParameter } from './lab-controls-params.js';
import { updateURLSimulationType, initURLListener, getSimulationTypeFromURL } from './lab-url.js';
import { resetGravityWell } from './lab-gravity-well.js';

/**
 * 更新参数控制面板
 * 根据当前模拟类型创建相应的控制元素，从模拟状态读取初始值确保滑块位置与实际状态一致
 */
export function updateParameterControls() {
    const controlsContainer = document.getElementById('parameter-controls');
    controlsContainer.innerHTML = '';
    
    switch(currentSimulation) {
        case 'solar-system':
            const speedValue = getSolarSystemSpeed();
            addRangeControl(controlsContainer, 'speed', '运行速度', 0.1, 2, speedValue, 0.1);
            break;
        case 'orbital-mechanics':
            const orbitalSpeedValue = getOrbitalSpeed();
            addRangeControl(controlsContainer, 'orbitalSpeed', '轨道速度', 0.01, 0.1, orbitalSpeedValue, 0.01);
            break;
        case 'gravity-well':
            // 引力井模拟使用箭头拖动控制速度
            // 添加提示信息
            const hint = document.createElement('div');
            hint.className = 'parameter-item';
            hint.style.color = '#888';
            hint.style.fontSize = '12px';
            hint.textContent = '拖动箭头调整初始速度和方向';
            controlsContainer.appendChild(hint);
            
            // 添加A球质量滑块（质量上限100）
            const ballA = simulationObjects.find(obj => obj.userData.type === 'gravity-ball' && obj.userData.ballName === 'A');
            const massAValue = ballA ? ballA.userData.mass : 2.0;
            addRangeControl(controlsContainer, 'ballAMass', 'A球质量', 0.1, 100, massAValue, 0.1);
            
            // 添加B球质量滑块（质量上限100）
            const ballB = simulationObjects.find(obj => obj.userData.type === 'gravity-ball' && obj.userData.ballName === 'B');
            const massBValue = ballB ? ballB.userData.mass : 1.0;
            addRangeControl(controlsContainer, 'ballBMass', 'B球质量', 0.1, 100, massBValue, 0.1);
            
            // 添加阻尼开关
            const dampingEnabled = scene.userData.gravityWellDamping !== undefined 
                ? scene.userData.gravityWellDamping 
                : false;
            addCheckboxControl(controlsContainer, 'gravityWellDamping', '碰撞阻尼', dampingEnabled);
            
            // 添加重置速度选项
            const resetVelocityEnabled = scene.userData.gravityWellResetVelocity !== undefined 
                ? scene.userData.gravityWellResetVelocity 
                : false;
            addCheckboxControl(controlsContainer, 'gravityWellResetVelocity', '重置时恢复速度', resetVelocityEnabled);
            break;
        case 'stellar-evolution':
            const starAgeValue = getStarAge();
            const evolutionSpeedValue = getEvolutionSpeed();
            addRangeControl(controlsContainer, 'starAge', '恒星年龄', 0, 10, starAgeValue, 0.1);
            addRangeControl(controlsContainer, 'evolutionSpeed', '演化速度', 0.0001, 0.01, evolutionSpeedValue, 0.0001);
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

/**
 * 从当前模拟状态读取太阳系运行速度
 * @returns {number} 当前运行速度值，如果未找到行星对象则返回默认值1.0
 */
function getSolarSystemSpeed() {
    const planet = simulationObjects.find(obj => obj.userData.type === 'planet');
    if (planet && planet.userData.speed !== undefined) {
        return planet.userData.speed * 100;
    }
    return 1.0;
}

/**
 * 从当前模拟状态读取轨道速度
 * @returns {number} 当前轨道速度值，如果未找到轨道对象则返回默认值0.05
 */
function getOrbitalSpeed() {
    const orbital = simulationObjects.find(obj => obj.userData.type === 'orbital');
    if (orbital && orbital.userData.speed !== undefined) {
        return orbital.userData.speed;
    }
    return 0.05;
}

/**
 * 从当前模拟状态读取初始速度
 * @returns {number} 当前初始速度值，如果未找到则返回默认值0.1
 */
function getInitialSpeed() {
    const ball = simulationObjects.find(obj => obj.userData.type === 'gravity-ball');
    if (ball && ball.userData.initialSpeed !== undefined) {
        return ball.userData.initialSpeed;
    }
    return 0.1;
}

/**
 * 从当前模拟状态读取恒星年龄
 * @returns {number} 恒星当前年龄值
 */
function getStarAge() {
    const star = simulationObjects.find(obj => obj.userData.type === 'star');
    if (star && star.userData.age !== undefined) {
        return star.userData.age;
    }
    return 0;
}

/**
 * 从当前模拟状态读取演化速度
 * @returns {number} 演化速度值
 */
function getEvolutionSpeed() {
    const star = simulationObjects.find(obj => obj.userData.type === 'star');
    if (star && star.userData.evolutionSpeed !== undefined) {
        return star.userData.evolutionSpeed;
    }
    return 0.01;
}


/**
 * 创建并添加范围滑块控制元素
 * @param {HTMLElement} container - 父容器元素
 * @param {string} id - 滑块元素的唯一标识符
 * @param {string} label - 滑块标签文本
 * @param {number} min - 滑块最小值
 * @param {number} max - 滑块最大值
 * @param {number} value - 滑块初始值（从当前模拟状态读取）
 * @param {number} step - 滑块步进值
 */
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
    // 根据step值确定显示精度
    if (step < 0.001) {
        valueDisplay.textContent = value.toFixed(4);
    } else if (step < 0.1) {
        valueDisplay.textContent = value.toFixed(2);
    } else {
        valueDisplay.textContent = value.toFixed(step < 1 ? 1 : 0);
    }
    
    input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        // 更新显示值
        if (step < 0.001) {
            valueDisplay.textContent = val.toFixed(4);
        } else if (step < 0.1) {
            valueDisplay.textContent = val.toFixed(2);
        } else {
            valueDisplay.textContent = val.toFixed(step < 1 ? 1 : 0);
        }
        updateSimulationParameter(id, val);
    });
    
    item.appendChild(labelEl);
    item.appendChild(input);
    item.appendChild(valueDisplay);
    container.appendChild(item);
}

/**
 * 添加复选框控制
 * @param {HTMLElement} container - 容器元素
 * @param {string} id - 控件ID
 * @param {string} label - 标签文本
 * @param {boolean} checked - 是否选中
 */
function addCheckboxControl(container, id, label, checked = false) {
    const item = document.createElement('div');
    item.className = 'parameter-item';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.setAttribute('for', id);
    labelEl.style.display = 'flex';
    labelEl.style.alignItems = 'center';
    labelEl.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;

    input.addEventListener('change', (e) => {
        updateSimulationParameter(id, e.target.checked);
    });

    labelEl.appendChild(input);
    item.appendChild(labelEl);
    container.appendChild(item);
}

/**
 * 创建并添加按钮控制元素
 * @param {HTMLElement} container - 父容器元素
 * @param {string} id - 按钮元素的唯一标识符
 * @param {string} label - 按钮显示的文本内容
 */
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


/**
 * 初始化并设置全局事件监听器
 * 包括模拟类型切换、重置按钮、播放/暂停按钮及URL历史记录监听
 */
export function setupEventListeners() {
    const simulationTypeSelect = document.getElementById('simulation-type');
    
    if (!simulationTypeSelect) {
        return;
    }
    
    // 监听模拟类型切换
    simulationTypeSelect.addEventListener('change', (e) => {
        const newType = e.target.value;
        initSimulation(newType);
        updateURLSimulationType(newType);
    });
    
    // 初始化URL监听（处理浏览器前进/后退）
    initURLListener((simulationType) => {
        if (simulationTypeSelect) {
            simulationTypeSelect.value = simulationType;
        }
        initSimulation(simulationType);
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        // 重置模拟：根据模拟类型调用相应的重置函数
        // 注意：不重置相机视角，保持用户当前的观察角度
        if (currentSimulation === 'gravity-well') {
            // 引力井模拟：只重置位置，不重置质量、速度和拖动点
            resetGravityWell();
        } else {
            // 其他模拟：重新初始化
            initSimulation(currentSimulation);
        }
    });
    
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
        // 初始化按钮文本：根据默认状态设置
        playPauseBtn.textContent = isPlaying ? '暂停' : '播放';
        
        playPauseBtn.addEventListener('click', (e) => {
            // 切换播放/暂停状态：控制模拟是否自动更新
            const newValue = !isPlaying;
            setPlaying(newValue);
            e.target.textContent = newValue ? '暂停' : '播放';
        });
    }
}

/**
 * 同步模拟类型选择器的显示值与当前模拟类型状态
 * 在初始化完成后调用，确保用户界面与内部状态保持一致
 */
export function syncSimulationTypeSelect() {
    const simulationTypeSelect = document.getElementById('simulation-type');
    if (simulationTypeSelect) {
        simulationTypeSelect.value = currentSimulation;
    }
}

