import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer;
let controls, clock;
let rainSystem, rainPositions, rainVelocities;

// Color palette - harmonious cyberpunk
const COLORS = {
    bg: 0x0a0612,
    fog: 0x0a0612,
    cyan: 0x00f0ff,
    magenta: 0xff0080,
    purple: 0x8000ff,
    orange: 0xff6b00,
    pink: 0xff1493,
    neonBlue: 0x0066ff
};

init();

async function init() {
    const container = document.getElementById('canvas-container');
    const statusText = document.getElementById('status');
    const rendererInfo = document.getElementById('renderer-info');
    clock = new THREE.Clock();

    // Scene with gradient background
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.fog, 0.008);

    // Create gradient skybox
    createSkybox();

    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 10, 40);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Post Processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength
        0.4,   // radius  
        0.75   // threshold
    );
    composer.addPass(bloomPass);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.enableZoom = false;
    controls.enablePan = false;

    // Lighting
    setupLighting();

    // Environment
    createGround();
    createCity();
    createNeonAccents();
    createRain();

    // Update UI
    if (statusText) statusText.innerText = 'CONNECTED';
    if (rendererInfo) rendererInfo.innerText = 'WEBGL 2.0';

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(animate);
}

function createSkybox() {
    // Gradient sky using a large sphere
    const skyGeo = new THREE.SphereGeometry(900, 32, 32);

    // Custom shader for gradient
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0a0015) },
            middleColor: { value: new THREE.Color(0x1a0030) },
            bottomColor: { value: new THREE.Color(0x0a0612) },
            offset: { value: 20 },
            exponent: { value: 0.4 }
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
            uniform vec3 middleColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                
                vec3 color;
                if (h > 0.0) {
                    color = mix(middleColor, topColor, pow(h, exponent));
                } else {
                    color = mix(middleColor, bottomColor, pow(-h, exponent));
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Add distant stars
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starsPos = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.4; // Only upper hemisphere
        const r = 800;

        starsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starsPos[i * 3 + 1] = r * Math.cos(phi) + 100;
        starsPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));

    const starsMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    scene.add(new THREE.Points(starsGeo, starsMat));
}

function setupLighting() {
    // Ambient
    scene.add(new THREE.AmbientLight(0x1a1a2e, 0.3));

    // Main cyan light (right)
    const light1 = new THREE.PointLight(COLORS.cyan, 1200, 200);
    light1.position.set(50, 40, 30);
    scene.add(light1);

    // Magenta light (left)
    const light2 = new THREE.PointLight(COLORS.magenta, 1200, 200);
    light2.position.set(-50, 30, -20);
    scene.add(light2);

    // Purple backlight
    const light3 = new THREE.PointLight(COLORS.purple, 800, 300);
    light3.position.set(0, 60, -150);
    scene.add(light3);

    // Orange accent
    const light4 = new THREE.PointLight(COLORS.orange, 600, 150);
    light4.position.set(-30, 20, 50);
    scene.add(light4);
}

