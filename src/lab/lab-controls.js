import { currentSimulation, scene, simulationObjects, camera, controls, isPlaying, setPlaying } from './lab-core.js';
import { initSimulation } from './lab-core.js';
import { updateSimulationParameter } from './lab-controls-params.js';
import { updateURLSimulationType, initURLListener, getSimulationTypeFromURL } from './lab-url.js';

/**
 * 更新参数控制面板
 * 从当前模拟状态读取初始值，确保滑块位置与实际状态一致
 */
export function updateParameterControls() {
    const controlsContainer = document.getElementById('parameter-controls');
    controlsContainer.innerHTML = '';
    
    switch(currentSimulation) {
        case 'solar-system':
            const speedValue = getSolarSystemSpeed();
            const cameraDistValue = getCameraDistance();
            addRangeControl(controlsContainer, 'speed', '运行速度', 0.1, 2, speedValue, 0.1);
            addRangeControl(controlsContainer, 'cameraDistance', '视角距离', 30, 100, cameraDistValue, 1);
            break;
        case 'orbital-mechanics':
            const orbitalSpeedValue = getOrbitalSpeed();
            addRangeControl(controlsContainer, 'orbitalSpeed', '轨道速度', 0.01, 0.1, orbitalSpeedValue, 0.01);
            break;
        case 'gravity-well':
            const massValue = getGravityWellMass();
            const particleSpeedValue = getParticleSpeed();
            addRangeControl(controlsContainer, 'mass', '中心质量', 0.5, 3, massValue, 0.1);
            addRangeControl(controlsContainer, 'particleSpeed', '粒子速度', 0.1, 1, particleSpeedValue, 0.1);
            addButtonControl(controlsContainer, 'resetParticles', '重置粒子');
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
 */
function getSolarSystemSpeed() {
    const planet = simulationObjects.find(obj => obj.userData.type === 'planet');
    if (planet && planet.userData.speed !== undefined) {
        return planet.userData.speed * 100;
    }
    return 1.0;
}

/**
 * 从当前相机状态读取距离
 */
function getCameraDistance() {
    if (camera) {
        return camera.position.length();
    }
    return 50;
}

/**
 * 从当前模拟状态读取轨道速度
 */
function getOrbitalSpeed() {
    const orbital = simulationObjects.find(obj => obj.userData.type === 'orbital');
    if (orbital && orbital.userData.speed !== undefined) {
        return orbital.userData.speed;
    }
    return 0.05;
}

/**
 * 从当前模拟状态读取中心质量
 */
function getGravityWellMass() {
    const mass = simulationObjects.find(obj => obj.userData.type === 'central-mass');
    if (mass && mass.userData.mass !== undefined) {
        return mass.userData.mass;
    }
    return 1.0;
}

/**
 * 从当前模拟状态读取粒子速度
 */
function getParticleSpeed() {
    const particle = simulationObjects.find(obj => obj.userData.type === 'particle');
    if (particle && particle.userData.velocity) {
        return particle.userData.velocity.length();
    }
    return 0.3;
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
 * 添加范围滑块控制
 * @param {HTMLElement} container - 容器元素
 * @param {string} id - 控件ID
 * @param {string} label - 标签文本
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {number} value - 初始值（从当前状态读取）
 * @param {number} step - 步进值
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
 * 添加按钮控制
 * @param {HTMLElement} container - 容器元素
 * @param {string} id - 控件ID
 * @param {string} label - 按钮文本
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
 * 设置事件监听器
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
        // 切换播放/暂停状态：控制模拟是否自动更新
        const newValue = !isPlaying;
        setPlaying(newValue);
        e.target.textContent = newValue ? '暂停' : '播放';
    });
}

/**
 * 同步选择器值与当前模拟类型
 * 在初始化完成后调用，确保UI与状态一致
 */
export function syncSimulationTypeSelect() {
    const simulationTypeSelect = document.getElementById('simulation-type');
    if (simulationTypeSelect) {
        simulationTypeSelect.value = currentSimulation;
    }
}

