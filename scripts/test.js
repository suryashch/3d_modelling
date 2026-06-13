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

const loader = new GLTFLoader().setPath('models/bim-model/')

const facade_group = new THREE.Group();

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;

let bvh;
const globalIDs = new Map();

extendBatchedMeshPrototype();

// init();


// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-architectural-noglass_interiors.glb', (gltf) => { // 'piperacks_merged.glb
//     // const meshes = []

//     // gltf.scene.traverse((child) => {
//     //     if ((child.isMesh) && (child.name === "IfcFlowFittingM_Bend_Composite_2x45_DYKA_PP_Binnenriolerin936")) {
//     //         meshes.push(child)
//     //         console.log(child);
//     //     } 
//     // });
//     // meshes.forEach((mesh) => {
//     //     scene.add( mesh )
//     // });
        
//     const mesh = gltf.scene
//     mesh.position.set(0,0,0);
//     // mesh.material = new THREE.MeshToonMaterial({
//     //     color:"#270a77",
//     // });
//     scene.add(mesh);
// });

const loader = new GLTFLoader().setPath('models/bim-model/')

const structural_files = [
    'sixty5-structural.glb',
    'sixty5-architectural-noglass_structural_interior.glb',
    'sixty5-architectural-noglass_facade.glb'
]


initFacade( structural_files );

async function initFacade( _files ) {
    let facade_map;
    
    for (const file of _files) {
        gltf = loader.load(file);
        
    }
}


/*
Facade - Arch-struct; Arch-facade; Structural
No material
CHange transparency
batchedmesh
No BVH




Interior - Arch-int; interior kitchens
Material
DOnt change color
batchedmesh(s) within object group
BVH




Focus - MEP and HVAC
No material
Change color
batchedmesh with different LODs
BVH








*/












init();


async function init() {
    const meshes_1 = [];
    const meshes_2 = [];

    let totalVertexCount_1 = 0;
    let totalIndexCount_1 = 0;
    let totalInstanceCount_1 = 0

    let totalVertexCount_2 = 0;
    let totalIndexCount_2 = 0;
    let totalInstanceCount_2 = 0;

    let material_map_1 = new Map();
    let material_map_2 = new Map();

    let ctr = 0;
    let bmID = 0;

    const [gltf_1, gltf_2] = await Promise.all([
        loader.loadAsync('sixty5-architectural-noglass_structural_interior.glb'), //'sixty5-architectural-noglass_rev1.glb'
        loader.loadAsync('sixty5-structural.glb')
    ]);

    gltf_1.scene.traverse((child) => {
        if (child.userData.mesh_id) {
            // console.log(child);
            meshes_1.push(child);
        }
    });

    gltf_2.scene.traverse((child) => {
        if (child.userData.mesh_id) {
            meshes_2.push(child);
        }
    });

    meshes_1.forEach((value) => {
        let list_children;
        const meshID = value.userData.mesh_id;
        
        if (value.children.length != 0) {
            list_children = value.children;
        } else { list_children = [value] };

        for (const child of list_children) {
            const material = child.material;
            const geom = child.geometry;
            
            child.updateMatrixWorld(true);
            const inst_matrix = child.matrixWorld;

            if ( !material_map_1.has( material ) ) {
                material_map_1.set( material, {
                    unique_geoms: new Map(),
                    vCount: 0,
                    iCount: 0,
                    instCount: 0
                });
            };

            const material_key = material_map_1.get( material );
            material_key.instCount++;
                
            if ( !material_key.unique_geoms.has( meshID )) {
                material_key.unique_geoms.set( meshID, {
                    geometry: geom,
                    matrices: []
                });

                material_key.vCount += geom.attributes.position.count;
                material_key.iCount += geom.index.count;
            
            } 

            material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
        };
    });

    meshes_2.forEach((value) => {
        let list_children;
        const meshID = value.userData.mesh_id;
        
        if (value.children.length != 0) {
            list_children = value.children;
        } else { list_children = [value] };

        for (const child of list_children) {
        
            const material = child.material;
            const geom = child.geometry;
            
            child.updateMatrixWorld(true);
            const inst_matrix = child.matrixWorld.clone();

            if ( !material_map_2.has( material ) ) {
                material_map_2.set( material, {
                    unique_geoms: new Map(),
                    vCount: 0,
                    iCount: 0,
                    instCount: 0
                });
            };

            const material_key = material_map_2.get( material );
            material_key.instCount++;
                
            if ( !material_key.unique_geoms.has( meshID )) {
                material_key.unique_geoms.set( meshID, {
                    geometry: geom,
                    matrices: []
                });

                material_key.vCount += geom.attributes.position.count;
                material_key.iCount += geom.index.count;
            
            } 

            material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
        }
    });

    material_map_1.forEach((value, key) => {
        const material = key;

        const bm_1 = new THREE.BatchedMesh(
            value.instCount,
            value.vCount,
            value.iCount,
            key
        );

        value.unique_geoms.forEach((mesh) => {
            const geom = mesh.geometry;
            const matrices = mesh.matrices;

            if (matrices.length > 0){
                const geom_id = bm_1.addGeometry( geom );

                for ( let i=0; i < matrices.length; i++){
                    const instanceId = bm_1.addInstance(geom_id)
                    bm_1.setMatrixAt( instanceId, matrices[i] )

                };
            };

            ctr++;
        });
        
        bm_1.needsUpdate = true;
        // scene.add(bm_1);

        facade_group.add( bm_1 );

    });

    material_map_2.forEach((value, key) => {
        const material = key;

        const bm_2 = new THREE.BatchedMesh(
            value.instCount,
            value.vCount,
            value.iCount,
            key
        );

        value.unique_geoms.forEach((mesh) => {
            const geom = mesh.geometry;
            const matrices = mesh.matrices;

            if (matrices.length > 0){
                const geom_id = bm_2.addGeometry( geom );

                for ( let i=0; i < matrices.length; i++){
                    const instanceId = bm_2.addInstance(geom_id)
                    bm_2.setMatrixAt( instanceId, matrices[i] )

                };
            };

        });
        
        bm_2.needsUpdate = true;
        bm_2.maxIndex = ctr;
        // scene.add(bm_2);

        facade_group.add( bm_2 );


    });
    
    scene.add( facade_group );

    bvh = new ObjectBVH( facade_group );
    console.log( facade_group );
}



