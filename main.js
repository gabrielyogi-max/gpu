import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer;
let controls;
let clock;

// Objects
let rainSystem;
let rainPositions;
let rainVelocities;
let neonSigns = [];

init();

async function init() {
    const container = document.getElementById('canvas-container');
    const statusText = document.getElementById('status');
    clock = new THREE.Clock();

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x020208, 0.015);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 30);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Post Processing - BLOOM!
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,    // strength
        0.4,    // radius
        0.85    // threshold
    );
    composer.addPass(bloomPass);

    // 5. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2;

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);

    // Main Neon Lights
    const cyanLight = new THREE.PointLight(0x00ffff, 2000, 150);
    cyanLight.position.set(30, 30, 20);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 2000, 150);
    magentaLight.position.set(-30, 20, -20);
    scene.add(magentaLight);

    const yellowLight = new THREE.PointLight(0xffaa00, 1500, 100);
    yellowLight.position.set(0, 40, -50);
    scene.add(yellowLight);

    // Spot lights for dramatic effect
    const spotLight1 = new THREE.SpotLight(0x00ffff, 3000);
    spotLight1.position.set(50, 100, 50);
    spotLight1.angle = Math.PI / 6;
    spotLight1.penumbra = 0.5;
    scene.add(spotLight1);

    // 7. Environment
    createWetGround();
    createCyberpunkCity();
    createNeonSigns();
    createRain();

    statusText.innerText = 'SYSTEM ONLINE :: NEON CITY';

    // 8. Events
    window.addEventListener('resize', onWindowResize);

    // 9. Loop
    renderer.setAnimationLoop(animate);
}

function createWetGround() {
    // Reflective wet ground
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x050510,
        roughness: 0.1,
        metalness: 0.9,
        envMapIntensity: 1.5
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Neon Grid Lines
    const gridSize = 2000;
    const gridDivisions = 100;

    // Create custom grid with glowing lines
    const gridMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.4
    });

    const gridMaterial2 = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3
    });

    const step = gridSize / gridDivisions;
    const halfSize = gridSize / 2;

    // Lines along X
    for (let i = 0; i <= gridDivisions; i++) {
        const geometry = new THREE.BufferGeometry();
        const z = -halfSize + i * step;
        const points = [
            new THREE.Vector3(-halfSize, 0.01, z),
            new THREE.Vector3(halfSize, 0.01, z)
        ];
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, i % 5 === 0 ? gridMaterial : gridMaterial2);
        scene.add(line);
    }

    // Lines along Z
    for (let i = 0; i <= gridDivisions; i++) {
        const geometry = new THREE.BufferGeometry();
        const x = -halfSize + i * step;
        const points = [
            new THREE.Vector3(x, 0.01, -halfSize),
            new THREE.Vector3(x, 0.01, halfSize)
        ];
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, i % 5 === 0 ? gridMaterial : gridMaterial2);
        scene.add(line);
    }
}

function createCyberpunkCity() {
    const buildingCount = 400;

    for (let i = 0; i < buildingCount; i++) {
        const x = (Math.random() - 0.5) * 500;
        const z = (Math.random() - 0.5) * 1000;

        // Leave space for the "road"
        if (Math.abs(x) < 15) continue;

        const width = Math.random() * 8 + 4;
        const depth = Math.random() * 8 + 4;
        const height = Math.random() * 60 + 10;

        createBuilding(x, z, width, depth, height);
    }
}

function createBuilding(x, z, width, depth, height) {
    const group = new THREE.Group();

    // Main building body
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(0, height / 2, 0);

    // Dark material with slight emission
    const material = new THREE.MeshStandardMaterial({
        color: 0x0a0a15,
        roughness: 0.7,
        metalness: 0.3,
    });

    const building = new THREE.Mesh(geometry, material);
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    // Add glowing windows
    const windowRows = Math.floor(height / 4);
    const windowCols = Math.floor(width / 2);

    const windowColors = [0x00ffff, 0xff00ff, 0xffaa00, 0x00ff88, 0xff0066];

    for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
            if (Math.random() > 0.6) continue; // Some windows off

            const windowGeo = new THREE.PlaneGeometry(1, 2);
            const windowMat = new THREE.MeshBasicMaterial({
                color: windowColors[Math.floor(Math.random() * windowColors.length)],
                transparent: true,
                opacity: 0.8 + Math.random() * 0.2,
                side: THREE.DoubleSide
            });

            const windowMesh = new THREE.Mesh(windowGeo, windowMat);

            // Position windows on front face
            const wx = -width / 2 + col * 2 + 1;
            const wy = row * 4 + 3;
            windowMesh.position.set(wx, wy, depth / 2 + 0.01);
            group.add(windowMesh);

            // Also on back face
            const windowMesh2 = windowMesh.clone();
            windowMesh2.position.z = -depth / 2 - 0.01;
            group.add(windowMesh2);
        }
    }

    // Add edge lighting to some buildings
    if (Math.random() > 0.7) {
        const edgeMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
            transparent: true,
            opacity: 0.9
        });

        // Vertical edge lights
        const edgeGeo = new THREE.BoxGeometry(0.2, height, 0.2);
        edgeGeo.translate(0, height / 2, 0);

        const edge1 = new THREE.Mesh(edgeGeo, edgeMat);
        edge1.position.set(width / 2, 0, depth / 2);
        group.add(edge1);

        const edge2 = new THREE.Mesh(edgeGeo, edgeMat);
        edge2.position.set(-width / 2, 0, depth / 2);
        group.add(edge2);

        const edge3 = new THREE.Mesh(edgeGeo, edgeMat);
        edge3.position.set(width / 2, 0, -depth / 2);
        group.add(edge3);

        const edge4 = new THREE.Mesh(edgeGeo, edgeMat);
        edge4.position.set(-width / 2, 0, -depth / 2);
        group.add(edge4);
    }

    // Rooftop lights
    if (Math.random() > 0.5) {
        const lightGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff0000 : 0x00ff00
        });
        const roofLight = new THREE.Mesh(lightGeo, lightMat);
        roofLight.position.set(0, height + 0.5, 0);
        group.add(roofLight);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

