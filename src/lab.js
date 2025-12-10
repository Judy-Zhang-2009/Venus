import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

let scene, camera, renderer;
let labelRenderer;
let controls;
let simulationObjects = [];
let labelObjects = [];
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
    
    // 计算容器尺寸（减去padding）
    const containerWidth = container.clientWidth - 32; // 减去左右padding (1rem * 2 = 32px)
    const containerHeight = Math.min(container.clientHeight - 32, window.innerHeight * 0.8);
    
    // 创建相机
    const aspect = containerWidth / containerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 20, 80); // 调整初始视角以便更好地观察太阳系
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以提高性能
    
    // 创建CSS2D标签渲染器
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(containerWidth, containerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    
    // 添加轨道控制器（鼠标控制视角）
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; // 启用阻尼效果，使旋转更平滑
    controls.dampingFactor = 0.05;
    controls.enableZoom = true; // 允许缩放
    controls.enablePan = true; // 允许平移
    controls.minDistance = 10; // 最小缩放距离
    controls.maxDistance = 200; // 最大缩放距离
    controls.autoRotate = false; // 不自动旋转
    controls.rotateSpeed = 0.5; // 旋转速度
    controls.zoomSpeed = 1.0; // 缩放速度
    controls.panSpeed = 0.8; // 平移速度
    
    // 初始化模拟
    initSimulation('solar-system');
    
    // 开始动画循环
    animate();
    
    // 窗口大小改变时调整
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const canvas = document.getElementById('lab-canvas');
    const container = canvas.parentElement;
    
    // 计算容器尺寸（减去padding）
    const containerWidth = container.clientWidth - 32;
    const containerHeight = Math.min(container.clientHeight - 32, window.innerHeight * 0.8);
    
    camera.aspect = containerWidth / containerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerWidth, containerHeight);
    if (labelRenderer) {
        labelRenderer.setSize(containerWidth, containerHeight);
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // 更新控制器（需要每帧调用以应用阻尼效果）
    if (controls) {
        controls.update();
    }
    
    if (isPlaying) {
        updateSimulation();
    }
    
    renderer.render(scene, camera);
    if (labelRenderer) {
        labelRenderer.render(scene, camera);
    }
}

// 创建文字标签
function createLabel(text, color = '#ffffff') {
    const div = document.createElement('div');
    div.className = 'planet-label';
    div.textContent = text;
    div.style.color = color;
    div.style.fontSize = '14px';
    div.style.fontWeight = '600';
    div.style.textShadow = '0 0 10px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.8)';
    div.style.pointerEvents = 'none';
    div.style.userSelect = 'none';
    const label = new CSS2DObject(div);
    return label;
}

