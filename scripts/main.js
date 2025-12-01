// code derived from Dan Greenheck https://www.youtube.com/watch?v=aOQuuotM-Ww

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

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
controls.maxDistance=50;
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

const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(groundMesh);

// const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Color, Intensity (0-1)
// scene.add(ambientLight)

const light_1 = new THREE.DirectionalLight(0xffffff, 1);
light_1.position.set(150, 150, 150);
scene.add(light_1);

const light_2 = new THREE.DirectionalLight(0xffffff, 1);
light_2.position.set(0, -125, 0);
scene.add(light_2);

const light_3 = new THREE.DirectionalLight(0xffffff, 1);
light_3.position.set(150, -125, 0);
scene.add(light_3);

const light_4 = new THREE.DirectionalLight(0xffffff, 1);
light_4.position.set(150, -125, 0);
scene.add(light_4);

const loader = new GLTFLoader().setPath('models/piperack/');
loader.load('piperacks_lod-100.glb', (gltf) => {
    const mesh = gltf.scene;
    mesh.position.set(0,0,0);
    scene.add(mesh);
})

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();