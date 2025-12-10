import * as THREE from 'three';
import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { createLabel } from './lab-utils.js';
import { createVelocityArrow, updateArrowPosition, initArrowInteraction } from './lab-gravity-well-arrow.js';

/**
 * 初始化引力井模拟系统
 * 创建两个大球体（暗蓝色和暗绿色），实现牛顿引力作用及碰撞检测
 * 初始速度可通过滑块参数控制
 */
export function initGravityWell() {
    // 创建网格辅助平面，用于空间参考
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    gridHelper.userData = { type: 'grid' };
    scene.add(gridHelper);
    simulationObjects.push(gridHelper);
    
    // 从滑块读取初始速度值，如果不存在则使用默认值
    const initialSpeedInput = document.getElementById('initialSpeed');
    const initialSpeed = initialSpeedInput ? parseFloat(initialSpeedInput.value) : 0.1;
    
    // 创建第一个球体：暗蓝色
    const DARK_BLUE_COLOR = 0x1a3a5c;
    const BLUE_RADIUS = 2.0;
    const BLUE_MASS = 2.0;
    const BLUE_INITIAL_POSITION = new THREE.Vector3(-8, 0, 0);
    const blueBall = new THREE.Mesh(
        new THREE.SphereGeometry(BLUE_RADIUS, 32, 32),
        new THREE.MeshPhongMaterial({ 
            color: DARK_BLUE_COLOR,
            emissive: DARK_BLUE_COLOR,
            emissiveIntensity: 0.1
        })
    );
    blueBall.position.copy(BLUE_INITIAL_POSITION);
    const blueInitialVelocity = new THREE.Vector3(initialSpeed, 0, 0);
    blueBall.userData = {
        type: 'gravity-ball',
        color: 'blue',
        ballName: 'A',
        radius: BLUE_RADIUS,
        mass: BLUE_MASS,
        initialMass: BLUE_MASS,
        initialPosition: BLUE_INITIAL_POSITION.clone(),
        initialSpeed: initialSpeed,
        initialVelocity: blueInitialVelocity.clone(),
        velocity: blueInitialVelocity.clone()
    };
    scene.add(blueBall);
    simulationObjects.push(blueBall);
    
    // 添加A球标签
    const blueLabel = createLabel('A球', '#1a3a5c');
    blueLabel.position.set(0, -BLUE_RADIUS - 0.3, 0);
    blueBall.add(blueLabel);
    labelObjects.push(blueLabel);
    
    // 创建第二个球体：暗绿色
    const DARK_GREEN_COLOR = 0x2d5a3d;
    const GREEN_RADIUS = 1.5;
    const GREEN_MASS = 1.0;
    const GREEN_INITIAL_POSITION = new THREE.Vector3(8, 0, 0);
    const greenBall = new THREE.Mesh(
        new THREE.SphereGeometry(GREEN_RADIUS, 32, 32),
        new THREE.MeshPhongMaterial({ 
            color: DARK_GREEN_COLOR,
            emissive: DARK_GREEN_COLOR,
            emissiveIntensity: 0.1
        })
    );
    greenBall.position.copy(GREEN_INITIAL_POSITION);
    const greenInitialVelocity = new THREE.Vector3(-initialSpeed, 0, 0);
    greenBall.userData = {
        type: 'gravity-ball',
        color: 'green',
        ballName: 'B',
        radius: GREEN_RADIUS,
        mass: GREEN_MASS,
        initialMass: GREEN_MASS,
        initialPosition: GREEN_INITIAL_POSITION.clone(),
        initialSpeed: initialSpeed,
        initialVelocity: greenInitialVelocity.clone(),
        velocity: greenInitialVelocity.clone()
    };
    scene.add(greenBall);
    simulationObjects.push(greenBall);
    
    // 添加B球标签
    const greenLabel = createLabel('B球', '#2d5a3d');
    greenLabel.position.set(0, -GREEN_RADIUS - 0.3, 0);
    greenBall.add(greenLabel);
    labelObjects.push(greenLabel);
    
    // 创建速度箭头：为每个球体创建箭头，显示初始速度方向和大小
    const blueArrow = createVelocityArrow(blueBall, blueInitialVelocity);
    blueBall.userData.velocityArrow = blueArrow;
    
    const greenArrow = createVelocityArrow(greenBall, greenInitialVelocity);
    greenBall.userData.velocityArrow = greenArrow;
    
    // 初始化箭头交互系统（仅在首次初始化时调用）
    if (!scene.userData.arrowInteractionInitialized) {
        initArrowInteraction();
        scene.userData.arrowInteractionInitialized = true;
    }
}

/**
 * 重置引力井模拟状态
 * 重置位置，根据选项决定是否重置速度
 * 不重置质量和拖动点位置
 */
