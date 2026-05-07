import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './performance_monitor.js'

import { acceleratedRaycast, computeBatchedBoundsTree } from 'three-mesh-bvh';

import { createRadixSort, extendBatchedMeshPrototype, getBatchedMeshLODCount } from '@three.ez/batched-mesh-extensions';
import { performanceRangeLOD, simplifyGeometriesByErrorLOD, simplifyGeometryByErrorLOD } from '@three.ez/simplify-geometry';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(40,10,25);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance=1;
controls.maxDistance=100;
controls.minPolarAngle=0.5;
controls.maxPolarAngle=1.57;
controls.autoRotate=false;
controls.target = new THREE.Vector3(-15,0,-15);
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.75;
controls.panSpeed = 0.5;
controls.update()

const light_2 = new THREE.DirectionalLight(0xffffff, 0.25);
light_2.position.set(10,10,10)
scene.add(light_2);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Color, Intensity
scene.add(ambientLight);

const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
scene.add( gridHelper );

const perfMonitor = new PerformanceMonitor()

// Basic Loader
const loader1 = new GLTFLoader().setPath('models/bim-model/');
loader1.load('sixty5-interiors-kitchens.glb', (gltf) => {

    const mesh = gltf.scene
    mesh.position.set(0,0,0);
    mesh.material = new THREE.MeshToonMaterial({
        color:"#270a77",
    });
    scene.add(mesh);
    console.log(mesh)
});

// BatchedMesh with LOD - Using custom GLTF script with Piperack model
extendBatchedMeshPrototype();

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

let batchedMesh;

async function init() {

    let totalInstanceCount = 0;
    let totalVertexCount = 0;
    let totalIndexCount = 0;
    
    let uuid_map = new Map();
    
    const loader_instance = new GLTFLoader().setPath('models/bim-model/');
    const gltf = await loader_instance.loadAsync('test-mep.glb')
    
    const meshes = [];

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            meshes.push( child )
        };
    });

    for (const child of meshes) {
        const geom = child.geometry;
        const geom_uuid = geom.uuid;
        const index_count = geom.index.count;
        const vertex_count = geom.attributes.position.count;
        const inst_matrix = child.matrixWorld.clone();

        const [base_name, mesh_resolution] = child.name.split("-");

        if ( !uuid_map.has( base_name )){
            // If map does not have the mesh already, first create it
            
            uuid_map.set( base_name, new Map() );

            uuid_map.get( base_name ).set( "geometry", [] );
            uuid_map.get( base_name ).get( "geometry").push( geom )

            uuid_map.get( base_name ).set( "LODIndexCount", index_count * 2 );
            uuid_map.get( base_name ).set( "matrix", [] );

            uuid_map.get( base_name ).get( "matrix").push( inst_matrix );

            totalVertexCount += vertex_count;
            totalIndexCount += index_count * 2;
            totalInstanceCount += 1;
        
        } else {
            
            if ( mesh_resolution === "hires"){
                uuid_map.get( base_name ).get( "geometry").unshift( geom )
            } else {
                uuid_map.get( base_name ).get( "geometry").push( geom )
            };

            totalInstanceCount += 1;
        };
    };

    batchedMesh = new THREE.BatchedMesh( 100000, totalVertexCount, totalIndexCount, new THREE.MeshStandardMaterial() );

    uuid_map.forEach((value, key) => {

        const geometry = value.get("geometry");
        const LODIndexCount = value.get("LODIndexCount")
        const matrices = value.get("matrix");

        const geometry_hires = geometry[ 0 ];
        const geometry_lowres = geometry[ 1 ];
        
        const geometryId = batchedMesh.addGeometry( geometry_hires, -1, LODIndexCount );
        batchedMesh.addGeometryLOD( geometryId, geometry_lowres, 10 );

        const instanceId = batchedMesh.addInstance( geometryId )
        batchedMesh.setMatrixAt( instanceId, matrices[ 0 ] )

    });

    batchedMesh.needsUpdate = true;
    scene.add(batchedMesh);
};

init();


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    renderer.render(scene, camera);

    perfMonitor.update(renderer, scene);
};

animate();
