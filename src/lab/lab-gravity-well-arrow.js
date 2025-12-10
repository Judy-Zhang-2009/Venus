import * as THREE from 'three';
import { scene, simulationObjects, camera, renderer, controls } from './lab-core.js';

/**
 * 创建速度拖动点
 * 拖动点位置表示初始速度方向和大小
 * @param {THREE.Mesh} ball - 球体对象
 * @param {THREE.Vector3} initialVelocity - 初始速度向量
 * @returns {THREE.Group} 拖动点组对象
 */
export function createVelocityArrow(ball, initialVelocity) {
    const DRAG_POINT_COLOR = 0xffff00; // 拖动点颜色：黄色
    const ARROW_SCALE = 10.0; // 速度缩放系数，将速度值转换为视觉长度
    
    // 创建拖动点组
    const arrowGroup = new THREE.Group();
    arrowGroup.userData = {
        type: 'velocity-arrow',
        ball: ball,
        isDragging: false
    };
    
    // 计算拖动点方向（归一化速度向量）
    // 如果速度为零，使用默认方向（X轴正方向）
    const velocityLength = initialVelocity.length();
    const direction = velocityLength > 0.001 
        ? initialVelocity.clone().normalize() 
        : new THREE.Vector3(1, 0, 0);
    
    // 计算拖动点距离，确保最小距离以便可见
    const MIN_DISTANCE = 2.0; // 最小拖动点距离
    const rawLength = velocityLength * ARROW_SCALE;
    const length = Math.max(rawLength, MIN_DISTANCE);
    
    // 创建可拖动的球体（拖动点）
    const dragSphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const dragSphereMaterial = new THREE.MeshBasicMaterial({
        color: DRAG_POINT_COLOR,
        transparent: true,
        opacity: 0.8
    });
    const dragSphere = new THREE.Mesh(dragSphereGeometry, dragSphereMaterial);
    dragSphere.position.set(
        direction.x * length,
        direction.y * length,
        direction.z * length
    );
    dragSphere.userData = {
        type: 'arrow-drag-handle',
        arrowGroup: arrowGroup
    };
    arrowGroup.add(dragSphere);
    
    // 将拖动点组添加到场景
    scene.add(arrowGroup);
    simulationObjects.push(arrowGroup);
    
    // 更新拖动点位置：拖动点起点位于球心
    updateArrowPosition(arrowGroup, ball);
    
    return arrowGroup;
}

/**
 * 更新箭头位置和方向
 * @param {THREE.Group} arrowGroup - 箭头组对象
 * @param {THREE.Mesh} ball - 球体对象
 * @param {THREE.Vector3} velocity - 速度向量（可选，如果不提供则从ball.userData读取）
 */
export function updateArrowPosition(arrowGroup, ball, velocity = null) {
    if (!arrowGroup || !ball) return;
    
    const ARROW_SCALE = 10.0;
    
    // 获取速度向量
    let vel;
    if (velocity) {
        vel = velocity.clone();
    } else {
        // 从球体的初始速度或当前速度获取
        if (ball.userData.initialVelocity) {
            vel = ball.userData.initialVelocity.clone();
        } else if (ball.userData.velocity) {
            vel = ball.userData.velocity.clone();
        } else {
            vel = new THREE.Vector3(0, 0, 0);
        }
    }
    
    // 计算箭头方向
    const direction = vel.length() > 0.001 ? vel.clone().normalize() : new THREE.Vector3(1, 0, 0);
    
    // 计算箭头长度，确保最小长度以便可见
    const MIN_ARROW_LENGTH = 2.0; // 最小箭头长度
    const rawLength = vel.length() * ARROW_SCALE;
    const length = Math.max(rawLength, MIN_ARROW_LENGTH);
    
    // 更新拖动点位置：拖动点起点位于球心
    arrowGroup.position.copy(ball.position);
    
    // 更新拖动球体位置（相对于拖动点组的位置）
    const dragSphere = arrowGroup.children.find(child => child.userData.type === 'arrow-drag-handle');
    if (dragSphere) {
        dragSphere.position.set(
            direction.x * length,
            direction.y * length,
            direction.z * length
        );
    }
}

/**
 * 初始化箭头交互系统
 * 设置鼠标事件监听器，实现箭头拖动功能
 */
