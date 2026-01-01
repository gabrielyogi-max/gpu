import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

let camera, scene, renderer;
let controls;
let clock;

// Objects
let gridHelper;
let cityGroup;
let rainSystem;
let rainPositions;
let rainVelocities;

init();

async function init() {
    const container = document.getElementById('canvas-container');
    const statusText = document.getElementById('status');
    clock = new THREE.Clock();

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510); // Slightly lighter black for depth
    scene.fog = new THREE.FogExp2(0x050510, 0.025); // Dense fog

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 20); 

    // 3. Renderer Setup (WebGPU -> WebGL Fallback)
    try {
        if (navigator.gpu) {
            renderer = new WebGPURenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            console.log('WebGPURenderer initialized.');
            statusText.innerText = 'SYSTEM ONLINE :: WEBGPU';
        } else {
            throw new Error('WebGPU not supported');
        }
    } catch (e) {
        console.warn('Falling back to WebGLRenderer:', e);
        statusText.innerText = 'SYSTEM ONLINE :: WEBGL MODE';
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    // 4. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    
    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5); 
    scene.add(hemiLight);

    const blueLight = new THREE.PointLight(0x00ffff, 800, 100);
    blueLight.position.set(20, 20, 20);
    scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xff00ff, 800, 100);
    pinkLight.position.set(-20, 10, -20);
    scene.add(pinkLight);
    
    // 6. Environment
    createEnvironment();
    createRain();

    // 7. Events
    window.addEventListener('resize', onWindowResize);
    
    // 8. Loop
    renderer.setAnimationLoop(animate);
}

function createEnvironment() {
    // Infinite Grid
    const gridSize = 2000;
    const gridDivisions = 300;
    const gridColorCenter = 0xff00ff; 
    const gridColorGrid = 0x00aaff;   
    
    const grid = new THREE.GridHelper(gridSize, gridDivisions, gridColorCenter, gridColorGrid);
    grid.position.y = -0.1;
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    scene.add(grid);

    // Buildings
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0); 
    
    const material = new THREE.MeshStandardMaterial({
        color: 0x050505,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x00ffff,
        emissiveIntensity: 0.4
    });

    const count = 2000;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    
    const dummy = new THREE.Object3D();
    const _color = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 1000; 
        
        if (Math.abs(x) < 8) continue; // Wider path

        const sy = Math.random() * 30 + 5; 
        
        dummy.position.set(x, 0, z);
        dummy.scale.set(Math.random() * 5 + 2, sy, Math.random() * 5 + 2);
        dummy.updateMatrix();
        
        mesh.setMatrixAt(i, dummy.matrix);
        
        if (Math.random() > 0.9) {
             mesh.setColorAt(i, _color.setHex(0xff00ff)); 
        } else if (Math.random() > 0.9) {
             mesh.setColorAt(i, _color.setHex(0x00ffff));
        } else {
             mesh.setColorAt(i, _color.setHex(0x111111));
        }
    }

    scene.add(mesh);
    cityGroup = mesh;
}

function createRain() {
    const rainCount = 30000; // DOUBLE THE RAIN
    const rainGeo = new THREE.BufferGeometry();
    rainPositions = new Float32Array(rainCount * 3);
    rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        rainPositions[i * 3] = (Math.random() - 0.5) * 400; 
        rainPositions[i * 3 + 1] = Math.random() * 200;     
        rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 400; 
        
        rainVelocities[i] = 1.0 + Math.random() * 1.5; // Faster rain
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    
    const rainMat = new THREE.PointsMaterial({
        color: 0x00ffff, // CYAN RAIN
        size: 0.4,       // BIGGER DROPS
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const time = clock.getElapsedTime();

    // Cinematic Camera Movement - FASTER
    camera.position.z -= 0.8; // High speed
    
    if (camera.position.z < -400) {
        camera.position.z = 400;
    }

    camera.position.x = Math.sin(time * 0.3) * 5; // Sway
    camera.position.y = 5 + Math.sin(time * 0.5) * 2; // Bob

    // Look slightly ahead
    camera.lookAt(0, 5, camera.position.z - 100);

    // Animate Rain
    const positions = rainSystem.geometry.attributes.position.array;
    for (let i = 0; i < 30000; i++) {
        positions[i * 3 + 1] -= rainVelocities[i];

        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 200;
            // Lock rain to camera X/Z to simulate infinite storm
            positions[i * 3] = camera.position.x + (Math.random() - 0.5) * 300;
            positions[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 300;
        }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}
