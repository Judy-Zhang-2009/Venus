import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';

// 轨道力学模拟
export function initOrbitalMechanics() {
    // 中心天体
    const centralBody = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b })
    );
    centralBody.userData = { type: 'central-body' };
    scene.add(centralBody);
    simulationObjects.push(centralBody);
    
    // 添加中心天体标签
    const centralLabel = createLabel('中心天体', '#ff6b6b');
    centralLabel.position.set(0, -1.5 - 0.3, 0);
    centralBody.add(centralLabel);
    labelObjects.push(centralLabel);
    
    // 轨道物体
    for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const distance = 10 + i * 3;
        const size = 0.3;
        
        const obj = new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshPhongMaterial({ color: 0x4ecdc4 })
        );
        obj.userData = {
            type: 'orbital',
            distance: distance,
            angle: angle,
            speed: 0.01 / (i + 1)
        };
        scene.add(obj);
        simulationObjects.push(obj);
        
        // 创建轨道线
        const orbitCurve = new THREE.EllipseCurve(
            0, 0,
            distance, distance,
            0, 2 * Math.PI,
            false,
            0
        );
        const orbitPoints = orbitCurve.getPoints(200);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
            orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
        );
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x4ecdc4,
            transparent: true,
            opacity: 0.4
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        simulationObjects.push(orbitLine);
    }
}

export function updateOrbitalMechanics() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'orbital') {
            obj.userData.angle += obj.userData.speed;
            const x = Math.cos(obj.userData.angle) * obj.userData.distance;
            const z = Math.sin(obj.userData.angle) * obj.userData.distance;
            obj.position.set(x, 0, z);
        }
    });
}

