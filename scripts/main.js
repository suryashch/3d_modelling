// code partially derived from Dan Greenheck https://www.youtube.com/watch?v=aOQuuotM-Ww

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(40,20,50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance=5;
controls.maxDistance=100;
controls.minPolarAngle=0.5;
controls.maxPolarAngle=1.5;
controls.autoRotate=false;
controls.target = new THREE.Vector3(0,1,0);
controls.update()

const groundGeometry = new THREE.PlaneGeometry(60, 60, 2, 2);
groundGeometry.rotateX(-Math.PI /2);
const groundMaterial = new THREE.MeshStandardMaterial({
    color:  0x555555,
    side: THREE.DoubleSide
});

const light_1 = new THREE.DirectionalLight(0xffffff, 1);
light_1.position.set(15, 15, 15);
scene.add(light_1);

const gridHelper = new THREE.GridHelper( 40, 20 ); // ( size, divisions )
scene.add( gridHelper );

const loader = new GLTFLoader();

loader.load('models/piperack/piperacks_lod_merged.glb', (gltf) => {
    const gltfScene = gltf.scene;
    const lodMap = new Map();

    gltfScene.traverse((child) => {
        if (child.isMesh) {
            const [object, version] = child.name.split('_');

            if (!lodMap.has(object)) {
                lodMap.set(object, { high: null, low: null });
            }
            
            const group = lodMap.get(object);
            if (version === 'hires') group.high = child;
            if (version === 'lowres') group.low = child;
        }
    });

    lodMap.forEach((meshes, name) => {
        if (meshes.high && meshes.low) {
            const lod = new THREE.LOD();

            // Add High Quality: Visible from 0 to 15 units
            lod.addLevel(meshes.high, 0);

            // Add Low Quality: Visible from 15 units onwards
            lod.addLevel(meshes.low, 15);

            // Position the LOD object where the original was
            lod.position.copy(meshes.high.position);
            
            lod.position.set(-8,1,-4);
            // Add to your main scene
            scene.add(lod);
        }
    });
})

// const loader = new GLTFLoader().setPath('models/piperack/');

// const lod = new THREE.LOD();
// lod.position.set(-8,1,-4);
// scene.add(lod);

// loader.load('piperacks_lod-100.glb', (gltf) => {
//     const highResMesh = gltf.scene;
//     lod.addLevel(highResMesh, 0);
// })

// loader.load('piperacks_lod-10.glb', (gltf) => {
//     const medResMesh = gltf.scene;
//     lod.addLevel(medResMesh, 30);
// })

// loader.load('piperacks_lod-04.glb', (gltf) => {
//     const lowResMesh = gltf.scene;
//     lod.addLevel(lowResMesh, 50);
// })

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();