// loader.load('sixty5-architectural-noglass_interiors.glb', (gltf_1) => {   //'sixty5-architectural-noglass_rev1.glb'
//     gltf_1.scene.traverse((child) => {
//         if (child.userData.mesh_id) {
//             // console.log(child);
//             meshes_1.push(child);
//         }
//     });

//     // gltf_2.scene.traverse((child) => {
//     //     if (child.userData.mesh_id) {
//     //         meshes_2.push(child);
//     //     }
//     // });

//     meshes_1.forEach((value) => {
//         let list_children;
//         const meshID = value.userData.mesh_id;
        
//         if (value.children.length != 0) {
//             list_children = value.children;
//         } else { list_children = [value] };

//         for (const child of list_children) {
//             const material = child.material;
//             const geom = child.geometry;
            
//             child.updateMatrixWorld(true);
//             const inst_matrix = child.matrixWorld;

//             if ( !material_map_1.has( material ) ) {
//                 material_map_1.set( material, {
//                     unique_geoms: new Map(),
//                     vCount: 0,
//                     iCount: 0,
//                     instCount: 0
//                 });
//             };

//             const material_key = material_map_1.get( material );
//             material_key.instCount++;
                
//             if ( !material_key.unique_geoms.has( meshID )) {
//                 material_key.unique_geoms.set( meshID, {
//                     geometry: geom,
//                     matrices: []
//                 });

//                 material_key.vCount += geom.attributes.position.count;
//                 material_key.iCount += geom.index.count;
            
//             } 

//             material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
//         };
//     });

//     // meshes_2.forEach((value) => {
//     //     let list_children;
//     //     const meshID = value.userData.mesh_id;
        
//     //     if (value.children.length != 0) {
//     //         list_children = value.children;
//     //     } else { list_children = [value] };

//     //     for (const child of list_children) {
        
//     //         const material = child.material;
//     //         const geom = child.geometry;
            
//     //         child.updateMatrixWorld(true);
//     //         const inst_matrix = child.matrixWorld.clone();

//     //         if ( !material_map_2.has( material ) ) {
//     //             material_map_2.set( material, {
//     //                 unique_geoms: new Map(),
//     //                 vCount: 0,
//     //                 iCount: 0,
//     //                 instCount: 0
//     //             });
//     //         };

//     //         const material_key = material_map_2.get( material );
//     //         material_key.instCount++;
                
//     //         if ( !material_key.unique_geoms.has( meshID )) {
//     //             material_key.unique_geoms.set( meshID, {
//     //                 geometry: geom,
//     //                 matrices: []
//     //             });

//     //             material_key.vCount += geom.attributes.position.count;
//     //             material_key.iCount += geom.index.count;
            
//     //         } 

//     //         material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
//     //     }
//     // });

//     material_map_1.forEach((value, key) => {
//         const material = key;

