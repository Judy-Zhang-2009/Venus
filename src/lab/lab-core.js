import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { clearSimulation } from './lab-utils.js';
import { initSolarSystem, updateSolarSystem } from './lab-solar-system.js';
import { initOrbitalMechanics, updateOrbitalMechanics } from './lab-orbital-mechanics.js';
import { initGravityWell, updateGravityWell } from './lab-gravity-well.js';
import { initStellarEvolution, updateStellarEvolution } from './lab-stellar-evolution.js';
import { initStarMap, updateStarMap } from './lab-star-map.js';
import { updateParameterControls } from './lab-controls.js';
import { getSimulationTypeFromURL, updateURLSimulationType } from './lab-url.js';

// 全局状态变量
export let scene, camera, renderer;
export let labelRenderer;
export let controls;
export let simulationObjects = [];
export let labelObjects = [];
export let animationId;
export let isPlaying = true;
export let currentSimulation = 'solar-system';

// 设置播放状态
export function setPlaying(value) {
    isPlaying = value;
}

// 初始化Three.js场景
export function initLab() {
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
    
    // 从URL参数读取模拟类型，如果不存在则使用默认值
    const urlSimulationType = getSimulationTypeFromURL();
    const initialSimulationType = urlSimulationType || 'solar-system';
    currentSimulation = initialSimulationType;
    
    // 如果URL中没有参数，则设置默认值到URL
    if (!urlSimulationType) {
        updateURLSimulationType(initialSimulationType);
    }
    
    // 同步选择器值
    const simulationTypeSelect = document.getElementById('simulation-type');
    if (simulationTypeSelect) {
        simulationTypeSelect.value = initialSimulationType;
    }
    
    // 初始化模拟
    initSimulation(initialSimulationType);
    
    // 开始动画循环
    animate();
    
    // 窗口大小改变时调整
    window.addEventListener('resize', onWindowResize);
}

export function onWindowResize() {
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

export function animate() {
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

/**
 * 初始化模拟
 * @param {string} type - 模拟类型
 */
export function initSimulation(type) {
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
        default:
            console.warn(`Unknown simulation type: ${type}, using solar-system`);
            currentSimulation = 'solar-system';
            initSolarSystem();
            break;
    }
    
    updateParameterControls();
}

// 更新模拟
export function updateSimulation() {
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

