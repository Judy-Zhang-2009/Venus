import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';
import { createStarGlow, updateStarGlow } from './lab-stellar-evolution-glow.js';

/**
 * 初始化恒星演化模拟
 * 创建主序星几何体、材质、光晕效果及标签
 */
export function initStellarEvolution() {
    const BASE_RADIUS = 1.5;
    const INITIAL_COLOR = 0xffff00;
    const INITIAL_BRIGHTNESS = 0.5;
    
    const mainSequence = new THREE.Mesh(
        new THREE.SphereGeometry(BASE_RADIUS, 32, 32),
        new THREE.MeshBasicMaterial({ 
            color: INITIAL_COLOR,
            emissive: INITIAL_COLOR,
            emissiveIntensity: INITIAL_BRIGHTNESS
        })
    );
    mainSequence.userData = {
        type: 'star',
        stage: 'main-sequence',
        age: 0,
        manualAge: false,
        manualBrightness: false,
        baseSize: BASE_RADIUS,
        baseColor: INITIAL_COLOR,
        brightness: INITIAL_BRIGHTNESS
    };
    scene.add(mainSequence);
    simulationObjects.push(mainSequence);
    
    // 创建光晕：光晕半径与恒星半径耦合
    const initialStarRadius = BASE_RADIUS * mainSequence.scale.x;
    const glow = createStarGlow(initialStarRadius, INITIAL_COLOR, INITIAL_BRIGHTNESS);
    mainSequence.userData.glow = glow;
    
    const starLabel = createLabel('主序星', '#ffff00');
    starLabel.position.set(0, -BASE_RADIUS - 0.3, 0);
    mainSequence.add(starLabel);
    labelObjects.push(starLabel);
}

/**
 * 更新恒星演化模拟状态
 * 根据恒星年龄和演化阶段更新恒星外观、大小、颜色
 * 同步更新光晕颜色和半径，确保光晕与恒星状态耦合
 */
export function updateStellarEvolution() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star') {
            // 自动递增年龄（除非用户手动设置）
            if (!obj.userData.manualAge) {
                obj.userData.age = (obj.userData.age || 0) + 0.001;
            }
            
            const age = obj.userData.age || 0;
            const stage = obj.userData.stage || 'main-sequence';
            const baseRadius = obj.userData.baseSize || 1.5;
            let brightness = obj.userData.brightness;
            
            if (stage === 'main-sequence') {
                if (age < 2) {
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(0xffff00);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(0xffff00);
                    }
                    obj.scale.set(1, 1, 1);
                } else if (age < 4) {
                    obj.userData.stage = 'red-giant';
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(0xff6600);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(0xff6600);
                    }
                    obj.scale.set(2, 2, 2);
                } else if (age < 6) {
                    if (obj.userData.stage === 'red-giant') {
                        const scale = 2 + (age - 4) * 0.5;
                        obj.scale.set(scale, scale, scale);
                    }
                } else if (age < 8) {
                    obj.userData.stage = 'white-dwarf';
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(0xffffff);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(0xffffff);
                    }
                    obj.scale.set(0.3, 0.3, 0.3);
                } else {
                    const coolFactor = 1 - (age - 8) * 0.1;
                    brightness = Math.max(0.1, 0.8 * coolFactor);
                    if (!obj.userData.manualBrightness && obj.material) {
                        obj.material.emissiveIntensity = brightness;
                    }
                }
            } else if (stage === 'red-giant') {
                if (age >= 6) {
                    obj.userData.stage = 'white-dwarf';
                    if (obj.material && obj.material.color) {
                        obj.material.color.setHex(0xffffff);
                    }
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(0xffffff);
                    }
                    obj.scale.set(0.3, 0.3, 0.3);
                } else if (age >= 4) {
                    const scale = 2 + (age - 4) * 0.5;
                    obj.scale.set(scale, scale, scale);
                }
            } else if (stage === 'white-dwarf') {
                if (age >= 8) {
                    const coolFactor = 1 - (age - 8) * 0.1;
                    brightness = Math.max(0.1, 0.8 * coolFactor);
                    if (!obj.userData.manualBrightness && obj.material) {
                        obj.material.emissiveIntensity = brightness;
                    }
                }
            }
            
            const twinkle = 0.9 + Math.sin(age * 2) * 0.1;
            const baseIntensity = (obj.material && obj.material.emissiveIntensity) || brightness || 0.5;
            const finalBrightness = baseIntensity * twinkle;
            if (obj.material) {
                obj.material.emissiveIntensity = finalBrightness;
            }
            
            if (!obj.userData.manualBrightness) {
                obj.userData.brightness = brightness || baseIntensity;
            }
            
            // 更新光晕：光晕半径与恒星实际半径耦合
            if (obj.userData.glow) {
                // 计算恒星当前实际半径（考虑缩放）
                const currentStarRadius = baseRadius * obj.scale.x;
                // 获取当前亮度值（优先使用用户设置值）
                const glowBrightness = obj.userData.brightness || brightness || 0.5;
                
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
                updateStarGlow(obj.userData.glow, currentStarRadius, starColor, glowBrightness);
            }
        }
    });
}

