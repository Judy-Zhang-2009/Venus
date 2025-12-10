import * as THREE from 'three';
import { scene, simulationObjects } from './lab-core.js';
import { createMainStars, createBackgroundStars } from './lab-star-map-stars.js';

// 北京全年星空变化模拟
export function initStarMap() {
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
    createTimeLabel();
    
    // 初始化时间（当前日期，晚上8点）
    let currentDate = new Date();
    currentDate.setHours(20, 0, 0, 0);
    let dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // 主要星座和亮星数据
    const stars = getStarData();
    
    // 创建星星
    createMainStars(stars, dayOfYear, beijingLat, beijingLon);
    
    // 添加更多随机星星（背景星空）
    createBackgroundStars(dayOfYear, beijingLat, beijingLon);
    
    // 添加地平线
    createHorizon();
    
    // 存储时间数据
    scene.userData.starMapDate = currentDate;
    scene.userData.dayOfYear = dayOfYear;
    
    // 更新时间显示
    updateStarMapTime(currentDate);
}

// 创建时间显示标签
function createTimeLabel() {
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
}

// 获取星星数据
function getStarData() {
    return [
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
}


// 创建地平线
function createHorizon() {
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
}

// 计算地方恒星时（Local Sidereal Time）
export function calculateLST(dayOfYear, longitude) {
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
export function updateStarMapTime(date) {
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

export function updateStarMap() {
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