export function resetGravityWell() {
    const balls = simulationObjects.filter(obj => obj.userData.type === 'gravity-ball');
    if (balls.length !== 2) return;
    
    // 通过ballName区分A球和B球，确保正确重置
    const ballA = balls.find(obj => obj.userData.ballName === 'A');
    const ballB = balls.find(obj => obj.userData.ballName === 'B');
    
    if (!ballA || !ballB) return;
    
    // 获取是否重置速度的选项（默认不重置）
    const resetVelocity = scene.userData.gravityWellResetVelocity !== undefined 
        ? scene.userData.gravityWellResetVelocity 
        : false;
    
    // 恢复初始位置
    if (ballA.userData.initialPosition) {
        const initPosA = ballA.userData.initialPosition;
        ballA.position.x = initPosA.x;
        ballA.position.y = initPosA.y;
        ballA.position.z = initPosA.z;
    }
    
    if (ballB.userData.initialPosition) {
        const initPosB = ballB.userData.initialPosition;
        ballB.position.x = initPosB.x;
        ballB.position.y = initPosB.y;
        ballB.position.z = initPosB.z;
    }
    
    // 根据选项决定是否重置速度
    if (resetVelocity) {
        if (ballA.userData.initialVelocity) {
            ballA.userData.velocity.copy(ballA.userData.initialVelocity);
            // 更新拖动点位置以反映重置后的速度
            if (ballA.userData.velocityArrow) {
                updateArrowPosition(ballA.userData.velocityArrow, ballA, ballA.userData.initialVelocity);
            }
        }
        if (ballB.userData.initialVelocity) {
            ballB.userData.velocity.copy(ballB.userData.initialVelocity);
            // 更新拖动点位置以反映重置后的速度
            if (ballB.userData.velocityArrow) {
                updateArrowPosition(ballB.userData.velocityArrow, ballB, ballB.userData.initialVelocity);
            }
        }
    }
    
    // 不重置质量，保持当前质量设置
    // 如果不重置速度，拖动点位置保持不变
}

/**
 * 更新引力井模拟状态
 * 计算两个球体之间的牛顿引力作用，更新位置和速度
 * 实现碰撞检测：当球体接触时施加排斥力，确保球体永不交叉
 * 速度变化仅由力（引力和排斥力）决定，不应用自动衰减
 * 可选的碰撞阻尼可通过UI开关控制
 */
