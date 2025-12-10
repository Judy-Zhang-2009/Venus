import * as THREE from 'three';
import { scene, simulationObjects } from './lab-core.js';

// 创建恒星光晕效果
export function createStarGlow(starSize, starColor, brightness = 0.5) {
    // 将颜色转换为RGB (0-1范围)
    const r = ((starColor >> 16) & 0xff) / 255.0;
    const g = ((starColor >> 8) & 0xff) / 255.0;
    const b = (starColor & 0xff) / 255.0;
    
    const glowPositions = new Float32Array([0, 0, 0]);
    const glowColors = new Float32Array([r, g, b]);
    // 光晕大小 = 恒星大小 * 亮度 * 倍数
    const glowSize = starSize * brightness * 5.0;
    const glowSizes = new Float32Array([glowSize]);
    
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
    glow.userData = { type: 'star-glow', baseSize: glowSize };
    scene.add(glow);
    simulationObjects.push(glow);
    
    return glow;
}

// 更新恒星光晕
export function updateStarGlow(glow, starSize, starColor, brightness) {
    if (!glow || !glow.userData || glow.userData.type !== 'star-glow') return;
    
    // 更新颜色
    const r = ((starColor >> 16) & 0xff) / 255.0;
    const g = ((starColor >> 8) & 0xff) / 255.0;
    const b = (starColor & 0xff) / 255.0;
    
    const colorAttribute = glow.geometry.getAttribute('color');
    colorAttribute.array[0] = r;
    colorAttribute.array[1] = g;
    colorAttribute.array[2] = b;
    colorAttribute.needsUpdate = true;
    
    // 更新大小：光晕半径 = 恒星大小 * 亮度 * 倍数
    const glowSize = starSize * brightness * 5.0;
    const sizeAttribute = glow.geometry.getAttribute('size');
    sizeAttribute.array[0] = glowSize;
    sizeAttribute.needsUpdate = true;
    glow.userData.baseSize = glowSize;
}