function createNeonSigns() {
    const signPositions = [
        { x: 20, y: 25, z: -30, text: '⚡', color: 0x00ffff, scale: 5 },
        { x: -25, y: 35, z: -60, text: '★', color: 0xff00ff, scale: 6 },
        { x: 35, y: 20, z: -100, text: '◆', color: 0xffaa00, scale: 4 },
        { x: -40, y: 30, z: -150, text: '●', color: 0x00ff88, scale: 5 },
        { x: 30, y: 40, z: -200, text: '■', color: 0xff0066, scale: 4 },
    ];

    signPositions.forEach(sign => {
        // Create glowing billboard
        const geo = new THREE.PlaneGeometry(sign.scale * 2, sign.scale);
        const mat = new THREE.MeshBasicMaterial({
            color: sign.color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(sign.x, sign.y, sign.z);
        mesh.lookAt(0, sign.y, 1000);

        // Add point light at sign position
        const light = new THREE.PointLight(sign.color, 500, 50);
        light.position.copy(mesh.position);
        scene.add(light);

        scene.add(mesh);
        neonSigns.push({ mesh, originalY: sign.y, phase: Math.random() * Math.PI * 2 });
    });
}

function createRain() {
    const rainCount = 50000;

    // Create rain as lines (streaks) instead of points
    const positions = new Float32Array(rainCount * 6); // 2 vertices per line
    rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = Math.random() * 300;
        const z = (Math.random() - 0.5) * 400;

        const streakLength = 1 + Math.random() * 2;

        // Start point
        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;

        // End point (streak going down)
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y - streakLength;
        positions[i * 6 + 5] = z;

        rainVelocities[i] = 2 + Math.random() * 3;
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.LineBasicMaterial({
        color: 0x8888ff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    rainSystem = new THREE.LineSegments(rainGeo, rainMat);
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
    const delta = clock.getDelta();

    // Smooth camera movement
    camera.position.z -= 0.5;

    if (camera.position.z < -400) {
        camera.position.z = 400;
    }

    // Cinematic sway
    camera.position.x = Math.sin(time * 0.2) * 8;
    camera.position.y = 8 + Math.sin(time * 0.3) * 3;
    camera.lookAt(0, 10, camera.position.z - 80);

    // Animate neon signs (floating/pulsing)
    neonSigns.forEach(sign => {
        sign.mesh.position.y = sign.originalY + Math.sin(time * 2 + sign.phase) * 0.5;
        sign.mesh.material.opacity = 0.7 + Math.sin(time * 3 + sign.phase) * 0.3;
    });

    // Animate rain
    const positions = rainSystem.geometry.attributes.position.array;
    const rainCount = rainVelocities.length;

    for (let i = 0; i < rainCount; i++) {
        const vel = rainVelocities[i];

        // Move both vertices (start and end of streak)
        positions[i * 6 + 1] -= vel;
        positions[i * 6 + 4] -= vel;

        // Reset when below ground
        if (positions[i * 6 + 1] < 0) {
            const newY = 300;
            const streakLength = 1 + Math.random() * 2;

            positions[i * 6 + 1] = newY;
            positions[i * 6 + 4] = newY - streakLength;

            // Reposition near camera
            positions[i * 6] = camera.position.x + (Math.random() - 0.5) * 300;
            positions[i * 6 + 2] = camera.position.z + (Math.random() - 0.5) * 300;
            positions[i * 6 + 3] = positions[i * 6];
            positions[i * 6 + 5] = positions[i * 6 + 2];
        }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;

    controls.update();

    // Use composer (with bloom) instead of direct renderer
    composer.render();
}
