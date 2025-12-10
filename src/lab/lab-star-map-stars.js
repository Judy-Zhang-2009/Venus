import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';
import { calculateLST } from './lab-star-map.js';

// 创建主要星星
export function createMainStars(stars, dayOfYear, beijingLat, beijingLon) {
    stars.forEach(star => {
        createStar(star, dayOfYear, beijingLat, beijingLon);
    });
}

// 创建星星
function createStar(star, dayOfYear, beijingLat, beijingLon) {
    const raRad = star.ra * Math.PI / 12;
    const decRad = star.dec * Math.PI / 180;
    
    const localSiderealTime = calculateLST(dayOfYear, beijingLon);
    const hourAngle = localSiderealTime - star.ra;
    const hourAngleRad = hourAngle * Math.PI / 12;
    
    const sinAlt = Math.sin(beijingLat) * Math.sin(decRad) + 
                  Math.cos(beijingLat) * Math.cos(decRad) * Math.cos(hourAngleRad);
    const alt = Math.asin(sinAlt);
    const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                  (Math.cos(beijingLat) * Math.cos(alt));
    const az = Math.acos(cosAz);
    
    const radius = 45;
    const x = radius * Math.cos(alt) * Math.sin(az);
    const y = radius * Math.sin(alt);
    const z = radius * Math.cos(alt) * Math.cos(az);
    
    const size = Math.max(0.05, 0.15 - star.mag * 0.02);
    const starGeometry = new THREE.SphereGeometry(size, 16, 16);
    const starMaterial = new THREE.MeshBasicMaterial({
        color: star.color,
        emissive: star.color,
        emissiveIntensity: 0.8
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.position.set(x, y, z);
    starMesh.userData = {
        type: 'star',
        name: star.name,
        ra: star.ra,
        dec: star.dec,
        mag: star.mag
    };
    scene.add(starMesh);
    simulationObjects.push(starMesh);
    
    // 添加星星标签
    if (star.mag < 2.0) {
        const starLabel = createLabel(star.name, '#ffffff');
        starLabel.position.set(x * 1.05, y * 1.05, z * 1.05);
        scene.add(starLabel);
        labelObjects.push(starLabel);
    }
}

// 创建背景星星
export function createBackgroundStars(dayOfYear, beijingLat, beijingLon) {
    for (let i = 0; i < 500; i++) {
        const ra = Math.random() * 24;
        const dec = (Math.random() - 0.5) * 180;
        const mag = 2 + Math.random() * 4;
        
        const raRad = ra * Math.PI / 12;
        const decRad = dec * Math.PI / 180;
        
        const localSiderealTime = calculateLST(dayOfYear, beijingLon);
        const hourAngle = localSiderealTime - ra;
        const hourAngleRad = hourAngle * Math.PI / 12;
        
        const sinAlt = Math.sin(beijingLat) * Math.sin(decRad) + 
                      Math.cos(beijingLat) * Math.cos(decRad) * Math.cos(hourAngleRad);
        const alt = Math.asin(sinAlt);
        const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                      (Math.cos(beijingLat) * Math.cos(alt));
        const az = Math.acos(cosAz);
        
        const radius = 45;
        const x = radius * Math.cos(alt) * Math.sin(az);
        const y = radius * Math.sin(alt);
        const z = radius * Math.cos(alt) * Math.cos(az);
        
        // 只显示在地平线以上的星星
        if (y > 0) {
            const size = Math.max(0.02, 0.1 - mag * 0.01);
            const starGeometry = new THREE.SphereGeometry(size, 8, 8);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0.3
            });
            const starMesh = new THREE.Mesh(starGeometry, starMaterial);
            starMesh.position.set(x, y, z);
            starMesh.userData = {
                type: 'background-star',
                mag: mag
            };
            scene.add(starMesh);
            simulationObjects.push(starMesh);
        }
    }
}

