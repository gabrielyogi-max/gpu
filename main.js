import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer;
let clock;
let rainSystem, rainPositions, rainVelocities;

// Color palette
const COLORS = {
    cyan: 0x00f0ff,
    magenta: 0xff0080,
    purple: 0x8000ff,
    pink: 0xff1493
};

init();

async function init() {
    const container = document.getElementById('canvas-container');
    const statusText = document.getElementById('status');
    const rendererInfo = document.getElementById('renderer-info');
    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0612, 0.006);

    // Gradient sky
    createSky();

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 50);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0, 0.5, 0.7
    ));

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a1a2e, 0.5));

    const light1 = new THREE.PointLight(COLORS.cyan, 800, 300);
    light1.position.set(50, 50, 50);
    scene.add(light1);

    const light2 = new THREE.PointLight(COLORS.magenta, 800, 300);
    light2.position.set(-50, 40, -50);
    scene.add(light2);

    // Environment
    createGround();
    createCityscape();
    createRain();

    if (statusText) statusText.innerText = 'CONNECTED';
    if (rendererInfo) rendererInfo.innerText = 'WEBGL 2.0';

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

function createSky() {
    const skyGeo = new THREE.SphereGeometry(800, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x000005) },
            bottomColor: { value: new THREE.Color(0x1a0030) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        starsPos[i * 3] = 700 * Math.sin(phi) * Math.cos(theta);
        starsPos[i * 3 + 1] = 700 * Math.cos(phi) + 50;
        starsPos[i * 3 + 2] = 700 * Math.sin(phi) * Math.sin(theta);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({
        color: 0xffffff, size: 1.2, transparent: true, opacity: 0.5
    })));
}

function createGround() {
    // Dark reflective ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.1, metalness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Neon grid
    const grid = new THREE.GridHelper(2000, 80, COLORS.magenta, COLORS.cyan);
    grid.position.y = 0.01;
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // Center road
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2000),
        new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.4 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    scene.add(road);
}

function createCityscape() {
    // LEFT SIDE - Create clean building silhouettes
    createBuildingRow(-30, -60);
    createBuildingRow(-60, -100);
    createBuildingRow(-100, -150);

    // RIGHT SIDE
    createBuildingRow(30, 60);
    createBuildingRow(60, 100);
    createBuildingRow(100, 150);

    // Light beams in distance
    createLightBeams();
}

function createBuildingRow(xMin, xMax) {
    const count = 40;

    for (let i = 0; i < count; i++) {
        const x = xMin + (Math.random() * (xMax - xMin));
        const z = (Math.random() - 0.5) * 1500;
        const height = Math.random() * 80 + 20;
        const width = Math.random() * 15 + 8;
        const depth = Math.random() * 15 + 8;

        createBuilding(x, z, width, height, depth);
    }
}

function createBuilding(x, z, width, height, depth) {
    const group = new THREE.Group();

    // Main building body - dark silhouette
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    bodyGeo.translate(0, height / 2, 0);

    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a12,
        roughness: 0.8,
        metalness: 0.2
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Glowing edges - CLEAN NEON OUTLINES
    const edgeColor = Math.random() > 0.5 ? COLORS.cyan : COLORS.magenta;
    const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 });

    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edges = new THREE.LineSegments(edgesGeo, edgeMat);
    group.add(edges);

    // Top accent light
    if (Math.random() > 0.6) {
        const topGeo = new THREE.BoxGeometry(width * 0.8, 0.5, depth * 0.8);
        const topMat = new THREE.MeshBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: 0.7
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = height + 0.25;
        group.add(top);
    }

    // Horizontal stripe lights
    const stripeCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < stripeCount; i++) {
        const stripeY = (height / (stripeCount + 1)) * (i + 1);
        const stripeGeo = new THREE.BoxGeometry(width + 0.2, 0.3, depth + 0.2);
        const stripeMat = new THREE.MeshBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: 0.5
        });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = stripeY;
        group.add(stripe);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

function createLightBeams() {
    // Distant vertical light beams
    const beamGeo = new THREE.CylinderGeometry(1, 3, 300, 8, 1, true);

    const beamPositions = [
        { x: -80, z: -300, color: COLORS.cyan },
        { x: 80, z: -350, color: COLORS.magenta },
        { x: -120, z: -500, color: COLORS.purple },
        { x: 120, z: -450, color: COLORS.pink },
        { x: 0, z: -600, color: COLORS.cyan }
    ];

    beamPositions.forEach(pos => {
        const beamMat = new THREE.MeshBasicMaterial({
            color: pos.color,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(pos.x, 150, pos.z);
        scene.add(beam);
    });

    // Floating rings
    for (let i = 0; i < 5; i++) {
        const ringGeo = new THREE.TorusGeometry(4 + Math.random() * 4, 0.15, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? COLORS.cyan : COLORS.magenta,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(
            (Math.random() - 0.5) * 80,
            Math.random() * 40 + 20,
            Math.random() * -200 - 50
        );
        ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(ring);
    }
}

function createRain() {
    const rainCount = 10000;
    const positions = new Float32Array(rainCount * 6);
    rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 300;
        const y = Math.random() * 200;
        const z = (Math.random() - 0.5) * 300;
        const len = 1 + Math.random();

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y - len;
        positions[i * 6 + 5] = z;

        rainVelocities[i] = 1.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    rainSystem = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x6688cc,
        transparent: true,
        opacity: 0.2,
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

    // Camera
    camera.position.z -= 0.25;
    if (camera.position.z < -600) camera.position.z = 600;

    camera.position.x = Math.sin(time * 0.1) * 8;
    camera.position.y = 8 + Math.sin(time * 0.15) * 3;
    camera.lookAt(0, 12, camera.position.z - 40);

    // Rain
    const pos = rainSystem.geometry.attributes.position.array;
    for (let i = 0; i < rainVelocities.length; i++) {
        pos[i * 6 + 1] -= rainVelocities[i];
        pos[i * 6 + 4] -= rainVelocities[i];

        if (pos[i * 6 + 1] < 0) {
            pos[i * 6 + 1] = 200;
            pos[i * 6 + 4] = 199;
            pos[i * 6] = camera.position.x + (Math.random() - 0.5) * 250;
            pos[i * 6 + 2] = camera.position.z + (Math.random() - 0.5) * 250;
            pos[i * 6 + 3] = pos[i * 6];
            pos[i * 6 + 5] = pos[i * 6 + 2];
        }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;

    composer.render();
}