//         const bm_1 = new THREE.BatchedMesh(
//             value.instCount,
//             value.vCount,
//             value.iCount,
//             key
//         );

//         value.unique_geoms.forEach((mesh) => {
//             const geom = mesh.geometry;
//             const matrices = mesh.matrices;

//             if (matrices.length > 0){
//                 const geom_id = bm_1.addGeometry( geom );

//                 for ( let i=0; i < matrices.length; i++){
//                     const instanceId = bm_1.addInstance(geom_id)
//                     bm_1.setMatrixAt( instanceId, matrices[i] )

//                 };
//             };

//             ctr++;
//         });
        
//         bm_1.needsUpdate = true;
//         // scene.add(bm_1);

//         facade_group.add( bm_1 );

//     });

//     // material_map_2.forEach((value, key) => {
//     //     const material = key;

//     //     const bm_2 = new THREE.BatchedMesh(
//     //         value.instCount,
//     //         value.vCount,
//     //         value.iCount,
//     //         key
//     //     );

//     //     value.unique_geoms.forEach((mesh) => {
//     //         const geom = mesh.geometry;
//     //         const matrices = mesh.matrices;

//     //         if (matrices.length > 0){
//     //             const geom_id = bm_2.addGeometry( geom );

//     //             for ( let i=0; i < matrices.length; i++){
//     //                 const instanceId = bm_2.addInstance(geom_id)
//     //                 bm_2.setMatrixAt( instanceId, matrices[i] )

//     //             };
//     //         };

//     //     });
        
//     //     bm_2.needsUpdate = true;
//     //     bm_2.maxIndex = ctr;
//     //     // scene.add(bm_2);

//     //     // facade_group.add( bm_2 );


//     // });
    
//     scene.add( facade_group );

//     bvh = new ObjectBVH( facade_group );
//     console.log( facade_group );
// }) 



const querySphere = new THREE.Sphere();
let prevNear = new Set();

const highlightColor = new THREE.Color( "#F600C1" );
const nonHighlightColor = new THREE.Color( "#d8d8d8" );

function queryNearInstances( cameraPos ) {

    const nearIds = new Set();

    querySphere.center.copy( cameraPos );
    querySphere.radius = 5;

    bvh.shapecast({

        intersectsBounds : ( box ) => {

            if (!querySphere.intersectsBox( box )) return NOT_INTERSECTED;
            return INTERSECTED;
        },
        intersectsObject : ( object, instanceId ) => {

            nearIds.add( [object, instanceId] );
            return false;
        }

    });

    nearIds.forEach((id) => {
        // console.log(id);
        id[0].setColorAt(id[1], highlightColor);
    })
};





window.addEventListener('dblclick', (event) => {
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects( bvh.objects );

    if (intersects.length > 0) {
        
        const intersectionPoint = intersects[0].point;

        controls.target.copy( intersectionPoint );
        controls.update();
    };

    queryNearInstances( camera.position );

});




// const instanceCount = 10;
// const dummy = new THREE.Object3D();

// let totalVertexCount = 0;
// let totalIndexCount = 0;

// const box = new THREE.BoxGeometry( 1, 1, 1 );
// const sphere = new THREE.SphereGeometry( 1, 12, 12 );
// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );

// totalVertexCount += (sphere.attributes.position.count + box.attributes.position.count);
// totalIndexCount += (sphere.index.count + box.index.count)

// console.log(box.index.count);
// // initialize and add geometries into the batched mesh
// const batchedMesh = new THREE.BatchedMesh( 20, totalVertexCount, totalIndexCount, material );
// const boxGeometryId = batchedMesh.addGeometry( box );
// const sphereGeometryId = batchedMesh.addGeometry( sphere );
// // create instances of those geometries
// for (let i =0; i < instanceCount; i++) {
//     const boxInstancedId1 = batchedMesh.addInstance( boxGeometryId );
//     const sphereInstancedId1 = batchedMesh.addInstance( sphereGeometryId );

//     dummy.position.set(
//         Math.round( Math.random() * 50 ),
//         Math.round( Math.random() * 50 ),
//         Math.round( Math.random() * 50 )
//     );

//     dummy.updateMatrix();
//     batchedMesh.setMatrixAt( boxInstancedId1, dummy.matrix );

//     // dummy.position.set(
//     //     Math.round( Math.random() * 50 ),
//     //     Math.round( Math.random() * 50 ),
//     //     Math.round( Math.random() * 50 )
//     // );

//     // dummy.updateMatrix();
//     // batchedMesh.setMatrixAt( sphereInstancedId1, dummy.matrix );
    
// }

// scene.add(batchedMesh)

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