export function initArrowInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedArrow = null;
    let isDragging = false;
    
    const canvas = renderer.domElement;
    
    /**
     * 将鼠标坐标转换为归一化设备坐标
     */
    function onMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    /**
     * 鼠标按下事件：检测是否点击了箭头拖动球体
     */
    function onMouseDown(event) {
        onMouseMove(event);
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(
            simulationObjects.filter(obj => obj.userData.type === 'velocity-arrow'),
            true // 递归检查子对象
        );
        
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            
            // 查找拖动球体或箭头组
            let dragHandle = null;
            let arrowGroup = null;
            
            if (intersectedObject.userData.type === 'arrow-drag-handle') {
                dragHandle = intersectedObject;
                arrowGroup = intersectedObject.userData.arrowGroup;
            } else if (intersectedObject.parent && intersectedObject.parent.userData.type === 'velocity-arrow') {
                arrowGroup = intersectedObject.parent;
                dragHandle = arrowGroup.children.find(child => child.userData.type === 'arrow-drag-handle');
            }
            
            if (arrowGroup && dragHandle) {
                selectedArrow = arrowGroup;
                isDragging = true;
                arrowGroup.userData.isDragging = true;
                
                // 禁用轨道控制器，避免拖动时相机移动
                if (controls) {
                    controls.enableRotate = false;
                    controls.enablePan = false;
                    controls.enableZoom = false;
                }
                
                event.preventDefault();
            }
        }
    }
    
    /**
     * 鼠标移动事件：拖动箭头
     */
    function onMouseMoveDrag(event) {
        if (!isDragging || !selectedArrow) return;
        
        onMouseMove(event);
        
        const arrowGroup = selectedArrow;
        const ball = arrowGroup.userData.ball;
        if (!ball) return;
        
        // 创建从相机到鼠标位置的射线
        raycaster.setFromCamera(mouse, camera);
        
        // 计算球体中心到相机的向量
        const ballToCamera = new THREE.Vector3();
        ballToCamera.subVectors(camera.position, ball.position);
        
        // 创建垂直于相机方向的平面
        const planeNormal = ballToCamera.normalize();
        const planePoint = ball.position.clone();
        
        // 计算射线与平面的交点
        const plane = new THREE.Plane(planeNormal, -planeNormal.dot(planePoint));
        const intersectionPoint = new THREE.Vector3();
        const hasIntersection = raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        if (hasIntersection) {
            // 计算从球体中心到交点的向量
            const ballToIntersection = new THREE.Vector3();
            ballToIntersection.subVectors(intersectionPoint, ball.position);
            
            // 计算速度向量（考虑箭头缩放）
            const ARROW_SCALE = 10.0;
            let velocity = ballToIntersection.clone().multiplyScalar(1.0 / ARROW_SCALE);
            
            // 限制速度大小（最大0.5）
            const maxSpeed = 0.5;
            const velocityLength = velocity.length();
            if (velocityLength > maxSpeed) {
                velocity.normalize().multiplyScalar(maxSpeed);
            }
            
            // 确保速度向量不为零（至少有一个最小速度，避免箭头消失）
            const minSpeed = 0.01;
            if (velocityLength < minSpeed && velocityLength > 0.001) {
                velocity.normalize().multiplyScalar(minSpeed);
            }
            
            // 更新球体的初始速度（只更新当前拖动的球体）
            // 创建新的向量对象，确保完全独立
            ball.userData.initialVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
            ball.userData.initialSpeed = ball.userData.initialVelocity.length();
            
            // 如果模拟正在运行，立即应用新的初始速度到当前速度
            // 这样用户可以看到实时效果
            ball.userData.velocity.copy(ball.userData.initialVelocity);
            
            // 更新箭头显示（实时更新，确保箭头跟随拖动）
            updateArrowPosition(arrowGroup, ball, ball.userData.initialVelocity);
        }
    }
    
    /**
     * 鼠标释放事件：结束拖动
     */
    function onMouseUp(event) {
        if (isDragging && selectedArrow) {
            selectedArrow.userData.isDragging = false;
            selectedArrow = null;
            isDragging = false;
            
            // 重新启用轨道控制器
            if (controls) {
                controls.enableRotate = true;
                controls.enablePan = true;
                controls.enableZoom = true;
            }
        }
    }
    
    // 添加事件监听器
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMoveDrag);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp); // 鼠标离开画布时也结束拖动
    
    // 返回清理函数
    return function cleanup() {
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMoveDrag);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseleave', onMouseUp);
    };
}

