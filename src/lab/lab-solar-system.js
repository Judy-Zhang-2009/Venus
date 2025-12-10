import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';
import { createSunGlow } from './lab-solar-system-glow.js';
import { createAsteroidBelt } from './lab-solar-system-asteroids.js';
import { createPlanet } from './lab-solar-system-planets.js';

// 太阳系模拟
export function initSolarSystem() {
    // 真实比例数据（以木星为基准1，太阳是木星的2倍）
    // 行星大小比例（相对于木星）
    const sizeScale = {
        sun: 2.0,      // 太阳是木星的2倍
        jupiter: 1.0,  // 木星基准
        saturn: 0.833, // 土星
        uranus: 0.364, // 天王星
        neptune: 0.355, // 海王星
        earth: 0.091,  // 地球
        venus: 0.087,  // 金星
        mars: 0.048,   // 火星
        mercury: 0.035 // 水星
    };
    
    // 真实距离比例（以地球为1 AU）
    const distanceScale = {
        mercury: 0.39,
        venus: 0.72,
        earth: 1.0,
        mars: 1.52,
        asteroidBelt: { inner: 2.2, outer: 3.2 },
        jupiter: 5.2,
        saturn: 9.5,
        uranus: 19.2,
        neptune: 30.1
    };
    
    // 缩放因子（将距离转换为场景单位）
    const distanceMultiplier = 8; // 1 AU = 8 单位
    
    // 创建太阳
    createSun(sizeScale.sun);
    
    // 行星数据（真实比例）
    const planets = [
        { 
            name: '水星', 
            distance: distanceScale.mercury * distanceMultiplier, 
            size: sizeScale.mercury, 
            color: 0x8c7853, 
            speed: 0.04,
            labelColor: '#8c7853'
        },
        { 
            name: '金星', 
            distance: distanceScale.venus * distanceMultiplier, 
            size: sizeScale.venus, 
            color: 0xffc649, 
            speed: 0.03,
            labelColor: '#ffc649'
        },
        { 
            name: '地球', 
            distance: distanceScale.earth * distanceMultiplier, 
            size: sizeScale.earth, 
            color: 0x6b93d6, 
            speed: 0.02,
            labelColor: '#6b93d6'
        },
        { 
            name: '火星', 
            distance: distanceScale.mars * distanceMultiplier, 
            size: sizeScale.mars, 
            color: 0xc1440e, 
            speed: 0.015,
            labelColor: '#c1440e'
        },
        { 
            name: '木星', 
            distance: distanceScale.jupiter * distanceMultiplier, 
            size: sizeScale.jupiter, 
            color: 0xd8ca9d, 
            speed: 0.008,
            labelColor: '#d8ca9d'
        },
        { 
            name: '土星', 
            distance: distanceScale.saturn * distanceMultiplier, 
            size: sizeScale.saturn, 
            color: 0xfad5a5, 
            speed: 0.005,
            labelColor: '#fad5a5'
        },
        { 
            name: '天王星', 
            distance: distanceScale.uranus * distanceMultiplier, 
            size: sizeScale.uranus, 
            color: 0x4fd0e7, 
            speed: 0.003,
            labelColor: '#4fd0e7'
        },
        { 
            name: '海王星', 
            distance: distanceScale.neptune * distanceMultiplier, 
            size: sizeScale.neptune, 
            color: 0x4166f5, 
            speed: 0.002,
            labelColor: '#4166f5'
        }
    ];
    
    // 创建行星
    planets.forEach((planet, index) => {
        createPlanet(planet, index, planets.length);
    });
    
    // 创建小行星带
    createAsteroidBelt(distanceScale.asteroidBelt, distanceMultiplier);
    
    // 添加右下角说明文字
    addSolarSystemNote();
}

// 创建太阳和光晕
function createSun(sunSize) {
    // 创建太阳（精细化建模，64分段）
    const sunGeometry = new THREE.SphereGeometry(sunSize, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = { type: 'sun' };
    sun.visible = true;
    scene.add(sun);
    simulationObjects.push(sun);
    
    // 添加太阳光晕
    createSunGlow(sunSize);
    
    // 添加太阳标签
    const sunLabel = createLabel('太阳', '#ffd700');
    sunLabel.position.set(0, -sunSize - 0.5, 0);
    sun.add(sunLabel);
    labelObjects.push(sunLabel);
}




// 添加说明文字
function addSolarSystemNote() {
    const noteDiv = document.createElement('div');
    noteDiv.id = 'solar-system-note';
    noteDiv.style.position = 'absolute';
    noteDiv.style.bottom = '20px';
    noteDiv.style.right = '20px';
    noteDiv.style.color = '#888888';
    noteDiv.style.fontSize = '12px';
    noteDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    noteDiv.style.padding = '8px 12px';
    noteDiv.style.borderRadius = '6px';
    noteDiv.style.pointerEvents = 'none';
    noteDiv.style.userSelect = 'none';
    noteDiv.textContent = '模拟中的太阳非真实比例，与地球的真实比例为 109:1';
    const canvasContainer = document.getElementById('lab-canvas').parentElement;
    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(noteDiv);
}

// 更新太阳系模拟
export function updateSolarSystem() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'planet') {
            obj.userData.angle += obj.userData.speed;
            const x = Math.cos(obj.userData.angle) * obj.userData.distance;
            const z = Math.sin(obj.userData.angle) * obj.userData.distance;
            obj.position.set(x, 0, z);
            obj.rotation.y += 0.01;
        } else if (obj.userData.type === 'asteroid') {
            obj.userData.angle += obj.userData.speed;
            const x = Math.cos(obj.userData.angle) * obj.userData.distance;
            const z = Math.sin(obj.userData.angle) * obj.userData.distance;
            obj.position.set(x, obj.position.y, z);
            obj.rotation.x += 0.01;
            obj.rotation.y += 0.01;
        }
    });
}

