import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer;
let controls;
let clock;
let rainSystem, rainPositions, rainVelocities;
let windowMeshes = [];

init();

async function init() {
    const container = document.getElementById('canvas-container');
    const statusText = document.getElementById('status');
    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x020208, 0.012);

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 30);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Post Processing - BLOOM
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2,   // strength (reduced)
        0.5,   // radius
        0.8    // threshold
    );
    composer.addPass(bloomPass);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;

    // Lighting
    scene.add(new THREE.AmbientLight(0x111122, 0.4));

    const cyanLight = new THREE.PointLight(0x00ffff, 1500, 200);
    cyanLight.position.set(30, 40, 20);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 1500, 200);
    magentaLight.position.set(-30, 30, -30);
    scene.add(magentaLight);

    const orangeLight = new THREE.PointLight(0xff6600, 1000, 150);
    orangeLight.position.set(0, 50, -100);
    scene.add(orangeLight);

    // Environment
    createGround();
    createOptimizedCity();
    createRain();

    statusText.innerText = 'SYSTEM ONLINE :: NEON CITY';

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

function createGround() {
    // Simple reflective ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({
            color: 0x080818,
            roughness: 0.2,
            metalness: 0.8
        })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Simple neon grid (using GridHelper - much more efficient!)
    const grid = new THREE.GridHelper(2000, 150, 0xff00ff, 0x00ffff);
    grid.position.y = 0.02;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    scene.add(grid);
}

function createOptimizedCity() {
    // OPTIMIZED: Use InstancedMesh for buildings
    const buildingCount = 800;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    const material = new THREE.MeshStandardMaterial({
        color: 0x0a0a18,
        roughness: 0.6,
        metalness: 0.4
    });

    const buildings = new THREE.InstancedMesh(geometry, material, buildingCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < buildingCount; i++) {
        const x = (Math.random() - 0.5) * 500;
        const z = (Math.random() - 0.5) * 1000;

        if (Math.abs(x) < 12) continue; // Road gap

        const width = Math.random() * 6 + 3;
        const height = Math.random() * 50 + 8;
        const depth = Math.random() * 6 + 3;

        dummy.position.set(x, 0, z);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();

        buildings.setMatrixAt(i, dummy.matrix);
    }
    scene.add(buildings);

    // OPTIMIZED: Windows as one big InstancedMesh
    const windowCount = 3000;
    const windowGeo = new THREE.PlaneGeometry(1.2, 2);
    const windowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const windows = new THREE.InstancedMesh(windowGeo, windowMat, windowCount);
    const windowColors = [0x00ffff, 0xff00ff, 0xffaa00, 0x00ff88, 0xff0066];
    const color = new THREE.Color();

    let windowIndex = 0;
    for (let i = 0; i < 150 && windowIndex < windowCount; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 800;

        if (Math.abs(x) < 12) continue;

        const buildingHeight = Math.random() * 40 + 10;
        const windowRows = Math.floor(buildingHeight / 5);

        for (let row = 0; row < windowRows && windowIndex < windowCount; row++) {
            if (Math.random() > 0.5) continue; // Some windows off

            dummy.position.set(x + (Math.random() - 0.5) * 4, row * 5 + 3, z + 3);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();

            windows.setMatrixAt(windowIndex, dummy.matrix);
            windows.setColorAt(windowIndex, color.setHex(windowColors[Math.floor(Math.random() * windowColors.length)]));
            windowIndex++;
        }
    }
    scene.add(windows);
    windowMeshes.push(windows);

    // Neon edge strips (few, not many)
    const stripCount = 100;
    const stripGeo = new THREE.BoxGeometry(0.15, 1, 0.15);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    const strips = new THREE.InstancedMesh(stripGeo, stripMat, stripCount);

    for (let i = 0; i < stripCount; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 600;
        const height = Math.random() * 30 + 10;

        if (Math.abs(x) < 15) continue;

        dummy.position.set(x, height / 2, z);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();

        strips.setMatrixAt(i, dummy.matrix);
        strips.setColorAt(i, color.setHex(Math.random() > 0.5 ? 0x00ffff : 0xff00ff));
    }
    scene.add(strips);
}

function createRain() {
    // OPTIMIZED: 15000 rain drops instead of 50000
    const rainCount = 15000;
    const positions = new Float32Array(rainCount * 6);
    rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 300;
        const y = Math.random() * 250;
        const z = (Math.random() - 0.5) * 300;
        const len = 1 + Math.random() * 1.5;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y - len;
        positions[i * 6 + 5] = z;

        rainVelocities[i] = 2 + Math.random() * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    rainSystem = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x6688ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    }));

    scene.add(rainSystem);
    rainPositions = positions;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const time = clock.getElapsedTime();

    // Camera movement
    camera.position.z -= 0.4;
    if (camera.position.z < -400) camera.position.z = 400;

    camera.position.x = Math.sin(time * 0.15) * 6;
    camera.position.y = 8 + Math.sin(time * 0.25) * 2;
    camera.lookAt(0, 12, camera.position.z - 60);

    // Rain animation
    const pos = rainSystem.geometry.attributes.position.array;
    for (let i = 0; i < rainVelocities.length; i++) {
        pos[i * 6 + 1] -= rainVelocities[i];
        pos[i * 6 + 4] -= rainVelocities[i];

        if (pos[i * 6 + 1] < 0) {
            const y = 250;
            const len = 1 + Math.random() * 1.5;
            pos[i * 6 + 1] = y;
            pos[i * 6 + 4] = y - len;

            pos[i * 6] = camera.position.x + (Math.random() - 0.5) * 250;
            pos[i * 6 + 2] = camera.position.z + (Math.random() - 0.5) * 250;
            pos[i * 6 + 3] = pos[i * 6];
            pos[i * 6 + 5] = pos[i * 6 + 2];
        }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;

    controls.update();
    composer.render();
}
