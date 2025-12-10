import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';
import { createStarGlow, updateStarGlow } from './lab-stellar-evolution-glow.js';

/**
 * 颜色插值函数：在黄色、橙色、红色和白色之间平滑过渡
 * 分别处理RGB通道，确保G和B通道变化速度合理，避免出现紫色
 * @param {number} startColor - 起始颜色（十六进制RGB值）
 * @param {number} endColor - 结束颜色（十六进制RGB值）
 * @param {number} progress - 过渡进度 [0, 1]
 * @returns {number} 插值后的颜色值（十六进制RGB值）
 */
function interpolateColor(startColor, endColor, progress) {
    // 提取起始颜色的RGB分量
    const startR = (startColor >> 16) & 0xff;
    const startG = (startColor >> 8) & 0xff;
    const startB = startColor & 0xff;
    
    // 提取结束颜色的RGB分量
    const endR = (endColor >> 16) & 0xff;
    const endG = (endColor >> 8) & 0xff;
    const endB = endColor & 0xff;
    
    // 计算RGB分量的差值
    const deltaR = endR - startR;
    const deltaG = endG - startG;
    const deltaB = endB - startB;
    
    // 线性插值计算RGB分量
    const r = Math.round(startR + deltaR * progress);
    const g = Math.round(startG + deltaG * progress);
    const b = Math.round(startB + deltaB * progress);
    
    // 组合RGB分量返回十六进制颜色值
    return (r << 16) | (g << 8) | b;
}

/**
 * 同步滑块值与实际状态值
 * 实现滑块与实际状态的双向耦合：当状态变化时自动更新滑块显示
 * @param {string} sliderId - 滑块元素的ID
 * @param {number} value - 当前状态值
 */
function syncSliderValue(sliderId, value) {
    const slider = document.getElementById(sliderId);
    if (slider && slider.type === 'range') {
        const currentValue = parseFloat(slider.value);
        const newValue = value;
        
        // 仅在值发生变化时更新，避免触发input事件导致循环更新
        // 使用阈值判断，确保精度并避免频繁更新
        const threshold = parseFloat(slider.step) || 0.1;
        if (Math.abs(currentValue - newValue) > threshold * 0.1) {
            slider.value = newValue;
            
            // 更新显示值：根据step值确定小数位数
            const valueDisplay = slider.parentElement.querySelector('.value-display');
            if (valueDisplay) {
                const step = parseFloat(slider.step) || 0.1;
                if (step < 0.001) {
                    valueDisplay.textContent = newValue.toFixed(4);
                } else if (step < 0.1) {
                    valueDisplay.textContent = newValue.toFixed(2);
                } else {
                    valueDisplay.textContent = newValue.toFixed(1);
                }
            }
        }
    }
}

/**
 * 初始化恒星演化模拟系统
 * 创建主序星几何体、材质、光晕效果及标签，初始化演化状态参数
 */
export function initStellarEvolution() {
    const BASE_RADIUS = 1.5;
    const INITIAL_COLOR = 0xffff00;
    const INITIAL_EMISSIVE_INTENSITY = 0.5;
    const INITIAL_AGE = 0;
    const INITIAL_SCALE = 1.0;
    
    const mainSequence = new THREE.Mesh(
        new THREE.SphereGeometry(BASE_RADIUS, 32, 32),
        new THREE.MeshBasicMaterial({ 
            color: INITIAL_COLOR,
            emissive: INITIAL_COLOR,
            emissiveIntensity: INITIAL_EMISSIVE_INTENSITY
        })
    );
    mainSequence.userData = {
        type: 'star',
        stage: 'main-sequence',
        age: INITIAL_AGE,
        manualAge: false,
        baseSize: BASE_RADIUS,
        baseColor: INITIAL_COLOR,
        targetScale: INITIAL_SCALE,
        currentScale: INITIAL_SCALE,
        evolutionSpeed: 0.01
    };
    scene.add(mainSequence);
    simulationObjects.push(mainSequence);
    
    // 创建光晕效果：光晕半径与恒星半径直接耦合
    const initialStarRadius = BASE_RADIUS * mainSequence.scale.x;
    const glow = createStarGlow(initialStarRadius, INITIAL_COLOR);
    mainSequence.userData.glow = glow;
    
    // 创建并附加标签
    const starLabel = createLabel('主序星', '#ffff00');
    starLabel.position.set(0, -BASE_RADIUS - 0.3, 0);
    mainSequence.add(starLabel);
    labelObjects.push(starLabel);
    mainSequence.userData.label = starLabel;
}

