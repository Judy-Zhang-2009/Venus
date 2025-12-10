import * as THREE from 'three';
import { currentSimulation, scene, simulationObjects, labelObjects, camera, controls } from './lab-core.js';
import { calculateLST, updateStarMapTime } from './lab-star-map.js';
import { updateStarGlow } from './lab-stellar-evolution-glow.js';
import { resetGravityWell } from './lab-gravity-well.js';

/**
 * 更新模拟参数
 * 所有参数更新完全基于传入的滑块值，不依赖硬编码默认值
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
export function updateSimulationParameter(param, value) {
    switch(currentSimulation) {
        case 'solar-system':
            updateSolarSystemParameter(param, value);
            break;
        case 'orbital-mechanics':
            updateOrbitalMechanicsParameter(param, value);
            break;
        case 'gravity-well':
            updateGravityWellParameter(param, value);
            break;
        case 'stellar-evolution':
            updateStellarEvolutionParameter(param, value);
            break;
        case 'star-map':
            updateStarMapParameter(param, value);
            break;
    }
}

/**
 * 更新太阳系模拟参数
 * 根据参数名称更新相应的模拟状态
 * @param {string} param - 参数名称（'speed'）
 * @param {number} value - 参数值（来自滑块输入）
 */
function updateSolarSystemParameter(param, value) {
    if (param === 'speed') {
        // 更新行星运行速度：将滑块值转换为实际速度值
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'planet') {
                obj.userData.speed = value * 0.01;
            }
        });
    }
}

/**
 * 更新轨道力学模拟参数
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
function updateOrbitalMechanicsParameter(param, value) {
    if (param === 'orbitalSpeed') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'orbital') {
                obj.userData.speed = value;
            }
        });
    }
}

/**
 * 更新引力井模拟参数
 * 处理用户通过滑块设置的初始速度参数
 * @param {string} param - 参数名称（'initialSpeed'）
 * @param {number} value - 参数值（来自滑块输入）
 */
function updateGravityWellParameter(param, value) {
    if (param === 'ballAMass') {
        // 更新A球质量
        const ballA = simulationObjects.find(obj => obj.userData.type === 'gravity-ball' && obj.userData.ballName === 'A');
        if (ballA) {
            ballA.userData.mass = value;
        }
    } else if (param === 'ballBMass') {
        // 更新B球质量
        const ballB = simulationObjects.find(obj => obj.userData.type === 'gravity-ball' && obj.userData.ballName === 'B');
        if (ballB) {
            ballB.userData.mass = value;
        }
    } else if (param === 'gravityWellDamping') {
        // 更新阻尼开关状态
        scene.userData.gravityWellDamping = value;
    } else if (param === 'gravityWellResetVelocity') {
        // 更新重置速度选项状态
        scene.userData.gravityWellResetVelocity = value;
    } else if (param === 'resetBalls') {
        // 重置球体到初始状态
        resetGravityWell();
    }
}

/**
 * 更新恒星演化模拟参数
 * 处理用户通过滑块设置的演化参数，包括年龄和演化速度
 * @param {string} param - 参数名称（'starAge' 或 'evolutionSpeed'）
 * @param {number} value - 参数值（来自滑块输入）
 */
