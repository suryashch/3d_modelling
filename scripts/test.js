import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './utils/performanceMonitor.js'
import { FrameProfiler } from './utils/frameProfiler.js';

import { ObjectBVH, acceleratedRaycast, INTERSECTED, NOT_INTERSECTED, computeBatchedBoundsTree } from 'three-mesh-bvh';

import { createRadixSort, extendBatchedMeshPrototype, getBatchedMeshLODCount } from '@three.ez/batched-mesh-extensions';
import { performanceRangeLOD, simplifyGeometriesByErrorLOD } from '@three.ez/simplify-geometry';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const mouse = new THREE.Vector2();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(-10,50,50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.minDistance=0.1;
controls.maxDistance=100;
controls.minPolarAngle=0;
controls.maxPolarAngle=3;
controls.autoRotate=false;
controls.target = new THREE.Vector3(-15,0,-15);
controls.rotateSpeed = 0.15;
controls.zoomSpeed = 0.50;
controls.panSpeed = 0.25;
// controls.update();

const light_2 = new THREE.DirectionalLight(0xffffff, 1);
light_2.position.set( 10,10,10 )
scene.add(light_2);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Color, Intensity
scene.add(ambientLight);

const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
scene.add( gridHelper );

const perfMonitor = new PerformanceMonitor();

extendBatchedMeshPrototype();

const instanceCount = 10;
const dummy = new THREE.Object3D();

let totalVertexCount = 0;
let totalIndexCount = 0;

const box = new THREE.BoxGeometry( 1, 1, 1 );
const sphere = new THREE.SphereGeometry( 1, 12, 12 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );

totalVertexCount += (sphere.attributes.position.count + box.attributes.position.count);
totalIndexCount += (sphere.index.count + box.index.count)

console.log(box.index.count);
// initialize and add geometries into the batched mesh
const batchedMesh = new THREE.BatchedMesh( 20, totalVertexCount, totalIndexCount, material );
const boxGeometryId = batchedMesh.addGeometry( box );
const sphereGeometryId = batchedMesh.addGeometry( sphere );
// create instances of those geometries
for (let i =0; i < instanceCount; i++) {
    const boxInstancedId1 = batchedMesh.addInstance( boxGeometryId );
    const sphereInstancedId1 = batchedMesh.addInstance( sphereGeometryId );

    dummy.position.set(
        Math.round( Math.random() * 50 ),
        Math.round( Math.random() * 50 ),
        Math.round( Math.random() * 50 )
    );

    dummy.updateMatrix();
    batchedMesh.setMatrixAt( boxInstancedId1, dummy.matrix );

    // dummy.position.set(
    //     Math.round( Math.random() * 50 ),
    //     Math.round( Math.random() * 50 ),
    //     Math.round( Math.random() * 50 )
    // );

    // dummy.updateMatrix();
    // batchedMesh.setMatrixAt( sphereInstancedId1, dummy.matrix );
    
}

scene.add(batchedMesh)

// let batchedMesh;
// let bvh;

// let meshes = [];

// let totalVertexCount = 0;
// let totalIndexCount = 0;

// let hiresGeomIds = [];
// let lowresGeomIds = [];

// async function init() {
//     const loader = new GLTFLoader().setPath('models/foot/');
//     const [gltf_hi, gltf_low] = await Promise.all([
//         loader.loadAsync('human-foot-hires.glb'),
//         loader.loadAsync('human-foot-lowres.glb')
//     ]);
    
//     const geom_hires = gltf_hi.scene.children[0].geometry;
//     const geom_lowres = gltf_low.scene.children[0].geometry;

//     totalVertexCount += geom_hires.attributes.position.count;
//     totalVertexCount += geom_lowres.attributes.position.count;

//     totalIndexCount += geom_hires.index.count;
//     totalIndexCount += geom_lowres.index.count;

//     batchedMesh = new THREE.BatchedMesh(
//         instanceCount,
//         totalVertexCount,
//         totalIndexCount,
//         new THREE.MeshStandardMaterial()
//     );

//     const lowres_geometryId = batchedMesh.addGeometry( geom_lowres );
//     const hires_geometryId = batchedMesh.addGeometry( geom_hires );

//      for ( let i = 0; i < instanceCount; i++ ){
//         const id = batchedMesh.addInstance( lowres_geometryId );
        
//         lowresGeomIds[ id ] = geom_lowres;
//         hiresGeomIds[ id ] = geom_hires;

//         dummy.position.set(
//             Math.round( Math.random() * 50 ),
//             Math.round( Math.random() * 50 ),
//             Math.round( Math.random() * 50 )
//         );

//         dummy.updateMatrix();
//         batchedMesh.setMatrixAt( id, dummy.matrix );
//     };
    
//     batchedMesh.needsUpdate = true;
//     scene.add(batchedMesh);

//     bvh = new ObjectBVH( batchedMesh );
//     console.log(bvh);

// }

// init();

function animate() {

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    perfMonitor.update(renderer, scene);

};

animate();
