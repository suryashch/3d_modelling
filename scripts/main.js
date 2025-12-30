// code partially derived from Dan Greenheck https://www.youtube.com/watch?v=aOQuuotM-Ww

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(40,20,50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance=1;
controls.maxDistance=1000;
controls.minPolarAngle=0.5;
controls.maxPolarAngle=1.5;
controls.autoRotate=false;
controls.target = new THREE.Vector3(0,1,0);
controls.update()

const light_2 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(10,10,10)
scene.add(light_2);

const light_3 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(-10,-10,10)
scene.add(light_3);

const light_4 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(10,-10,10)
scene.add(light_4);

const light_5 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(-10,10,10)
scene.add(light_5);

const gridHelper = new THREE.GridHelper( 40, 20 ); // ( size, divisions )
scene.add( gridHelper );

// const textureLoader = new THREE.TextureLoader()
// const texture = textureLoader.load("../public/textures/f4b58461da68e01bcafc32e54520a1e1.jpg")

// texture.wrapS = THREE.RepeatWrapping;
// texture.wrapT = THREE.RepeatWrapping

// texture.repeat.set(5,5)

// const lores_mat = new THREE.MeshBasicMaterial({
//     color: "#C00000",
//     map: texture
// })
// const hires_mat = new THREE.MeshBasicMaterial({
//     color: "#37962A",
//     map: texture
// })

const loader = new GLTFLoader();

loader.load('models/piperack/piperacks_lod_working_3.glb', (gltf) => {    
    const gltfScene = gltf.scene;

    const objects = new Map()

    gltfScene.traverse((child) => {
        if (child.isMesh) {
            const [obj, res] = child.name.split(';')

            if (!objects.has(obj)) {
                objects.set(obj, new Map())
                objects.get(obj).set(res, child)

            } else {
                objects.get(obj).set(res, child)
            }
        }
    })

    objects.forEach((res_map, object_id) => {
        const lod = new THREE.LOD()

        let hires_pos = res_map.get('hires').position
        let worldPos = new THREE.Vector3();
        let worldQuat = new THREE.Quaternion();
        let worldScale = new THREE.Vector3();
        
        res_map.get('hires').updateMatrixWorld(true)

        res_map.get('hires').matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
        lod.position.copy(hires_pos)
        lod.quaternion.copy(worldQuat);
        lod.scale.copy(worldScale);

        res_map.forEach((mesh, resolution) => {
            mesh.position.set(0, 0, 0);
            mesh.quaternion.set(0, 0, 0, 1);
            mesh.scale.set(1, 1, 1);

            if (resolution === 'hires') {
                // mesh.material = hires_mat
                lod.addLevel(mesh, 0)
            } else {
                // mesh.material = lores_mat
                lod.addLevel(mesh, 5)
            }
        })

        scene.add(lod)
    })
})

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();