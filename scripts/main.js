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

const light_1 = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(light_1);

const light_2 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(10,10,10)
scene.add(light_2);

const gridHelper = new THREE.GridHelper( 40, 20 ); // ( size, divisions )
scene.add( gridHelper );

const loader = new GLTFLoader();

loader.load('models/piperack/piperacks_lod_working_1.glb', (gltf) => {
    const gltfScene = gltf.scene;
    console.log(gltfScene.children)
    // const lodMap = new Map();

    scene.add(gltfScene)

    gltfScene.traverse((child) => {
        if (child.isMesh && !child.name.endsWith("hires")) {
            const mesh = child;
            mesh.visible = false
        }
    })

    // gltfScene.traverse((child) => {
    //     if (child.isMesh) {
    //         const [object, version] = child.name.split(';');

    //         if (!lodMap.has(object)) {
    //             lodMap.set(object, { high: null, low: null });
    //         }
            
    //         const me = lodMap.get(object);
    //         if (version === 'hires') me.high = child;
    //         if (version === 'lowres') me.low = child;
    //     }
    // });

    // lodMap.forEach((meshes, name) => {
    //     if (meshes.high && meshes.low) {
    //         const lod = new THREE.LOD();

    //         meshes.high.updateWorldMatrix(true, true);

    //         const worldPos = new THREE.Vector3();
    //         meshes.high.getWorldPosition(worldPos);
    //         lod.position.copy(worldPos);

    //         meshes.high.position.set(0,0,0);
    //         meshes.low.poition.set(0,0,0);

    //         // Add High Quality: Visible from 0 to 15 units
    //         lod.addLevel(meshes.high, 0);

    //         // Add Low Quality: Visible from 15 units onwards
    //         lod.addLevel(meshes.low, 15);

    //         // // Position the LOD object where the original was
    //         // lod.position.copy(meshes.high.position);
            
    //         // lod.position.set(0,0,0) //(-8,1,-4);
    //         // Add to your main scene
    //         scene.add(lod);
    //     }
    // });
})




// const loader = new GLTFLoader();
// loader.load('../models/piperack/piperacks_lod_working_1.glb', (gltf) => {
//     console.log(gltf.scene.children)
// })






/*--------------------------------------------------------*/
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

/*--------------------------------------------------------*/



function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();