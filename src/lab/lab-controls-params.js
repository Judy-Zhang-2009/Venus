import * as THREE from 'three';
import { currentSimulation, scene, simulationObjects, labelObjects, camera, controls } from './lab-core.js';
import { calculateLST, updateStarMapTime } from './lab-star-map.js';
import { updateStarGlow } from './lab-stellar-evolution-glow.js';

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
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
function updateSolarSystemParameter(param, value) {
    if (param === 'speed') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'planet') {
                obj.userData.speed = value * 0.01;
            }
        });
    } else if (param === 'cameraDistance') {
        const currentDistance = camera.position.length();
        if (currentDistance > 0) {
            const scaleFactor = value / currentDistance;
            camera.position.multiplyScalar(scaleFactor);
            if (controls) {
                controls.update();
            }
        }
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
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
function updateGravityWellParameter(param, value) {
    if (param === 'mass') {
        const mass = simulationObjects.find(obj => obj.userData.type === 'central-mass');
        if (mass) {
            mass.userData.mass = value;
            mass.scale.set(value, value, value);
        }
    } else if (param === 'particleSpeed') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'particle' && obj.userData.velocity) {
                const currentSpeed = obj.userData.velocity.length();
                if (currentSpeed > 0) {
                    obj.userData.velocity.normalize().multiplyScalar(value);
                } else {
                    obj.userData.velocity.set(value, 0, 0);
                }
            }
        });
    } else if (param === 'resetParticles') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'particle') {
                const angle = Math.random() * Math.PI * 2;
                const distance = 15 + Math.random() * 5;
                obj.position.set(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                const speedInput = document.getElementById('particleSpeed');
                const speed = speedInput ? parseFloat(speedInput.value) : 0.3;
                obj.userData.velocity.set(
                    -Math.sin(angle) * speed,
                    0,
                    Math.cos(angle) * speed
                );
            }
        });
    }
}

/**
 * 更新恒星演化模拟参数
 * 光晕颜色从恒星材质动态获取，确保颜色耦合
 * @param {string} param - 参数名称
 * @param {number} value - 参数值（来自滑块）
 */
function updateStellarEvolutionParameter(param, value) {
    if (param === 'starAge') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'star') {
                obj.userData.age = value;
                obj.userData.manualAge = true;
                
                const age = value;
                const baseRadius = obj.userData.baseSize || 1.5;
                let targetScale = 1.0;
                let currentColor = 0xffff00;
                
                // 根据年龄计算目标缩放值和颜色（与updateStellarEvolution中的逻辑一致）
                if (age < 2) {
                    obj.userData.stage = 'main-sequence';
                    targetScale = 1.0;
                    currentColor = 0xffff00;
                } else if (age < 4) {
                    obj.userData.stage = 'red-giant';
                    const transitionProgress = (age - 2) / 2;
                    targetScale = 1.0 + transitionProgress * 1.0;
                    currentColor = 0xffff00 + Math.floor(transitionProgress * (0xff6600 - 0xffff00));
                } else if (age < 6) {
                    obj.userData.stage = 'red-giant';
                    const growthProgress = (age - 4) / 2;
                    targetScale = 2.0 + growthProgress * 1.0;
                    currentColor = 0xff6600;
                } else if (age < 8) {
                    obj.userData.stage = 'white-dwarf';
                    const transitionProgress = (age - 6) / 2;
                    const startScale = 3.0;
                    const endScale = 0.3;
                    targetScale = startScale - transitionProgress * (startScale - endScale);
                    const colorTransition = transitionProgress;
                    currentColor = 0xff6600 + Math.floor(colorTransition * (0xffffff - 0xff6600));
                } else {
                    obj.userData.stage = 'white-dwarf';
                    targetScale = 0.3;
                    currentColor = 0xffffff;
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
                        labelColor = '#ffffff';
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