export function updateGravityWell() {
    const GRAVITATIONAL_CONSTANT = 0.05; // 引力常数，用于控制引力强度
    const REPULSION_CONSTANT = 2.0; // 排斥力常数，用于控制碰撞时的排斥力强度
    const TIME_STEP = 1.0; // 时间步长
    const MIN_DISTANCE = 0.01; // 最小距离阈值，避免除零错误
    
    // 获取阻尼开关状态（默认关闭）
    const dampingEnabled = scene.userData.gravityWellDamping !== undefined 
        ? scene.userData.gravityWellDamping 
        : false;
    
    // 获取两个球体对象
    const balls = simulationObjects.filter(obj => obj.userData.type === 'gravity-ball');
    if (balls.length !== 2) return;
    
    const ball1 = balls[0];
    const ball2 = balls[1];
    
    // 计算两个球体之间的距离向量
    const distanceVector = new THREE.Vector3();
    distanceVector.subVectors(ball2.position, ball1.position);
    const distance = Math.max(distanceVector.length(), MIN_DISTANCE); // 确保距离不为零
    
    // 计算碰撞箱距离：两个球体半径之和
    const collisionDistance = ball1.userData.radius + ball2.userData.radius;
    
    // 计算单位方向向量
    const direction = distanceVector.clone().normalize();
    
    // 初始化加速度向量
    const acceleration1 = new THREE.Vector3(0, 0, 0);
    const acceleration2 = new THREE.Vector3(0, 0, 0);
    
    // 碰撞检测：检查两个球体是否接触或重叠
    if (distance < collisionDistance) {
        // 接触或重叠：施加排斥力
        // 计算重叠深度
        const overlap = collisionDistance - distance;
        
        // 计算排斥力大小：F = k * overlap，与重叠深度成正比
        // 排斥力方向：从ball1指向ball2（ball1受到向外的力，ball2受到向内的力）
        const repulsionForceMagnitude = REPULSION_CONSTANT * overlap;
        
        // 计算加速度：a = F / m
        // ball1受到向外的力（与direction相反）
        const repulsionAccel1 = direction.clone().multiplyScalar(-repulsionForceMagnitude / ball1.userData.mass);
        // ball2受到向内的力（与direction相同）
        const repulsionAccel2 = direction.clone().multiplyScalar(repulsionForceMagnitude / ball2.userData.mass);
        
        acceleration1.add(repulsionAccel1);
        acceleration2.add(repulsionAccel2);
        
        // 可选的碰撞阻尼：仅在阻尼开关开启时应用
        if (dampingEnabled) {
            // 计算相对速度在法向量方向的分量，用于阻尼计算
            const relativeVelocity = new THREE.Vector3();
            relativeVelocity.subVectors(ball2.userData.velocity, ball1.userData.velocity);
            const velocityAlongNormal = relativeVelocity.dot(direction);
            
            // 如果球体正在靠近，施加阻尼以减少碰撞时的能量
            if (velocityAlongNormal < 0) {
                const dampingForce = velocityAlongNormal * 0.1; // 阻尼力与相对速度成正比
                const dampingAccel1 = direction.clone().multiplyScalar(-dampingForce / ball1.userData.mass);
                const dampingAccel2 = direction.clone().multiplyScalar(dampingForce / ball2.userData.mass);
                acceleration1.add(dampingAccel1);
                acceleration2.add(dampingAccel2);
            }
        }
    }
    
    // 牛顿引力作用：计算两个球体之间的引力
    // 仅在未接触时计算引力，避免与排斥力冲突
    if (distance >= collisionDistance) {
        // 引力大小：F = G * m1 * m2 / r^2
        const gravitationalForceMagnitude = GRAVITATIONAL_CONSTANT * ball1.userData.mass * ball2.userData.mass / (distance * distance);
        
        // 计算引力加速度：a = F / m
        // ball1受到指向ball2的引力（与direction相同）
        const gravitationalAccel1 = direction.clone().multiplyScalar(gravitationalForceMagnitude / ball1.userData.mass);
        // ball2受到指向ball1的引力（与direction相反）
        const gravitationalAccel2 = direction.clone().multiplyScalar(-gravitationalForceMagnitude / ball2.userData.mass);
        
        acceleration1.add(gravitationalAccel1);
        acceleration2.add(gravitationalAccel2);
    }
    
    // 更新速度：v = v + a * dt
    // 速度变化仅由力（引力和排斥力）决定，不应用自动衰减
    ball1.userData.velocity.add(acceleration1.clone().multiplyScalar(TIME_STEP));
    ball2.userData.velocity.add(acceleration2.clone().multiplyScalar(TIME_STEP));
    
    // 更新位置：x = x + v * dt
    ball1.position.add(ball1.userData.velocity.clone().multiplyScalar(TIME_STEP));
    ball2.position.add(ball2.userData.velocity.clone().multiplyScalar(TIME_STEP));
    
    // 更新箭头位置：箭头跟随球体移动（仅在未拖动时更新）
    // 箭头显示初始速度，而不是当前速度
    if (ball1.userData.velocityArrow && !ball1.userData.velocityArrow.userData.isDragging) {
        updateArrowPosition(ball1.userData.velocityArrow, ball1, ball1.userData.initialVelocity);
    }
    if (ball2.userData.velocityArrow && !ball2.userData.velocityArrow.userData.isDragging) {
        updateArrowPosition(ball2.userData.velocityArrow, ball2, ball2.userData.initialVelocity);
    }
    
    // 最终碰撞检查：确保更新位置后球体不会交叉
    const finalDistanceVector = new THREE.Vector3();
    finalDistanceVector.subVectors(ball2.position, ball1.position);
    const finalDistance = finalDistanceVector.length();
    
    if (finalDistance < collisionDistance) {
        // 如果仍然重叠，强制分离到接触位置
        const finalDirection = finalDistanceVector.clone().normalize();
        const finalOverlap = collisionDistance - finalDistance;
        const finalSeparation = finalDirection.clone().multiplyScalar(finalOverlap);
        const totalMass = ball1.userData.mass + ball2.userData.mass;
        const separation1 = finalSeparation.clone().multiplyScalar(-ball2.userData.mass / totalMass);
        const separation2 = finalSeparation.clone().multiplyScalar(ball1.userData.mass / totalMass);
        
        // 分离位置
        ball1.position.add(separation1);
        ball2.position.add(separation2);
        
        // 调整速度：移除沿法向量方向的相对速度分量，避免继续重叠
        const relativeVelocity = new THREE.Vector3();
        relativeVelocity.subVectors(ball2.userData.velocity, ball1.userData.velocity);
        const velocityAlongNormal = relativeVelocity.dot(finalDirection);
        
        // 如果球体正在靠近，调整速度使其分离
        if (velocityAlongNormal < 0) {
            const correctionFactor = -velocityAlongNormal * 0.5; // 速度修正系数
            const velocityCorrection1 = finalDirection.clone().multiplyScalar(-correctionFactor * ball2.userData.mass / totalMass);
            const velocityCorrection2 = finalDirection.clone().multiplyScalar(correctionFactor * ball1.userData.mass / totalMass);
            ball1.userData.velocity.add(velocityCorrection1);
            ball2.userData.velocity.add(velocityCorrection2);
        }
    }
}

