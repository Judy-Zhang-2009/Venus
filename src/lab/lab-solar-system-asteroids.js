import * as THREE from 'three';
import { scene, simulationObjects } from './lab-core.js';

// 创建小行星带
export function createAsteroidBelt(asteroidBelt, distanceMultiplier) {
    const asteroidBeltInner = asteroidBelt.inner * distanceMultiplier;
    const asteroidBeltOuter = asteroidBelt.outer * distanceMultiplier;
    const asteroidCount = 200;
    
    for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = asteroidBeltInner + Math.random() * (asteroidBeltOuter - asteroidBeltInner);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = (Math.random() - 0.5) * 2;
        
        const asteroidSize = 0.01 + Math.random() * 0.02;
        const asteroidGeometry = new THREE.SphereGeometry(asteroidSize, 8, 8);
        const asteroidMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x666666,
            emissive: 0x333333,
            emissiveIntensity: 0.1
        });
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        asteroid.position.set(x, y, z);
        asteroid.userData = {
            type: 'asteroid',
            distance: distance,
            angle: angle,
            speed: 0.01 + Math.random() * 0.01
        };
        scene.add(asteroid);
        simulationObjects.push(asteroid);
    }
    
    // 添加小行星带轨道线（内外圈）
    [asteroidBeltInner, asteroidBeltOuter].forEach((radius) => {
        const beltCurve = new THREE.EllipseCurve(
            0, 0,
            radius, radius,
            0, 2 * Math.PI,
            false,
            0
        );
        const beltPoints = beltCurve.getPoints(200);
        const beltGeometry = new THREE.BufferGeometry().setFromPoints(
            beltPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
        );
        const beltMaterial = new THREE.LineBasicMaterial({
            color: 0x777777,
            transparent: true,
            opacity: 0.25
        });
        const beltLine = new THREE.Line(beltGeometry, beltMaterial);
        scene.add(beltLine);
        simulationObjects.push(beltLine);
    });
}

