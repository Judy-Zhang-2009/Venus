import * as THREE from 'three';
import { scene, simulationObjects } from './lab-core.js';

/**
 * 创建恒星光晕效果
 * 光晕颜色与恒星颜色耦合，光晕半径与恒星实际半径直接耦合
 * 光晕半径计算公式：glowRadius = starRadius * GLOW_RADIUS_MULTIPLIER
 * @param {number} starRadius - 恒星当前半径（考虑缩放后的实际半径）
 * @param {number} starColor - 恒星颜色（十六进制RGB值）
 * @returns {THREE.Points} 光晕点对象
 */
export function createStarGlow(starRadius, starColor) {
    // 将十六进制颜色值转换为RGB分量（归一化到0-1范围）
    const r = ((starColor >> 16) & 0xff) / 255.0;
    const g = ((starColor >> 8) & 0xff) / 255.0;
    const b = (starColor & 0xff) / 255.0;
    
    const glowPositions = new Float32Array([0, 0, 0]);
    const glowColors = new Float32Array([r, g, b]);
    
    // 光晕半径倍数：光晕半径固定为恒星半径的5倍
    const GLOW_RADIUS_MULTIPLIER = 5.0;
    const glowRadius = starRadius * GLOW_RADIUS_MULTIPLIER;
    const glowSizes = new Float32Array([glowRadius]);
    
    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
    
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
    
    const glowMaterial = new THREE.RawShaderMaterial({
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
    
    const glow = new THREE.Points(glowGeometry, glowMaterial);
    glow.userData = { 
        type: 'star-glow', 
        baseRadius: glowRadius,
        starRadius: starRadius
    };
    scene.add(glow);
    simulationObjects.push(glow);
    
    return glow;
}

/**
 * 更新恒星光晕属性
 * 光晕颜色从恒星材质动态获取，确保颜色耦合
 * 光晕半径与恒星实际半径直接耦合，计算公式：glowRadius = starRadius * GLOW_RADIUS_MULTIPLIER
 * @param {THREE.Points} glow - 光晕点对象
 * @param {number} starRadius - 恒星当前实际半径（baseSize * scale.x，考虑缩放后的半径）
 * @param {number} starColor - 恒星当前颜色值（从材质emissive或color属性获取的十六进制RGB值）
 */
export function updateStarGlow(glow, starRadius, starColor) {
    if (!glow || !glow.userData || glow.userData.type !== 'star-glow') {
        return;
    }
    
    // 更新光晕颜色：将十六进制颜色值转换为RGB分量
    const r = ((starColor >> 16) & 0xff) / 255.0;
    const g = ((starColor >> 8) & 0xff) / 255.0;
    const b = (starColor & 0xff) / 255.0;
    
    const colorAttribute = glow.geometry.getAttribute('color');
    if (colorAttribute) {
        colorAttribute.array[0] = r;
        colorAttribute.array[1] = g;
        colorAttribute.array[2] = b;
        colorAttribute.needsUpdate = true;
    }
    
    // 更新光晕半径：与恒星实际半径直接耦合
    const GLOW_RADIUS_MULTIPLIER = 5.0;
    const glowRadius = starRadius * GLOW_RADIUS_MULTIPLIER;
    
    const sizeAttribute = glow.geometry.getAttribute('size');
    if (sizeAttribute) {
        sizeAttribute.array[0] = glowRadius;
        sizeAttribute.needsUpdate = true;
    }
    
    // 更新光晕对象的用户数据
    glow.userData.baseRadius = glowRadius;
    glow.userData.starRadius = starRadius;
}

