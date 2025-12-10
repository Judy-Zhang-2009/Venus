import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';

// 创建行星
export function createPlanet(planet, index, totalPlanets) {
    // 创建行星（精细化建模，64分段）
    const planetGeometry = new THREE.SphereGeometry(planet.size, 64, 64);
    const planetMaterial = new THREE.MeshPhongMaterial({ 
        color: planet.color,
        shininess: 30,
        specular: 0x222222
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.userData = {
        type: 'planet',
        name: planet.name,
        distance: planet.distance,
        angle: (index * Math.PI * 2) / totalPlanets,
        speed: planet.speed
    };
    scene.add(planetMesh);
    simulationObjects.push(planetMesh);
    
    // 添加行星标签
    const planetLabel = createLabel(planet.name, planet.labelColor);
    planetLabel.position.set(0, -planet.size - 0.3, 0);
    planetMesh.add(planetLabel);
    labelObjects.push(planetLabel);
    
    // 创建轨道线
    const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        planet.distance, planet.distance,
        0, 2 * Math.PI,
        false,
        0
    );
    const orbitPoints = orbitCurve.getPoints(200);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.4
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
    simulationObjects.push(orbitLine);
}

