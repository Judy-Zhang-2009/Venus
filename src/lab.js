import * as THREE from 'three';

let scene, camera, renderer;
let simulationObjects = [];
let animationId;
let isPlaying = true;
let currentSimulation = 'solar-system';

// 初始化Three.js场景
function initLab() {
    const canvas = document.getElementById('lab-canvas');
    const container = canvas.parentElement;
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    
    // 创建相机
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 0, 50);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    
    // 初始化模拟
    initSimulation('solar-system');
    
    // 开始动画循环
    animate();
    
    // 窗口大小改变时调整
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('lab-canvas').parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isPlaying) {
        updateSimulation();
    }
    
    renderer.render(scene, camera);
}

// 清除当前模拟
function clearSimulation() {
    simulationObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    simulationObjects = [];
}

// 初始化模拟
function initSimulation(type) {
    clearSimulation();
    currentSimulation = type;
    
    switch(type) {
        case 'solar-system':
            initSolarSystem();
            break;
        case 'orbital-mechanics':
            initOrbitalMechanics();
            break;
        case 'gravity-well':
            initGravityWell();
            break;
        case 'stellar-evolution':
            initStellarEvolution();
            break;
    }
    
    updateParameterControls();
}

// 太阳系模拟
function initSolarSystem() {
    // 太阳
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.5
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    simulationObjects.push(sun);
    
    // 添加光晕
    const sunGlow = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.3
        })
    );
    scene.add(sunGlow);
    simulationObjects.push(sunGlow);
    
    // 行星数据
    const planets = [
        { name: '水星', distance: 8, size: 0.3, color: 0x8c7853, speed: 0.02 },
        { name: '金星', distance: 12, size: 0.4, color: 0xffc649, speed: 0.015 },
        { name: '地球', distance: 16, size: 0.5, color: 0x6b93d6, speed: 0.01 },
        { name: '火星', distance: 20, size: 0.4, color: 0xc1440e, speed: 0.008 },
        { name: '木星', distance: 28, size: 1.2, color: 0xd8ca9d, speed: 0.004 },
        { name: '土星', distance: 36, size: 1.0, color: 0xfad5a5, speed: 0.003 }
    ];
    
    planets.forEach((planet, index) => {
        // 行星
        const planetGeometry = new THREE.SphereGeometry(planet.size, 32, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({ 
            color: planet.color 
        });
        const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
        planetMesh.userData = {
            type: 'planet',
            distance: planet.distance,
            angle: (index * Math.PI * 2) / planets.length,
            speed: planet.speed
        };
        scene.add(planetMesh);
        simulationObjects.push(planetMesh);
        
        // 轨道线
        const orbitCurve = new THREE.EllipseCurve(
            0, 0,
            planet.distance, planet.distance,
            0, 2 * Math.PI,
            false,
            0
        );
        const orbitPoints = orbitCurve.getPoints(100);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
            orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
        );
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        simulationObjects.push(orbitLine);
    });
}

// 轨道力学模拟
function initOrbitalMechanics() {
    // 中心天体
    const centralBody = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b })
    );
    scene.add(centralBody);
    simulationObjects.push(centralBody);
    
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
    }
}

// 引力井模拟
function initGravityWell() {
    // 创建网格平面
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    scene.add(gridHelper);
    simulationObjects.push(gridHelper);
    
    // 中心质量
    const mass = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b, emissive: 0xff6b6b, emissiveIntensity: 0.3 })
    );
    scene.add(mass);
    simulationObjects.push(mass);
    
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

// 恒星演化模拟
function initStellarEvolution() {
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
        age: 0
    };
    scene.add(mainSequence);
    simulationObjects.push(mainSequence);
}

// 更新模拟
function updateSimulation() {
    switch(currentSimulation) {
        case 'solar-system':
            updateSolarSystem();
            break;
        case 'orbital-mechanics':
            updateOrbitalMechanics();
            break;
        case 'gravity-well':
            updateGravityWell();
            break;
        case 'stellar-evolution':
            updateStellarEvolution();
            break;
    }
}

function updateSolarSystem() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'planet') {
            obj.userData.angle += obj.userData.speed;
            const x = Math.cos(obj.userData.angle) * obj.userData.distance;
            const z = Math.sin(obj.userData.angle) * obj.userData.distance;
            obj.position.set(x, 0, z);
            obj.rotation.y += 0.01;
        }
    });
}