/**
 * 更新恒星演化模拟状态
 * 根据恒星年龄和演化阶段计算目标状态参数，使用线性插值实现平滑过渡
 * 同步更新恒星几何体缩放、材质颜色、标签文字及光晕效果
 * @param {number} deltaTime - 时间增量（秒），用于基于时间的演化计算
 */
export function updateStellarEvolution(deltaTime = 0.016) {
    const SMOOTHING_FACTOR = 0.05; // 线性插值系数，控制缩放值平滑过渡速度
    
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star') {
            // 自动递增年龄：仅在非手动设置模式下执行
            // 演化速度由userData.evolutionSpeed控制，默认值为0.01
            const MAX_AGE = 10.0; // 最大年龄值，达到后重置为0实现循环播放
            if (!obj.userData.manualAge) {
                const evolutionSpeed = obj.userData.evolutionSpeed || 0.01;
                let newAge = (obj.userData.age || 0) + evolutionSpeed;
                
                // 循环播放：当年龄达到最大值时重置为0
                if (newAge >= MAX_AGE) {
                    newAge = 0;
                }
                obj.userData.age = newAge;
            }
            
            // 同步更新滑块值：实现滑块与实际状态的双向耦合
            syncSliderValue('starAge', obj.userData.age);
            syncSliderValue('evolutionSpeed', obj.userData.evolutionSpeed || 0.01);
            
            const age = obj.userData.age || 0;
            const baseRadius = obj.userData.baseSize || 1.5;
            let targetScale = obj.userData.targetScale || 1.0;
            let currentScale = obj.userData.currentScale || 1.0;
            let starColor = obj.userData.baseColor || 0xffff00;
            let emissiveIntensity = 0.5;
            
            // 根据恒星年龄计算目标状态参数（缩放值、颜色、发射强度）
            // 演化阶段划分：主序星(0-2) -> 红巨星过渡(2-4) -> 红巨星(4-6) -> 白矮星过渡(6-8) -> 白矮星冷却(8-10)
            // 颜色过渡：黄色(0xffff00) -> 橙色(0xff6600) -> 深红色(0xcc0000) -> 白色(0xffffff)
            // 使用RGB通道分别插值，确保G和B通道变化速度合理，避免出现紫色
            if (age < 2) {
                // 主序星阶段：保持原始尺寸和颜色
                obj.userData.stage = 'main-sequence';
                targetScale = 1.0;
                starColor = 0xffff00; // 黄色：R=255, G=255, B=0
                emissiveIntensity = 0.5;
            } else if (age < 4) {
                // 红巨星过渡阶段：线性插值计算缩放和颜色
                obj.userData.stage = 'red-giant';
                const transitionProgress = Math.max(0, Math.min(1, (age - 2) / 2)); // 归一化过渡进度 [0, 1]
                targetScale = 1.0 + transitionProgress * 1.0; // 缩放值从1.0线性增长至2.0
                // 颜色插值：从黄色(0xffff00)过渡至橙色(0xff6600)
                // R: 255->255, G: 255->102, B: 0->0，G通道缓慢下降
                starColor = interpolateColor(0xffff00, 0xff6600, transitionProgress);
                emissiveIntensity = 0.5;
            } else if (age < 6) {
                // 红巨星阶段：继续膨胀
                obj.userData.stage = 'red-giant';
                const growthProgress = Math.max(0, Math.min(1, (age - 4) / 2)); // 归一化增长进度 [0, 1]
                targetScale = 2.0 + growthProgress * 1.0; // 缩放值从2.0线性增长至3.0
                starColor = 0xff6600; // 橙色：R=255, G=102, B=0
                emissiveIntensity = 0.5;
            } else if (age < 8) {
                // 白矮星过渡阶段：收缩并改变颜色
                obj.userData.stage = 'white-dwarf';
                const transitionProgress = Math.max(0, Math.min(1, (age - 6) / 2)); // 归一化过渡进度 [0, 1]
                const startScale = 3.0;
                const endScale = 0.3;
                targetScale = startScale - transitionProgress * (startScale - endScale); // 缩放值从3.0线性收缩至0.3
                // 颜色插值：从橙色(0xff6600)过渡至深红色(0xcc0000)
                // R: 255->204, G: 102->0, B: 0->0，R和G通道缓慢下降
                starColor = interpolateColor(0xff6600, 0xcc0000, transitionProgress);
                emissiveIntensity = 0.5;
            } else {
                // 白矮星冷却阶段：颜色从深红色过渡至白色，降低发射强度
                obj.userData.stage = 'white-dwarf';
                targetScale = 0.3;
                const coolProgress = Math.max(0, Math.min(1, (age - 8) / 2)); // 归一化冷却进度 [0, 1]
                // 颜色插值：从深红色(0xcc0000)过渡至白色(0xffffff)
                // R: 204->255, G: 0->255, B: 0->255，G和B通道缓慢上升，避免出现紫色
                starColor = interpolateColor(0xcc0000, 0xffffff, coolProgress);
                const coolFactor = Math.max(0.1, 1.0 - (age - 8) * 0.1); // 冷却因子，限制最小值0.1
                emissiveIntensity = 0.5 * coolFactor;
            }
            
            // 使用线性插值平滑更新缩放值，避免突变
            obj.userData.targetScale = targetScale;
            currentScale += (targetScale - currentScale) * SMOOTHING_FACTOR;
            obj.userData.currentScale = currentScale;
            obj.scale.set(currentScale, currentScale, currentScale);
            
            // 更新材质颜色属性：颜色值保持稳定，不受闪烁效果影响
            // 颜色值仅由演化阶段和年龄决定，确保颜色不闪烁
            if (obj.material) {
                if (obj.material.color) {
                    obj.material.color.setHex(starColor);
                }
                if (obj.material.emissive) {
                    obj.material.emissive.setHex(starColor);
                }
            }
            
            // 应用周期性闪烁效果：仅影响发射强度，不影响颜色值
            // 使用正弦函数模拟恒星亮度波动，频率较低以避免视觉跳动
            const twinkle = 0.95 + Math.sin(age * 0.5) * 0.05; // 亮度波动范围 [0.9, 1.0]，频率降低
            const finalEmissiveIntensity = emissiveIntensity * twinkle;
            if (obj.material) {
                obj.material.emissiveIntensity = finalEmissiveIntensity;
            }
            
            // 更新标签：根据当前演化阶段设置标签文字和颜色
            if (obj.userData.label) {
                let labelText = '主序星';
                let labelColor = '#ffff00';
                
                const stage = obj.userData.stage || 'main-sequence';
                if (stage === 'main-sequence') {
                    labelText = '主序星';
                    labelColor = '#ffff00';
                } else if (stage === 'red-giant') {
                    labelText = '红巨星';
                    labelColor = '#ff6600';
                } else if (stage === 'white-dwarf') {
                    labelText = '白矮星';
                    // 标签颜色根据恒星当前颜色动态设置
                    // 将十六进制颜色值转换为CSS颜色字符串
                    const r = (starColor >> 16) & 0xff;
                    const g = (starColor >> 8) & 0xff;
                    const b = starColor & 0xff;
                    labelColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                }
                
                // 更新标签DOM元素的文本内容和颜色样式
                const labelElement = obj.userData.label.element;
                if (labelElement) {
                    if (labelElement.textContent !== labelText) {
                        labelElement.textContent = labelText;
                    }
                    if (labelElement.style.color !== labelColor) {
                        labelElement.style.color = labelColor;
                    }
                }
            }
            
            // 更新光晕效果：光晕半径与恒星实际半径直接耦合
            if (obj.userData.glow) {
                // 计算恒星当前实际半径：基础半径乘以当前缩放值
                const currentStarRadius = baseRadius * currentScale;
                
                // 从材质属性动态获取恒星颜色，确保光晕颜色与恒星颜色同步
                let currentStarColor;
                if (obj.material && obj.material.emissive && typeof obj.material.emissive.getHex === 'function') {
                    currentStarColor = obj.material.emissive.getHex();
                } else if (obj.material && obj.material.color && typeof obj.material.color.getHex === 'function') {
                    currentStarColor = obj.material.color.getHex();
                } else {
                    currentStarColor = starColor;
                }
                
                // 更新光晕：半径与恒星半径耦合，颜色与恒星颜色耦合
                updateStarGlow(obj.userData.glow, currentStarRadius, currentStarColor);
            }
        }
    });
}

