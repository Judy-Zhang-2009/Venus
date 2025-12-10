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
    const INITIAL_EMISSIVE_INTENSITY = 0.5;
    
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
        age: 0,
        manualAge: false,
        baseSize: BASE_RADIUS,
        baseColor: INITIAL_COLOR,
        targetScale: 1.0,
        currentScale: 1.0
    };
    scene.add(mainSequence);
    simulationObjects.push(mainSequence);
    
    // 创建光晕：光晕半径直接与恒星半径耦合
    const initialStarRadius = BASE_RADIUS * mainSequence.scale.x;
    const glow = createStarGlow(initialStarRadius, INITIAL_COLOR);
    mainSequence.userData.glow = glow;
    
    const starLabel = createLabel('主序星', '#ffff00');
    starLabel.position.set(0, -BASE_RADIUS - 0.3, 0);
    mainSequence.add(starLabel);
    labelObjects.push(starLabel);
    mainSequence.userData.label = starLabel;
}

/**
 * 更新恒星演化模拟状态
 * 根据恒星年龄和演化阶段更新恒星外观、大小、颜色
 * 使用平滑插值实现半径变化，避免突然抖动
 * 同步更新光晕颜色和半径，确保光晕与恒星状态耦合
 */
export function updateStellarEvolution() {
    const SMOOTHING_FACTOR = 0.05; // 平滑插值系数，值越小变化越平滑
    
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star') {
            // 自动递增年龄（除非用户手动设置）
            if (!obj.userData.manualAge) {
                obj.userData.age = (obj.userData.age || 0) + 0.001;
            }
            
            const age = obj.userData.age || 0;
            const baseRadius = obj.userData.baseSize || 1.5;
            let targetScale = obj.userData.targetScale || 1.0;
            let currentScale = obj.userData.currentScale || 1.0;
            let starColor = obj.userData.baseColor || 0xffff00;
            let emissiveIntensity = 0.5;
            
            // 根据年龄计算目标缩放值和颜色
            if (age < 2) {
                // 主序星阶段：保持原始大小
                obj.userData.stage = 'main-sequence';
                targetScale = 1.0;
                starColor = 0xffff00;
                emissiveIntensity = 0.5;
            } else if (age < 4) {
                // 过渡到红巨星阶段：平滑增长
                obj.userData.stage = 'red-giant';
                const transitionProgress = (age - 2) / 2; // 0到1的过渡进度
                targetScale = 1.0 + transitionProgress * 1.0; // 从1.0平滑增长到2.0
                starColor = 0xffff00 + Math.floor(transitionProgress * (0xff6600 - 0xffff00));
                emissiveIntensity = 0.5;
            } else if (age < 6) {
                // 红巨星阶段：继续增长
                obj.userData.stage = 'red-giant';
                const growthProgress = (age - 4) / 2; // 0到1的增长进度
                targetScale = 2.0 + growthProgress * 1.0; // 从2.0增长到3.0
                starColor = 0xff6600;
                emissiveIntensity = 0.5;
            } else if (age < 8) {
                // 过渡到白矮星阶段：平滑收缩
                obj.userData.stage = 'white-dwarf';
                const transitionProgress = (age - 6) / 2; // 0到1的过渡进度
                const startScale = 3.0;
                const endScale = 0.3;
                targetScale = startScale - transitionProgress * (startScale - endScale); // 从3.0平滑收缩到0.3
                const colorTransition = transitionProgress;
                starColor = 0xff6600 + Math.floor(colorTransition * (0xffffff - 0xff6600));
                emissiveIntensity = 0.5;
            } else {
                // 白矮星冷却阶段：保持大小，降低亮度
                obj.userData.stage = 'white-dwarf';
                targetScale = 0.3;
                starColor = 0xffffff;
                const coolFactor = Math.max(0.1, 1.0 - (age - 8) * 0.1);
                emissiveIntensity = 0.5 * coolFactor;
            }
            
            // 平滑插值更新缩放值
            obj.userData.targetScale = targetScale;
            currentScale += (targetScale - currentScale) * SMOOTHING_FACTOR;
            obj.userData.currentScale = currentScale;
            obj.scale.set(currentScale, currentScale, currentScale);
            
            // 更新材质颜色
            if (obj.material) {
                if (obj.material.color) {
                    obj.material.color.setHex(starColor);
                }
                if (obj.material.emissive) {
                    obj.material.emissive.setHex(starColor);
                }
            }
            
            // 应用闪烁效果
            const twinkle = 0.9 + Math.sin(age * 2) * 0.1;
            const finalEmissiveIntensity = emissiveIntensity * twinkle;
            if (obj.material) {
                obj.material.emissiveIntensity = finalEmissiveIntensity;
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
                // 计算恒星当前实际半径（考虑平滑插值后的缩放）
                const currentStarRadius = baseRadius * currentScale;
                
                // 从材质动态获取恒星颜色，确保颜色耦合
                let currentStarColor;
                if (obj.material && obj.material.emissive && typeof obj.material.emissive.getHex === 'function') {
                    currentStarColor = obj.material.emissive.getHex();
                } else if (obj.material && obj.material.color && typeof obj.material.color.getHex === 'function') {
                    currentStarColor = obj.material.color.getHex();
                } else {
                    currentStarColor = starColor;
                }
                
                // 更新光晕：半径与恒星半径直接耦合，颜色与恒星颜色耦合
                updateStarGlow(obj.userData.glow, currentStarRadius, currentStarColor);
            }
        }
    });
}