function updateOrbitalMechanics() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'orbital') {
            obj.userData.angle += obj.userData.speed;
            const x = Math.cos(obj.userData.angle) * obj.userData.distance;
            const z = Math.sin(obj.userData.angle) * obj.userData.distance;
            obj.position.set(x, 0, z);
        }
    });
}

function updateGravityWell() {
    const centralMass = simulationObjects.find(obj => obj.userData.type !== 'particle' && obj.userData.type !== 'grid');
    
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'particle') {
            const dx = -obj.position.x;
            const dz = -obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > 0.5) {
                const force = 0.1 / (distance * distance);
                obj.userData.velocity.x += (dx / distance) * force;
                obj.userData.velocity.z += (dz / distance) * force;
                
                obj.position.x += obj.userData.velocity.x;
                obj.position.z += obj.userData.velocity.z;
            }
        }
    });
}

function updateStellarEvolution() {
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star') {
            obj.userData.age += 0.01;
            // 简单的演化效果
            const intensity = 0.5 + Math.sin(obj.userData.age) * 0.2;
            obj.material.emissiveIntensity = intensity;
        }
    });
}

// 更新参数控制面板
function updateParameterControls() {
    const controlsContainer = document.getElementById('parameter-controls');
    controlsContainer.innerHTML = '';
    
    switch(currentSimulation) {
        case 'solar-system':
            addRangeControl(controlsContainer, 'speed', '运行速度', 0.1, 2, 1, 0.1);
            addRangeControl(controlsContainer, 'cameraDistance', '视角距离', 30, 100, 50, 1);
            break;
        case 'orbital-mechanics':
            addRangeControl(controlsContainer, 'orbitalSpeed', '轨道速度', 0.01, 0.1, 0.05, 0.01);
            addRangeControl(controlsContainer, 'gravity', '引力强度', 0.5, 2, 1, 0.1);
            break;
        case 'gravity-well':
            addRangeControl(controlsContainer, 'mass', '中心质量', 0.5, 3, 1, 0.1);
            addRangeControl(controlsContainer, 'particleSpeed', '粒子速度', 0.1, 1, 0.3, 0.1);
            break;
        case 'stellar-evolution':
            addRangeControl(controlsContainer, 'starAge', '恒星年龄', 0, 10, 0, 0.1);
            addRangeControl(controlsContainer, 'brightness', '亮度', 0.3, 1, 0.5, 0.1);
            break;
    }
}

function addRangeControl(container, id, label, min, max, value, step) {
    const item = document.createElement('div');
    item.className = 'parameter-item';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.setAttribute('for', id);
    
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = min;
    input.max = max;
    input.value = value;
    input.step = step;
    
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = value;
    
    input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueDisplay.textContent = val.toFixed(2);
        updateSimulationParameter(id, val);
    });
    
    item.appendChild(labelEl);
    item.appendChild(input);
    item.appendChild(valueDisplay);
    container.appendChild(item);
}

function updateSimulationParameter(param, value) {
    switch(currentSimulation) {
        case 'solar-system':
            if (param === 'speed') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'planet') {
                        obj.userData.speed = value * 0.01;
                    }
                });
            } else if (param === 'cameraDistance') {
                camera.position.z = value;
            }
            break;
        case 'orbital-mechanics':
            if (param === 'orbitalSpeed') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'orbital') {
                        obj.userData.speed = value;
                    }
                });
            }
            break;
        case 'gravity-well':
            if (param === 'mass') {
                const mass = simulationObjects.find(obj => 
                    obj.material && obj.material.emissive
                );
                if (mass) {
                    mass.scale.set(value, value, value);
                }
            } else if (param === 'particleSpeed') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'particle') {
                        obj.userData.velocity.multiplyScalar(value / 0.3);
                    }
                });
            }
            break;
        case 'stellar-evolution':
            if (param === 'brightness') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'star') {
                        obj.material.emissiveIntensity = value;
                    }
                });
            }
            break;
    }
}

// 事件监听
document.getElementById('simulation-type').addEventListener('change', (e) => {
    initSimulation(e.target.value);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    initSimulation(currentSimulation);
});

document.getElementById('play-pause-btn').addEventListener('click', (e) => {
    isPlaying = !isPlaying;
    e.target.textContent = isPlaying ? '暂停' : '播放';
});

// 初始化
if (document.getElementById('lab-canvas')) {
    initLab();
}