function updateStellarEvolutionParameter(param, value) {
    const MAX_AGE = 10.0; // 最大年龄值，与updateStellarEvolution中的定义保持一致
    
    if (param === 'starAge') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'star') {
                // 处理循环播放：当滑块值达到最大值时，重置为0
                let ageValue = value;
                if (ageValue >= MAX_AGE) {
                    ageValue = 0;
                }
                obj.userData.age = ageValue;
                // 设置手动年龄标志：当用户通过滑块设置年龄时，暂停自动演化
                obj.userData.manualAge = true;
                
                const age = ageValue;
                const baseRadius = obj.userData.baseSize || 1.5;
                let targetScale = 1.0;
                let currentColor = 0xffff00;
                
                // 颜色插值函数：在黄色、橙色、红色和白色之间平滑过渡
                // 分别处理RGB通道，确保G和B通道变化速度合理，避免出现紫色
                function interpolateColor(startColor, endColor, progress) {
                    const startR = (startColor >> 16) & 0xff;
                    const startG = (startColor >> 8) & 0xff;
                    const startB = startColor & 0xff;
                    const endR = (endColor >> 16) & 0xff;
                    const endG = (endColor >> 8) & 0xff;
                    const endB = endColor & 0xff;
                    const deltaR = endR - startR;
                    const deltaG = endG - startG;
                    const deltaB = endB - startB;
                    const r = Math.round(startR + deltaR * progress);
                    const g = Math.round(startG + deltaG * progress);
                    const b = Math.round(startB + deltaB * progress);
                    return (r << 16) | (g << 8) | b;
                }
                
                // 根据年龄计算目标缩放值和颜色（与updateStellarEvolution中的逻辑一致）
                if (age < 2) {
                    obj.userData.stage = 'main-sequence';
                    targetScale = 1.0;
                    currentColor = 0xffff00; // 黄色
                } else if (age < 4) {
                    obj.userData.stage = 'red-giant';
                    const transitionProgress = Math.max(0, Math.min(1, (age - 2) / 2));
                    targetScale = 1.0 + transitionProgress * 1.0;
                    currentColor = interpolateColor(0xffff00, 0xff6600, transitionProgress);
                } else if (age < 6) {
                    obj.userData.stage = 'red-giant';
                    const growthProgress = Math.max(0, Math.min(1, (age - 4) / 2));
                    targetScale = 2.0 + growthProgress * 1.0;
                    currentColor = 0xff6600; // 橙色
                } else if (age < 8) {
                    obj.userData.stage = 'white-dwarf';
                    const transitionProgress = Math.max(0, Math.min(1, (age - 6) / 2));
                    const startScale = 3.0;
                    const endScale = 0.3;
                    targetScale = startScale - transitionProgress * (startScale - endScale);
                    currentColor = interpolateColor(0xff6600, 0xcc0000, transitionProgress);
                } else {
                    obj.userData.stage = 'white-dwarf';
                    targetScale = 0.3;
                    const coolProgress = Math.max(0, Math.min(1, (age - 8) / 2));
                    currentColor = interpolateColor(0xcc0000, 0xffffff, coolProgress);
                }
                
                // 立即设置目标缩放值（手动设置时不使用平滑插值）
                obj.userData.targetScale = targetScale;
                obj.userData.currentScale = targetScale;
                obj.scale.set(targetScale, targetScale, targetScale);
                
                // 更新材质颜色
                if (obj.material) {
                    if (obj.material.color) {
                        obj.material.color.setHex(currentColor);
                    }
                    if (obj.material.emissive) {
                        obj.material.emissive.setHex(currentColor);
                    }
                }
                
                // 更新标签：根据演化阶段更新标签文字和颜色
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
                        const r = (currentColor >> 16) & 0xff;
                        const g = (currentColor >> 8) & 0xff;
                        const b = currentColor & 0xff;
                        labelColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                    
                    // 更新标签文字和颜色
                    const labelElement = obj.userData.label.element;
                    if (labelElement) {
                        labelElement.textContent = labelText;
                        labelElement.style.color = labelColor;
                    }
                }
                
                // 更新光晕：光晕半径直接与恒星实际半径耦合
                if (obj.userData.glow) {
                    const currentStarRadius = baseRadius * targetScale;
                    
                    // 从材质动态获取恒星颜色，确保颜色耦合
                    let starColor;
                    if (obj.material && obj.material.emissive && typeof obj.material.emissive.getHex === 'function') {
                        starColor = obj.material.emissive.getHex();
                    } else if (obj.material && obj.material.color && typeof obj.material.color.getHex === 'function') {
                        starColor = obj.material.color.getHex();
                    } else {
                        starColor = currentColor;
                    }
                    
                    // 更新光晕：半径与恒星半径直接耦合，颜色与恒星颜色耦合
                    updateStarGlow(obj.userData.glow, currentStarRadius, starColor);
                }
            }
        });
    } else if (param === 'evolutionSpeed') {
        // 更新演化速度：控制自动演化模式下年龄的递增速率
        // 注意：修改演化速度不会影响manualAge标志，允许继续自动演化
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'star') {
                obj.userData.evolutionSpeed = value;
            }
        });
    }
}

/**
 * 更新星空图模拟参数
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
function updateStarMapParameter(param, value) {
    if (param === 'dayOfYear' || param === 'hour') {
        const dayOfYearInput = document.getElementById('dayOfYear');
        const hourInput = document.getElementById('hour');
        const dayOfYear = dayOfYearInput ? Math.floor(parseFloat(dayOfYearInput.value)) : (scene.userData.dayOfYear || 1);
        const hour = hourInput ? Math.floor(parseFloat(hourInput.value)) : 20;
        
        const currentDate = new Date();
        currentDate.setMonth(0, 1);
        currentDate.setDate(dayOfYear);
        currentDate.setHours(hour, 0, 0, 0);
        
        scene.userData.starMapDate = currentDate;
        scene.userData.dayOfYear = dayOfYear;
        
        updateStarMapTime(currentDate);
        
        const beijingLat = 39.9042 * Math.PI / 180;
        const beijingLon = 116.4074 * Math.PI / 180;
        const localSiderealTime = calculateLST(dayOfYear, beijingLon);
        
        simulationObjects.forEach(obj => {
            if ((obj.userData.type === 'star' || obj.userData.type === 'background-star') && obj.userData.ra !== undefined) {
                const ra = obj.userData.ra;
                const dec = obj.userData.dec;
                
                const hourAngle = localSiderealTime - ra;
                const hourAngleRad = hourAngle * Math.PI / 12;
                const decRad = dec * Math.PI / 180;
                
                const sinAlt = Math.sin(beijingLat) * Math.sin(decRad) + 
                              Math.cos(beijingLat) * Math.cos(decRad) * Math.cos(hourAngleRad);
                const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
                
                let az;
                const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                              (Math.cos(beijingLat) * Math.cos(alt));
                if (Math.abs(cosAz) <= 1) {
                    az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
                    if (hourAngleRad < 0) {
                        az = 2 * Math.PI - az;
                    }
                } else {
                    az = 0;
                }
                
                const radius = 45;
                const x = radius * Math.cos(alt) * Math.sin(az);
                const y = radius * Math.sin(alt);
                const z = radius * Math.cos(alt) * Math.cos(az);
                
                obj.position.set(x, y, z);
                
                if (obj.userData.type === 'star' && obj.userData.mag < 2.0) {
                    labelObjects.forEach(label => {
                        if (label.parent === obj || (label.position && 
                            Math.abs(label.position.x - x * 1.05) < 0.1)) {
                            label.position.set(x * 1.05, y * 1.05, z * 1.05);
                        }
                    });
                }
            }
        });
    }
}