// 清除当前模拟
function clearSimulation() {
    // 先移除标签（需要从父对象中移除）
    labelObjects.forEach(label => {
        if (label.parent) {
            label.parent.remove(label);
        }
        scene.remove(label);
    });
    labelObjects = [];
    
    // 移除模拟对象
    simulationObjects.forEach(obj => {
        // 如果对象有子对象（如标签），先移除子对象
        if (obj.children) {
            obj.children.forEach(child => {
                if (child.isCSS2DObject) {
                    obj.remove(child);
                }
            });
        }
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    simulationObjects = [];
    
    // 移除说明文字
    const note = document.getElementById('solar-system-note');
    if (note) {
        note.remove();
    }
    
    // 移除时间标签
    const timeLabel = document.getElementById('star-map-time');
    if (timeLabel) {
        timeLabel.remove();
    }
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
        case 'star-map':
            initStarMap();
            break;
    }
    
    updateParameterControls();
}

// 太阳系模拟
function initSolarSystem() {
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
    
    // 创建太阳（精细化建模，64分段）
    const sunSize = sizeScale.sun;
    const sunGeometry = new THREE.SphereGeometry(sunSize, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = { type: 'sun' };
    sun.visible = true; // 暂时隐藏太阳实体，只显示光晕
    scene.add(sun);
    simulationObjects.push(sun);
    
    // 添加太阳单层光晕（伪体积光效果）
    // 使用Points实现从内到外逐渐透明的渐变效果
    const glowPositions = new Float32Array([0, 0, 0]); // 太阳位置在原点
    const glowColors = new Float32Array([1.0, 0.667, 0.0]); // #ffaa00
    const glowSizes = new Float32Array([sunSize * 7.0]);
    
    const sunGlowGeometry = new THREE.BufferGeometry();
    sunGlowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    sunGlowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    sunGlowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
    
    const glowVertexShader = `
        precision highp float;
        precision highp int;
        attribute vec3 position;
        attribute float size;
        attribute vec3 color;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uBrightness;
        uniform float uStarSize;
        uniform highp float uScale;
        varying vec3 vColor;
        varying highp float vDepth;
        varying highp float vPointSize;
        varying highp float vDepthRaw;
        void main() {
            vColor = color * uBrightness;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float finalSize = size * uStarSize;
            
            highp float depthRaw = mvPosition.z;
            vDepthRaw = depthRaw;
            highp float depth = abs(depthRaw);
            highp float depthScaled = depth * uScale;
            
            highp float minDepthScaled = max(depthScaled, 1.0);
            highp float minDepth = minDepthScaled / uScale;
            
            highp float pointSize = finalSize * (300.0 / minDepth);
            vPointSize = pointSize;
            
            gl_PointSize = clamp(pointSize, 1.0, 2048.0);
            gl_Position = projectionMatrix * mvPosition;
            vDepth = depth;
        }
    `;
    
    const glowFragmentShader = `
        precision highp float;
        precision highp int;
        varying vec3 vColor;
        varying highp float vDepth;
        varying highp float vPointSize;
        varying highp float vDepthRaw;
        uniform highp float uScale;
        
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            highp float dist = length(coord);
            highp float radius = 0.5;
            
            highp float viewDepth = abs(vDepthRaw);
            highp float viewRadius = (vPointSize * 0.5) * viewDepth / 300.0;
            
            highp float viewDist = dist * viewRadius * 2.0;
            
            highp float sphereDepthOffset = sqrt(max(viewRadius * viewRadius - viewDist * viewDist, 0.0));
            
            highp float finalViewDepth;
            if (vDepthRaw < 0.0) {
                finalViewDepth = vDepthRaw + sphereDepthOffset;
            } else {
                finalViewDepth = vDepthRaw - sphereDepthOffset;
            }
            
            highp float near = 0.000000001;
            highp float far = 100000.0;
            highp float viewZ = finalViewDepth;
            
            highp float alpha = 1.0 - smoothstep(0.0, radius, dist);
            highp float glow = 1.0 + (1.0 - dist * 2.0) * 0.5;
            vec3 finalColor = vColor * glow;
            gl_FragColor = vec4(finalColor, alpha * 0.6);
        }
    `;
    
    const sunGlowMaterial = new THREE.RawShaderMaterial({
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        uniforms: {
            uBrightness: { value: 1.0 },
            uStarSize: { value: 1.0 },
            uScale: { value: 1000000000.0 }
        }
    });
    
    const sunGlow = new THREE.Points(sunGlowGeometry, sunGlowMaterial);
    scene.add(sunGlow);
    simulationObjects.push(sunGlow);
    
    // 添加太阳标签
    const sunLabel = createLabel('太阳', '#ffd700');
    sunLabel.position.set(0, -sunSize - 0.5, 0);
    sun.add(sunLabel);
    labelObjects.push(sunLabel);
    
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
    
    planets.forEach((planet, index) => {
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
            angle: (index * Math.PI * 2) / planets.length,
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
    });
    
    // 创建小行星带
    const asteroidBeltInner = distanceScale.asteroidBelt.inner * distanceMultiplier;
    const asteroidBeltOuter = distanceScale.asteroidBelt.outer * distanceMultiplier;
    const asteroidCount = 200;
    
    for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = asteroidBeltInner + Math.random() * (asteroidBeltOuter - asteroidBeltInner);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = (Math.random() - 0.5) * 2; // 随机高度
        
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
    [asteroidBeltInner, asteroidBeltOuter].forEach((radius, idx) => {
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
    
    // 添加右下角说明文字
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

// 轨道力学模拟
function initOrbitalMechanics() {
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

// 引力井模拟
function initGravityWell() {
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

// 北京全年星空变化模拟
function initStarMap() {
    // 北京坐标：纬度 39.9042°N, 经度 116.4074°E
    const beijingLat = 39.9042 * Math.PI / 180; // 转换为弧度
    const beijingLon = 116.4074 * Math.PI / 180;
    
    // 创建天球（星空背景）
    const sphereGeometry = new THREE.SphereGeometry(50, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x000011,
        side: THREE.BackSide
    });
    const skySphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(skySphere);
    simulationObjects.push(skySphere);
    
    // 创建时间显示标签
    const timeLabelDiv = document.createElement('div');
    timeLabelDiv.id = 'star-map-time';
    timeLabelDiv.style.position = 'absolute';
    timeLabelDiv.style.top = '20px';
    timeLabelDiv.style.left = '20px';
    timeLabelDiv.style.color = '#ffffff';
    timeLabelDiv.style.fontSize = '18px';
    timeLabelDiv.style.fontWeight = '600';
    timeLabelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    timeLabelDiv.style.padding = '10px 15px';
    timeLabelDiv.style.borderRadius = '8px';
    timeLabelDiv.style.pointerEvents = 'none';
    timeLabelDiv.style.userSelect = 'none';
    const canvasContainer = document.getElementById('lab-canvas').parentElement;
    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(timeLabelDiv);
    
    // 初始化时间（当前日期，晚上8点）
    let currentDate = new Date();
    currentDate.setHours(20, 0, 0, 0);
    let dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // 主要星座和亮星数据（简化版，包含主要亮星）
    const stars = [
        // 大熊座（北斗七星）
        { name: '天枢', ra: 11.062, dec: 61.751, mag: 1.8, color: 0xffffff },
        { name: '天璇', ra: 11.032, dec: 56.382, mag: 2.4, color: 0xffffff },
        { name: '天玑', ra: 11.897, dec: 53.695, mag: 2.5, color: 0xffffff },
        { name: '天权', ra: 12.257, dec: 57.033, mag: 3.3, color: 0xaaaaaa },
        { name: '玉衡', ra: 13.420, dec: 55.960, mag: 1.8, color: 0xffffff },
        { name: '开阳', ra: 13.399, dec: 54.925, mag: 2.2, color: 0xffffff },
        { name: '摇光', ra: 13.792, dec: 49.313, mag: 1.9, color: 0xffffff },
        // 小熊座（北极星）
        { name: '北极星', ra: 2.530, dec: 89.264, mag: 2.0, color: 0xffffaa },
        // 猎户座
        { name: '参宿四', ra: 5.919, dec: 7.407, mag: 0.5, color: 0xff6666 },
        { name: '参宿七', ra: 5.242, dec: -8.202, mag: 0.1, color: 0xffffff },
        { name: '参宿五', ra: 5.418, dec: -1.202, mag: 1.6, color: 0xffffff },
        // 天狼星
        { name: '天狼星', ra: 6.752, dec: -16.716, mag: -1.5, color: 0xffffff },
        // 织女星
        { name: '织女星', ra: 18.616, dec: 38.784, mag: 0.0, color: 0xaaaaff },
        // 牛郎星
        { name: '牛郎星', ra: 19.846, dec: 8.868, mag: 0.8, color: 0xffffff },
        // 天津四
        { name: '天津四', ra: 20.690, dec: 45.280, mag: 1.3, color: 0xffffff },
        // 大角星
        { name: '大角星', ra: 14.261, dec: 19.182, mag: -0.1, color: 0xffffaa },
        // 心宿二
        { name: '心宿二', ra: 16.490, dec: -26.432, mag: 1.0, color: 0xff6666 },
        // 角宿一
        { name: '角宿一', ra: 13.420, dec: -11.161, mag: 1.0, color: 0xffffff }
    ];
    
    // 创建星星
    stars.forEach(star => {
        // 将赤经赤纬转换为3D坐标
        const raRad = star.ra * Math.PI / 12; // 赤经转换为弧度（小时转弧度）
        const decRad = star.dec * Math.PI / 180; // 赤纬转换为弧度
        
        // 计算星星在天空中的位置（考虑观测地点和时间）
        const localSiderealTime = calculateLST(dayOfYear, beijingLon);
        const hourAngle = localSiderealTime - star.ra;
        const hourAngleRad = hourAngle * Math.PI / 12;
        
        // 计算高度角和方位角
        const sinAlt = Math.sin(beijingLat) * Math.sin(decRad) + 
                      Math.cos(beijingLat) * Math.cos(decRad) * Math.cos(hourAngleRad);
        const alt = Math.asin(sinAlt);
        const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                      (Math.cos(beijingLat) * Math.cos(alt));
        const az = Math.acos(cosAz);
        
        // 转换为3D坐标（天球坐标系）
        const radius = 45;
        const x = radius * Math.cos(alt) * Math.sin(az);
        const y = radius * Math.sin(alt);
        const z = radius * Math.cos(alt) * Math.cos(az);
        
        // 根据星等调整大小
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
        if (star.mag < 2.0) { // 只显示较亮的星星标签
            const starLabel = createLabel(star.name, '#ffffff');
            starLabel.position.set(x * 1.05, y * 1.05, z * 1.05);
            scene.add(starLabel);
            labelObjects.push(starLabel);
        }
    });
    
    // 添加更多随机星星（背景星空）
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
    
    // 添加地平线
    const horizonGeometry = new THREE.RingGeometry(45, 50, 64);
    const horizonMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    horizon.rotation.x = Math.PI / 2;
    horizon.position.y = 0;
    scene.add(horizon);
    simulationObjects.push(horizon);
    
    // 存储时间数据
    scene.userData.starMapDate = currentDate;
    scene.userData.dayOfYear = dayOfYear;
    
    // 更新时间显示
    updateStarMapTime(currentDate);
}

// 计算地方恒星时（Local Sidereal Time）
function calculateLST(dayOfYear, longitude) {
    // 简化计算：基于儒略日
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const daysSinceJan1 = dayOfYear;
    
    // 计算格林威治恒星时
    const GMST = 18.697374558 + 24.06570982441908 * daysSinceJan1;
    const GMSTHours = GMST % 24;
    
    // 转换为地方恒星时
    const LST = GMSTHours + longitude * 12 / Math.PI;
    return LST % 24;
}

// 更新星空时间显示
function updateStarMapTime(date) {
    const timeLabel = document.getElementById('star-map-time');
    if (timeLabel) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        timeLabel.textContent = `北京星空 - ${year}年${month}月${day}日 ${hours}:${minutes}`;
    }
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
        case 'star-map':
            updateStarMap();
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

function updateStellarEvolution() {
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

function updateStarMap() {
    // 星空模拟不需要每帧更新，时间变化通过参数控制
    // 这里可以添加星星闪烁效果
    simulationObjects.forEach(obj => {
        if (obj.userData.type === 'star' || obj.userData.type === 'background-star') {
            // 轻微的闪烁效果
            const twinkle = 0.8 + Math.sin(Date.now() * 0.001 + obj.position.x) * 0.2;
            obj.material.emissiveIntensity = twinkle * 0.5;
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
            addButtonControl(controlsContainer, 'resetParticles', '重置粒子');
            break;
        case 'stellar-evolution':
            addRangeControl(controlsContainer, 'starAge', '恒星年龄', 0, 10, 0, 0.1);
            addRangeControl(controlsContainer, 'brightness', '亮度', 0.3, 1, 0.5, 0.1);
            break;
        case 'star-map':
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 0);
            const dayOfYear = Math.floor((today - startOfYear) / 1000 / 60 / 60 / 24);
            const currentDay = scene.userData.dayOfYear || dayOfYear;
            const currentHour = scene.userData.starMapDate ? scene.userData.starMapDate.getHours() : 20;
            addRangeControl(controlsContainer, 'dayOfYear', '一年中的第几天', 1, 365, currentDay, 1);
            addRangeControl(controlsContainer, 'hour', '时间（小时）', 0, 23, currentHour, 1);
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

function addButtonControl(container, id, label) {
    const item = document.createElement('div');
    item.className = 'parameter-item';
    
    const button = document.createElement('button');
    button.id = id;
    button.className = 'btn btn-outline';
    button.textContent = label;
    button.style.width = '100%';
    button.style.marginTop = '10px';
    
    button.addEventListener('click', () => {
        updateSimulationParameter(id, 1);
    });
    
    item.appendChild(button);
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
                // 更新相机距离时，保持当前视角方向
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                const currentDistance = camera.position.length();
                const newDistance = value;
                camera.position.multiplyScalar(newDistance / currentDistance);
                if (controls) {
                    controls.update();
                }
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
                const mass = simulationObjects.find(obj => obj.userData.type === 'central-mass');
                if (mass) {
                    mass.userData.mass = value;
                    mass.scale.set(value, value, value);
                }
            } else if (param === 'particleSpeed') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'particle') {
                        const currentSpeed = obj.userData.velocity.length();
                        if (currentSpeed > 0) {
                            obj.userData.velocity.normalize().multiplyScalar(value);
                        }
                    }
                });
            } else if (param === 'resetParticles') {
                // 重置粒子位置和速度
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'particle') {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 15 + Math.random() * 5;
                        obj.position.set(
                            Math.cos(angle) * distance,
                            0,
                            Math.sin(angle) * distance
                        );
                        obj.userData.velocity.set(
                            -Math.sin(angle) * 0.3,
                            0,
                            Math.cos(angle) * 0.3
                        );
                    }
                });
            }
            break;
        case 'stellar-evolution':
            if (param === 'starAge') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'star') {
                        obj.userData.age = value;
                        obj.userData.manualAge = true; // 标记为用户手动设置
                        // 立即应用演化效果
                        const age = value;
                        if (age < 2) {
                            obj.userData.stage = 'main-sequence';
                            obj.material.color.setHex(0xffff00);
                            obj.material.emissive.setHex(0xffff00);
                            obj.scale.set(1, 1, 1);
                        } else if (age < 6) {
                            obj.userData.stage = 'red-giant';
                            obj.material.color.setHex(0xff6600);
                            obj.material.emissive.setHex(0xff6600);
                            const scale = 2 + (age - 2) * 0.5;
                            obj.scale.set(scale, scale, scale);
                        } else {
                            obj.userData.stage = 'white-dwarf';
                            obj.material.color.setHex(0xffffff);
                            obj.material.emissive.setHex(0xffffff);
                            const scale = Math.max(0.3, 4 - (age - 6) * 0.1);
                            obj.scale.set(scale, scale, scale);
                        }
                    }
                });
            } else if (param === 'brightness') {
                simulationObjects.forEach(obj => {
                    if (obj.userData.type === 'star') {
                        obj.material.emissiveIntensity = value;
                    }
                });
            }
            break;
        case 'star-map':
            if (param === 'dayOfYear' || param === 'hour') {
                // 获取当前参数值
                const dayOfYearInput = document.getElementById('dayOfYear');
                const hourInput = document.getElementById('hour');
                const dayOfYear = dayOfYearInput ? Math.floor(parseFloat(dayOfYearInput.value)) : (scene.userData.dayOfYear || 1);
                const hour = hourInput ? Math.floor(parseFloat(hourInput.value)) : 20;
                
                // 创建日期对象
                const currentDate = new Date();
                currentDate.setMonth(0, 1); // 设置为1月1日
                currentDate.setDate(dayOfYear);
                currentDate.setHours(hour, 0, 0, 0);
                
                scene.userData.starMapDate = currentDate;
                scene.userData.dayOfYear = dayOfYear;
                
                updateStarMapTime(currentDate);
                
                // 更新所有星星位置
                const beijingLat = 39.9042 * Math.PI / 180;
                const beijingLon = 116.4074 * Math.PI / 180;
                const localSiderealTime = calculateLST(dayOfYear, beijingLon);
                
                simulationObjects.forEach(obj => {
                    if ((obj.userData.type === 'star' || obj.userData.type === 'background-star') && obj.userData.ra !== undefined) {
                        const ra = obj.userData.ra;
                        const dec = obj.userData.dec;
                        
                        const hourAngle = localSiderealTime - ra;
                        const hourAngleRad = hourAngle * Math.PI / 12;
                        const decRad = dec * Math.PI / 180;
                        
                        const sinAlt = Math.sin(beijingLat) * Math.sin(decRad) + 
                                      Math.cos(beijingLat) * Math.cos(decRad) * Math.cos(hourAngleRad);
                        const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))); // 限制在有效范围内
                        
                        let az;
                        const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                                      (Math.cos(beijingLat) * Math.cos(alt));
                        if (Math.abs(cosAz) <= 1) {
                            az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
                            // 根据时角确定方位角象限
                            if (hourAngleRad < 0) {
                                az = 2 * Math.PI - az;
                            }
                        } else {
                            az = 0;
                        }
                        
                        const radius = 45;
                        const x = radius * Math.cos(alt) * Math.sin(az);
                        const y = radius * Math.sin(alt);
                        const z = radius * Math.cos(alt) * Math.cos(az);
                        
                        obj.position.set(x, y, z);
                        
                        // 更新标签位置（仅对主要星星）
                        if (obj.userData.type === 'star' && obj.userData.mag < 2.0) {
                            // 查找对应的标签
                            labelObjects.forEach(label => {
                                if (label.parent === obj || (label.position && 
                                    Math.abs(label.position.x - x * 1.05) < 0.1)) {
                                    label.position.set(x * 1.05, y * 1.05, z * 1.05);
                                }
                            });
                        }
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
    // 重置相机位置和控制器
    if (camera && controls) {
        if (currentSimulation === 'solar-system') {
            camera.position.set(0, 20, 80);
        } else {
            camera.position.set(0, 0, 50);
        }
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
    }
});

document.getElementById('play-pause-btn').addEventListener('click', (e) => {
    isPlaying = !isPlaying;
    e.target.textContent = isPlaying ? '暂停' : '播放';
});

// 初始化
if (document.getElementById('lab-canvas')) {
    initLab();
}

