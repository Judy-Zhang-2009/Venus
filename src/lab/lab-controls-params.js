import * as THREE from 'three';
import { currentSimulation, scene, simulationObjects, labelObjects, camera, controls } from './lab-core.js';
import { calculateLST, updateStarMapTime } from './lab-star-map.js';

// 更新模拟参数
export function updateSimulationParameter(param, value) {
    switch(currentSimulation) {
        case 'solar-system':
            updateSolarSystemParameter(param, value);
            break;
        case 'orbital-mechanics':
            updateOrbitalMechanicsParameter(param, value);
            break;
        case 'gravity-well':
            updateGravityWellParameter(param, value);
            break;
        case 'stellar-evolution':
            updateStellarEvolutionParameter(param, value);
            break;
        case 'star-map':
            updateStarMapParameter(param, value);
            break;
    }
}

function updateSolarSystemParameter(param, value) {
    if (param === 'speed') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'planet') {
                obj.userData.speed = value * 0.01;
            }
        });
    } else if (param === 'cameraDistance') {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const currentDistance = camera.position.length();
        const newDistance = value;
        camera.position.multiplyScalar(newDistance / currentDistance);
        if (controls) {
            controls.update();
        }
    }
}

function updateOrbitalMechanicsParameter(param, value) {
    if (param === 'orbitalSpeed') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'orbital') {
                obj.userData.speed = value;
            }
        });
    }
}

function updateGravityWellParameter(param, value) {
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
}

function updateStellarEvolutionParameter(param, value) {
    if (param === 'starAge') {
        simulationObjects.forEach(obj => {
            if (obj.userData.type === 'star') {
                obj.userData.age = value;
                obj.userData.manualAge = true;
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
}

function updateStarMapParameter(param, value) {
    if (param === 'dayOfYear' || param === 'hour') {
        const dayOfYearInput = document.getElementById('dayOfYear');
        const hourInput = document.getElementById('hour');
        const dayOfYear = dayOfYearInput ? Math.floor(parseFloat(dayOfYearInput.value)) : (scene.userData.dayOfYear || 1);
        const hour = hourInput ? Math.floor(parseFloat(hourInput.value)) : 20;
        
        const currentDate = new Date();
        currentDate.setMonth(0, 1);
        currentDate.setDate(dayOfYear);
        currentDate.setHours(hour, 0, 0, 0);
        
        scene.userData.starMapDate = currentDate;
        scene.userData.dayOfYear = dayOfYear;
        
        updateStarMapTime(currentDate);
        
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
                const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
                
                let az;
                const cosAz = (Math.sin(decRad) - Math.sin(beijingLat) * sinAlt) / 
                              (Math.cos(beijingLat) * Math.cos(alt));
                if (Math.abs(cosAz) <= 1) {
                    az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
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
                
                if (obj.userData.type === 'star' && obj.userData.mag < 2.0) {
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
}

