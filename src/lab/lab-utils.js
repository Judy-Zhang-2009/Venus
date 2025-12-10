import { scene, simulationObjects, labelObjects } from './lab-core.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// 创建文字标签
export function createLabel(text, color = '#ffffff') {
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
export function clearSimulation() {
    // 先移除标签（需要从父对象中移除）
    labelObjects.forEach(label => {
        if (label.parent) {
            label.parent.remove(label);
        }
        scene.remove(label);
    });
    labelObjects.length = 0;
    
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
    simulationObjects.length = 0;
    
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

