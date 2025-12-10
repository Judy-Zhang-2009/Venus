import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';

// 恒星演化模拟
export function initStellarEvolution() {
    // 主序星
    const mainSequence = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 32),
        new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        })
    );
    mainSequence.userData = {
        type: 'star',
        stage: 'main-sequence',
        age: 0,
        manualAge: false, // 是否由用户手动设置年龄
        baseSize: 1.5,
        baseColor: 0xffff00
    };
    scene.add(mainSequence);
    simulationObjects.push(mainSequence);
    
    // 添加恒星标签
    const starLabel = createLabel('主序星', '#ffff00');
    starLabel.position.set(0, -1.5 - 0.3, 0);
    mainSequence.add(starLabel);
    labelObjects.push(starLabel);
}

export function updateStellarEvolution() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star') {
            // 如果用户没有手动设置年龄，则自动递增（慢速演化）
            if (!obj.userData.manualAge) {
                obj.userData.age = (obj.userData.age || 0) + 0.001;
            }
            
            const age = obj.userData.age || 0;
            const stage = obj.userData.stage || 'main-sequence';
            
            // 根据年龄和阶段更新恒星外观
            if (stage === 'main-sequence') {
                if (age < 2) {
                    // 主序星阶段：黄色，稳定
                    obj.material.color.setHex(0xffff00);
                    obj.material.emissive.setHex(0xffff00);
                    obj.scale.set(1, 1, 1);
                } else if (age < 4) {
                    // 红巨星阶段：变大变红
                    obj.userData.stage = 'red-giant';
                    obj.material.color.setHex(0xff6600);
                    obj.material.emissive.setHex(0xff6600);
                    obj.scale.set(2, 2, 2);
                } else if (age < 6) {
                    // 继续膨胀
                    if (obj.userData.stage === 'red-giant') {
                        const scale = 2 + (age - 4) * 0.5;
                        obj.scale.set(scale, scale, scale);
                    }
                } else if (age < 8) {
                    // 白矮星阶段：变小变白
                    obj.userData.stage = 'white-dwarf';
                    obj.material.color.setHex(0xffffff);
                    obj.material.emissive.setHex(0xffffff);
                    obj.scale.set(0.3, 0.3, 0.3);
                } else {
                    // 最终阶段：逐渐冷却
                    const coolFactor = 1 - (age - 8) * 0.1;
                    obj.material.emissiveIntensity = Math.max(0.1, 0.8 * coolFactor);
                }
            } else if (stage === 'red-giant') {
                if (age >= 6) {
                    obj.userData.stage = 'white-dwarf';
                    obj.material.color.setHex(0xffffff);
                    obj.material.emissive.setHex(0xffffff);
                    obj.scale.set(0.3, 0.3, 0.3);
                } else if (age >= 4) {
                    // 继续膨胀
                    const scale = 2 + (age - 4) * 0.5;
                    obj.scale.set(scale, scale, scale);
                }
            } else if (stage === 'white-dwarf') {
                if (age >= 8) {
                    // 最终阶段：逐渐冷却
                    const coolFactor = 1 - (age - 8) * 0.1;
                    obj.material.emissiveIntensity = Math.max(0.1, 0.8 * coolFactor);
                }
            }
            
            // 轻微的闪烁效果
            const twinkle = 0.9 + Math.sin(age * 2) * 0.1;
            const baseIntensity = obj.material.emissiveIntensity || 0.5;
            obj.material.emissiveIntensity = baseIntensity * twinkle;
        }
    });
}

