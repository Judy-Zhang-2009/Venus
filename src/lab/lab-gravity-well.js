import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';

// 引力井模拟
export function initGravityWell() {
    // 创建网格平面
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    gridHelper.userData = { type: 'grid' };
    scene.add(gridHelper);
    simulationObjects.push(gridHelper);
    
    // 中心质量
    const mass = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b, emissive: 0xff6b6b, emissiveIntensity: 0.3 })
    );
    mass.userData = { type: 'central-mass', mass: 1.0 };
    scene.add(mass);
    simulationObjects.push(mass);
    
    // 添加中心质量标签
    const massLabel = createLabel('中心质量', '#ff6b6b');
    massLabel.position.set(0, -2 - 0.3, 0);
    mass.add(massLabel);
    labelObjects.push(massLabel);
    
    // 测试粒子
    for (let i = 0; i < 20; i++) {
        const angle = (i * Math.PI * 2) / 20;
        const distance = 15 + Math.random() * 5;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0x4ecdc4 })
        );
        particle.position.set(x, 0, z);
        particle.userData = {
            type: 'particle',
            velocity: new THREE.Vector3(
                -Math.sin(angle) * 0.3,
                0,
                Math.cos(angle) * 0.3
            )
        };
        scene.add(particle);
        simulationObjects.push(particle);
    }
}

export function updateGravityWell() {
    const centralMass = simulationObjects.find(obj => obj.userData.type === 'central-mass');
    if (!centralMass) return;
    
    const massValue = centralMass.userData.mass || 1.0;
    
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'particle') {
            const dx = -obj.position.x;
            const dz = -obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > 0.5) {
                const force = (0.1 * massValue) / (distance * distance);
                obj.userData.velocity.x += (dx / distance) * force;
                obj.userData.velocity.z += (dz / distance) * force;
                
                obj.position.x += obj.userData.velocity.x;
                obj.position.z += obj.userData.velocity.z;
            } else {
                // 粒子被捕获或碰撞
                obj.userData.velocity.multiplyScalar(0.5);
            }
        }
    });
}

