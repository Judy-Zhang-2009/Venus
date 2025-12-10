import * as THREE from 'three';
import { scene, simulationObjects } from './lab-core.js';

// 创建太阳光晕效果
export function createSunGlow(sunSize) {
    const glowPositions = new Float32Array([0, 0, 0]);
    const glowColors = new Float32Array([1.0, 0.667, 0.0]);
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
}

