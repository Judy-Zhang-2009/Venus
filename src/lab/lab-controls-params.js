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
                let currentColor;
                if (age < 2) {
                    obj.userData.stage = 'main-sequence';
                    currentColor = 0xffff00;
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(currentColor);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(currentColor);
                    }
                    obj.scale.set(1, 1, 1);
                } else if (age < 6) {
                    obj.userData.stage = 'red-giant';
                    currentColor = 0xff6600;
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(currentColor);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(currentColor);
                    }
                    const scale = 2 + (age - 2) * 0.5;
                    obj.scale.set(scale, scale, scale);
                } else {
                    obj.userData.stage = 'white-dwarf';
                    currentColor = 0xffffff;
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(currentColor);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(currentColor);
                    }
                    const scale = Math.max(0.3, 4 - (age - 6) * 0.1);
                    obj.scale.set(scale, scale, scale);
                }
                
                // 更新光晕：光晕半径与恒星实际半径耦合
                if (obj.userData.glow) {
                    // 计算恒星当前实际半径（考虑缩放）
                    const baseRadius = obj.userData.baseSize || 1.5;
                    const currentStarRadius = baseRadius * obj.scale.x;
                    // 从滑块读取亮度值，如果不存在则使用存储值
                    const brightnessInput = document.getElementById('brightness');
                    const brightness = brightnessInput ? parseFloat(brightnessInput.value) : (obj.userData.brightness || 0.5);
                    
                    // 从材质动态获取恒星颜色，确保颜色耦合
                    let starColor;
                    if (obj.material && obj.material.emissive && typeof obj.material.emissive.getHex === 'function') {
                        starColor = obj.material.emissive.getHex();
                    } else if (obj.material && obj.material.color && typeof obj.material.color.getHex === 'function') {
                        starColor = obj.material.color.getHex();
                    } else {
                        starColor = currentColor || obj.userData.baseColor || 0xffff00;
                    }
                    
                    // 更新光晕：半径与恒星半径耦合，颜色与恒星颜色耦合
                    updateStarGlow(obj.userData.glow, currentStarRadius, starColor, brightness);
                }
            }
        });
    } else if (param === 'brightness') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'star') {
                if (obj.material) {
                    obj.material.emissiveIntensity = value;
                }
                obj.userData.brightness = value;
                obj.userData.manualBrightness = true;
                
                // 更新光晕：光晕半径与恒星实际半径耦合
                if (obj.userData.glow) {
                    // 计算恒星当前实际半径（考虑缩放）
                    const baseRadius = obj.userData.baseSize || 1.5;
                    const currentStarRadius = baseRadius * obj.scale.x;
                    
                    // 从材质动态获取恒星颜色，确保颜色耦合
                    let starColor;
                    if (obj.material && obj.material.emissive && typeof obj.material.emissive.getHex === 'function') {
                        starColor = obj.material.emissive.getHex();
                    } else if (obj.material && obj.material.color && typeof obj.material.color.getHex === 'function') {
                        starColor = obj.material.color.getHex();
                    } else {
                        starColor = obj.userData.baseColor || 0xffff00;
                    }
                    
                    // 更新光晕：半径与恒星半径耦合，颜色与恒星颜色耦合
                    updateStarGlow(obj.userData.glow, currentStarRadius, starColor, value);
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