function createGround() {
    // Reflective wet ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({
            color: 0x080810,
            roughness: 0.15,
            metalness: 0.85
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Neon grid
    const grid = new THREE.GridHelper(2000, 100, COLORS.magenta, COLORS.cyan);
    grid.position.y = 0;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    // Road center line
    const roadGeo = new THREE.PlaneGeometry(1, 2000);
    const roadMat = new THREE.MeshBasicMaterial({
        color: COLORS.cyan,
        transparent: true,
        opacity: 0.3
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    scene.add(road);
}

function createCity() {
    const buildingCount = 600;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    const material = new THREE.MeshStandardMaterial({
        color: 0x0c0c14,
        roughness: 0.5,
        metalness: 0.5
    });

    const buildings = new THREE.InstancedMesh(geometry, material, buildingCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < buildingCount; i++) {
        const x = (Math.random() - 0.5) * 600;
        const z = (Math.random() - 0.5) * 1200;

        if (Math.abs(x) < 15) continue;

        // Varied building shapes
        const width = Math.random() * 8 + 3;
        const depth = Math.random() * 8 + 3;
        const height = Math.pow(Math.random(), 0.7) * 80 + 5; // More tall buildings

        dummy.position.set(x, 0, z);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();

        buildings.setMatrixAt(i, dummy.matrix);
    }
    scene.add(buildings);

    // Windows - colorful and glowing
    createWindows();
}

function createWindows() {
    const windowCount = 2500;
    const windowGeo = new THREE.PlaneGeometry(1, 2);
    const windowMat = new THREE.MeshBasicMaterial({
        color: COLORS.cyan,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const windows = new THREE.InstancedMesh(windowGeo, windowMat, windowCount);
    const colors = [COLORS.cyan, COLORS.magenta, COLORS.orange, COLORS.pink, COLORS.neonBlue];
    const color = new THREE.Color();
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let b = 0; b < 120 && idx < windowCount; b++) {
        const bx = (Math.random() - 0.5) * 500;
        const bz = (Math.random() - 0.5) * 800;

        if (Math.abs(bx) < 15) continue;

        const bHeight = Math.random() * 60 + 10;
        const rows = Math.floor(bHeight / 6);
        const cols = Math.floor(Math.random() * 3) + 1;

        for (let r = 0; r < rows && idx < windowCount; r++) {
            for (let c = 0; c < cols && idx < windowCount; c++) {
                if (Math.random() > 0.4) continue;

                dummy.position.set(
                    bx + (c - cols / 2) * 2.5,
                    r * 6 + 4,
                    bz + 4
                );
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();

                windows.setMatrixAt(idx, dummy.matrix);
                windows.setColorAt(idx, color.setHex(colors[Math.floor(Math.random() * colors.length)]));
                idx++;
            }
        }
    }

    scene.add(windows);
}

function createNeonAccents() {
    // Floating neon rings
    const ringCount = 8;

    for (let i = 0; i < ringCount; i++) {
        const radius = Math.random() * 5 + 3;
        const ringGeo = new THREE.TorusGeometry(radius, 0.1, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? COLORS.cyan : COLORS.magenta,
            transparent: true,
            opacity: 0.8
        });

        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(
            (Math.random() - 0.5) * 100,
            Math.random() * 30 + 20,
            (Math.random() - 0.5) * 200 - 50
        );
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;

        scene.add(ring);
    }

    // Vertical light beams
    const beamGeo = new THREE.CylinderGeometry(0.5, 2, 200, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
        color: COLORS.cyan,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < 4; i++) {
        const beam = new THREE.Mesh(beamGeo, beamMat.clone());
        beam.material.color.setHex(i % 2 === 0 ? COLORS.cyan : COLORS.magenta);
        beam.position.set(
            (Math.random() - 0.5) * 200,
            100,
            -200 - i * 100
        );
        scene.add(beam);
    }
}

function createRain() {
    const rainCount = 12000;
    const positions = new Float32Array(rainCount * 6);
    rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 300;
        const y = Math.random() * 200;
        const z = (Math.random() - 0.5) * 300;
        const len = 0.8 + Math.random() * 1.2;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y - len;
        positions[i * 6 + 5] = z;

        rainVelocities[i] = 1.5 + Math.random() * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    rainSystem = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x7788cc,
        transparent: true,
        opacity: 0.25,
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

    // Smooth camera movement
    camera.position.z -= 0.3;
    if (camera.position.z < -500) camera.position.z = 500;

    camera.position.x = Math.sin(time * 0.12) * 10;
    camera.position.y = 10 + Math.sin(time * 0.2) * 4;
    camera.lookAt(0, 15, camera.position.z - 50);

    // Rain animation
    const pos = rainSystem.geometry.attributes.position.array;
    for (let i = 0; i < rainVelocities.length; i++) {
        pos[i * 6 + 1] -= rainVelocities[i];
        pos[i * 6 + 4] -= rainVelocities[i];

        if (pos[i * 6 + 1] < 0) {
            const y = 200;
            const len = 0.8 + Math.random() * 1.2;
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
