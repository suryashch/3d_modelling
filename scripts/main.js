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

// const camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
// scene.add( camera );
// camera.position.set(40,10,25);
// camera.zoom = 10;
// camera.updateProjectionMatrix();

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

const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
scene.add( gridHelper );

const perfMonitor = new PerformanceMonitor()

// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/piperack/');
// loader1.load('piperacks_valve_only_decimate.glb', (gltf) => { // 'piperacks_merged.glb
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
//     mesh.material = new THREE.MeshToonMaterial({
//         color:"#270a77",
//     });
//     scene.add(mesh);
//     console.log(mesh)
// });


// // Basic Instancing with BatchedMesh
// const geometry = new THREE.BoxGeometry(1,1,1);
// const material = new THREE.MeshBasicMaterial();

// const instanceCount = 50000;

// const batchedMesh = new THREE.BatchedMesh( instanceCount, 24, 36, material);
// scene.add( batchedMesh );

// const geomId = batchedMesh.addGeometry( geometry );

// const dummy = new THREE.Object3D()

// for ( let i=0; i < instanceCount; i++ ){
//     const instanceId = batchedMesh.addInstance( geomId )
//     dummy.position.set(
//         Math.round( (Math.random() - 0.5) * 50 ),
//         Math.round( (Math.random() - 0.5) * 50 ),
//         Math.round( (Math.random() - 0.5) * 50 )
//     );

//     dummy.updateMatrix();
//     batchedMesh.setMatrixAt( instanceId, dummy.matrix );
// }
// batchedMesh.needsUpdate = true;
// batchedMesh.frustumCulled = false;




// // Basic Instancing with instancedMesh
// const geometry = new THREE.BoxGeometry(1,1,1);
// const material = new THREE.MeshBasicMaterial();

// const instanceCount = 50000;

// const instancedMesh = new THREE.InstancedMesh( geometry, material, instanceCount )

// const dummy = new THREE.Object3D()

// for ( let i=0; i < instanceCount; i++ ){

//     dummy.position.set(
//         Math.round( (Math.random() - 0.5) * 50 ),
//         Math.round( (Math.random() - 0.5) * 50 ),
//         Math.round( (Math.random() - 0.5) * 50 )
//     );

//     dummy.updateMatrix();
//     instancedMesh.setMatrixAt( i, dummy.matrix );
// }

// scene.add( instancedMesh )


// const loader_instance = new GLTFLoader().setPath('models/bim-model/');
// loader_instance.load('sixty5-mep.glb', (gltf) => {
    
//     let uuid_map = new Map();
//     let totalVertexCount = 0;
//     let totalIndexCount = 0;
//     let totalInstanceCount = 0;

//     const material = new THREE.MeshToonMaterial({
//         color:"#270a77",
//     });
    
//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             const geom = child.geometry
//             const geom_uuid = geom.uuid;
//             const inst_matrix = child.matrixWorld;
            
//             if ( !uuid_map.has( geom_uuid )){
//                 // If map does not have the uuid already, first create it
                
//                 uuid_map.set( geom_uuid, new Map() );

//                 uuid_map.get( geom_uuid ).set( "geometry", geom );
//                 uuid_map.get( geom_uuid ).set( "matrix", [] );

//                 uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

//                 totalVertexCount += geom.attributes.position.count;
//                 totalIndexCount += geom.index.count;
//                 totalInstanceCount += 1;
            
//             } else {
//                 // Map contains the uuid hence only need to push transformation matrix

//                 uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

//                 totalInstanceCount += 1;

//             };
//         };
//     });

//     const batchedMesh = new THREE.BatchedMesh(
//         totalInstanceCount,
//         totalVertexCount,
//         totalIndexCount,
//         material
//     );

//     uuid_map.forEach((value, key) => {
        
//         const geometry = value.get("geometry");
//         const matrices = value.get("matrix");
        
//         if (matrices.length > 0){
//             const geom_id = batchedMesh.addGeometry( geometry );

//             for ( let i=0; i < matrices.length; i++){
//                 const instanceId = batchedMesh.addInstance(geom_id)
//                 batchedMesh.setMatrixAt( instanceId, matrices[i] )
//             };
//         };
//     });
    
//     batchedMesh.needsUpdate = true;
//     scene.add(batchedMesh);

// })


// // BatchedMesh with LOD and SimplifyGeometry - mep model
// extendBatchedMeshPrototype();

// THREE.Mesh.prototype.raycast = acceleratedRaycast;
// THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

// let batchedMesh;

// async function init() {

//     let totalInstanceCount = 0;
//     let totalVertexCount = 0;
//     let totalIndexCount = 0;
    
//     let uuid_map = new Map();
    
//     const loader_instance = new GLTFLoader().setPath('models/bim-model/');
//     const gltf = await loader_instance.loadAsync('sixty5-mep.glb')
    
//     const meshes = [];

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
//             meshes.push( child )
//         };
//     });

//     for (const child of meshes) {
//         const geom = child.geometry
//         const geom_uuid = geom.uuid;
//         const inst_matrix = child.matrixWorld.clone();
        
//         // if (geom.index.count > 500){
//             if ( !uuid_map.has( geom_uuid )){
//                 // If map does not have the uuid already, first create it
                
//                 uuid_map.set( geom_uuid, new Map() );

//                 // const geometriesLODArray = await simplifyGeometriesByErrorLOD( [ geom ], 1, [0.1] );
//                 // const { vertexCount, indexCount, LODIndexCount } = getBatchedMeshLODCount( geometriesLODArray );

//                 uuid_map.get( geom_uuid ).set( "geometry", geometriesLODArray );
//                 uuid_map.get( geom_uuid ).set( "LODIndexCount", LODIndexCount[ 0 ] );
//                 uuid_map.get( geom_uuid ).set( "matrix", [] );

//                 uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

//                 totalVertexCount += vertexCount;
//                 totalIndexCount += indexCount;
//                 totalInstanceCount += 1;
            
//             } else {
//                 // Map contains the uuid hence only need to push transformation matrix

//                 uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

//                 totalInstanceCount += 1;
//             // };
//         };
//     };

//     batchedMesh = new THREE.BatchedMesh( totalInstanceCount, totalVertexCount, totalIndexCount, new THREE.MeshStandardMaterial() );

//     uuid_map.forEach((value, key) => {

//         const geometry = value.get("geometry");
//         const LODIndexCount = value.get("LODIndexCount")
//         const matrices = value.get("matrix");

//         if (geometry[0].length > 1){
//             const geometryLOD = geometry[ 0 ];
//             if (geometryLOD[1].index.count < geometryLOD[0].index.count){
//                 const geometryId = batchedMesh.addGeometry( geometryLOD[ 0 ], -1, LODIndexCount );
//                 batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 1 ], 10 );
//                 // batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 2 ], 10 );
//                 // batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 3 ], 15 );

//                 for ( let i=0; i < matrices.length; i++){
//                     const instanceId = batchedMesh.addInstance( geometryId )
//                     batchedMesh.setMatrixAt( instanceId, matrices[i] )
//                 };
//             };
//         };

//     });

//     batchedMesh.needsUpdate = true;
//     scene.add(batchedMesh);
// };

// init();

// const loader_instance = new GLTFLoader().setPath('models/bim-model/');
// loader_instance.load('sixty5-mep.glb', (gltf) => {
    
//     let material_map = new Map();
    
//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             const material = child.material
//             const geom = child.geometry
//             const geom_uuid = geom.uuid;
//             const inst_matrix = child.matrixWorld;
            
//             if ( !material_map.has( material )){
//                 material_map.set( material, {
//                     unique_geoms: new Map(),
//                     vCount: 0,
//                     iCount: 0,
//                     instCount: 1
//                 });
//             };
            
//             const data = material_map.get( material )
//             data.instCount++;

//             if ( !data.unique_geoms.has( geom_uuid ) ) {
//                 data.unique_geoms.set(geom_uuid, {
//                     geometry: geom,
//                     matrix: []
//                 });

//                 data.vCount += geom.attributes.position.count;
//                 data.iCount += geom.index.count;
//             };
            
//             data.unique_geoms.get(geom_uuid).matrix.push( inst_matrix )
//         };
//     });

//     material_map.forEach(( value,key ) => {
//         const batchedMesh = new THREE.BatchedMesh(
//             value.instCount,
//             value.vCount,
//             value.iCount,
//             key
//         );

//         value.unique_geoms.forEach((subvalue) => {
        
//             const geometry = subvalue.geometry;
//             const matrices = subvalue.matrix;
            
//             if (matrices.length > 0){
//                 const geom_id = batchedMesh.addGeometry( geometry );

//                 for ( let i=0; i < matrices.length; i++){
//                     const instanceId = batchedMesh.addInstance(geom_id)
//                     batchedMesh.setMatrixAt( instanceId, matrices[i] )
//                 };
//             };
//         });
        
//         batchedMesh.needsUpdate = true;
//         scene.add(batchedMesh);
//     });
// });



// const loader_instance = new GLTFLoader().setPath('models/bim-model/');
// loader_instance.load('sixty5-W-installatie-hires.glb', (gltf) => {
    
//     let material_map = new Map();
    
//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             const material = child.material
//             const geom = child.geometry
//             const geom_uuid = geom.uuid;
//             const inst_matrix = child.matrixWorld;
            
//             if ( !material_map.has( material )){
//                 material_map.set( material, {
//                     unique_geoms: new Map(),
//                     vCount: 0,
//                     iCount: 0,
//                     instCount: 1
//                 });
//             };
            
//             const data = material_map.get( material )
//             data.instCount++;

//             if ( !data.unique_geoms.has( geom_uuid ) ) {
//                 data.unique_geoms.set(geom_uuid, {
//                     geometry: geom,
//                     matrix: []
//                 });

//                 data.vCount += geom.attributes.position.count;
//                 data.iCount += geom.index.count;
//             };
            
//             data.unique_geoms.get(geom_uuid).matrix.push( inst_matrix )
//         };
//     });

//     material_map.forEach(( value,key ) => {
//         const batchedMesh = new THREE.BatchedMesh(
//             value.instCount,
//             value.vCount,
//             value.iCount,
//             key
//         );

//         value.unique_geoms.forEach((subvalue) => {
        
//             const geometry = subvalue.geometry;
//             const matrices = subvalue.matrix;
            
//             if (matrices.length > 0){
//                 const geom_id = batchedMesh.addGeometry( geometry );

//                 for ( let i=0; i < matrices.length; i++){
//                     const instanceId = batchedMesh.addInstance(geom_id)
//                     batchedMesh.setMatrixAt( instanceId, matrices[i] )
//                 };
//             };
//         });
        
//         batchedMesh.needsUpdate = true;
//         scene.add(batchedMesh);
//     });
// });

// // BatchedMesh with LOD and geometry simplification
// extendBatchedMeshPrototype();
// THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

// THREE.Mesh.prototype.raycast = acceleratedRaycast;
// THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

// const instanceCount = 10000;

// let batchedMesh;
// let geometryId;
// const dummy = new THREE.Object3D();

// async function init() {
//     const loader_batchLOD = new GLTFLoader().setPath('models/foot/');
//     const mesh = await loader_batchLOD.loadAsync('human-foot-hires.glb');
//     const geom = [ mesh.scene.children[0].geometry ];

//     const geometriesLODArray = await simplifyGeometriesByErrorLOD( geom, 3, performanceRangeLOD )
    
//     const { vertexCount, indexCount, LODIndexCount } = getBatchedMeshLODCount( geometriesLODArray );
// 	batchedMesh = new THREE.BatchedMesh( instanceCount, vertexCount, indexCount, new THREE.MeshStandardMaterial() );

//     for (let i=0; i < geometriesLODArray.length; i++){
//         const geometryLOD = geometriesLODArray[ i ];
// 		geometryId = batchedMesh.addGeometry( geometryLOD[ 0 ], - 1, LODIndexCount[ i ] );
//         batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 1 ], 5 );
// 		batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 2 ], 10 );
// 		batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 3 ], 15 );
//     };

//     for (let i = 0; i < instanceCount; i++ ){
//         const id = batchedMesh.addInstance( geometryId );
        
//         dummy.position.set(
//             Math.round( (Math.random() - 0.5) * 50 ),
//             Math.round( (Math.random() - 0.5) * 50 ),
//             Math.round( (Math.random() - 0.5) * 50 )
//         );

//         dummy.updateMatrix();
//         batchedMesh.setMatrixAt( id, dummy.matrix );
//     };
//     batchedMesh.needsUpdate = true;

//     batchedMesh.computeBVH( THREE.WebGLCoordinateSystem );
//     batchedMesh.onBeforeRender;

//     console.log(batchedMesh.bvh)

//     scene.add(batchedMesh);
// }

// init();

// const querySphere = new THREE.Sphere(new THREE.Vector3(), 10); // 20 units radius
// const visibleIds = [];

// function checkSphereIntersections() {

// }


// function checkSphereIntersections() {
//     if (!batchedMesh.bvh) return;

//     // Align sphere to camera
//     querySphere.center.copy(camera.position);
//     visibleIds.length = 0;

//     batchedMesh.bvh.shapecast({
//         // Broad phase: check if BVH node bounds intersect the sphere
//         intersectsBounds: (box) => querySphere.intersectsBox(box),

//         // Narrow phase: leaf node reached
//         intersectsRange: (offset, count) => {
//             for (let i = offset; i < offset + count; i++) {
//                 // The bvh.indices array maps BVH nodes back to instance IDs
//                 const instanceId = batchedMesh.bvh.indices[i];
//                 visibleIds.push(instanceId);
//             }
//         }
//     });

//     return visibleIds;
// }



// BatchedMesh with LOD
extendBatchedMeshPrototype();

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

const instanceCount = 20000;

let batchedMesh;

async function init() {
    const loader_batchLOD = new GLTFLoader().setPath('models/foot/');
    
    const [ hi, low ] = await Promise.all([
        loader_batchLOD.loadAsync('foot_base_mesh_reorder_original.glb'),
        loader_batchLOD.loadAsync('foot_base_mesh_reorder_decimate.glb')
    ]);
    
    const lod0 = hi.scene.children[0].geometry;
    const lod2 = low.scene.children[0].geometry;

    const LODArray = [ 
        lod0,
        lod2
    ];
    
    const vCount = (lod0.attributes.position.count + 
                        lod2.attributes.position.count);
    
    const iCount = (lod0.index.count + 
                        lod2.index.count);

    const lod0_iCount = lod0.index.count;

    console.log( LODArray );

    const dummy = new THREE.Object3D();

    batchedMesh = new THREE.BatchedMesh( instanceCount, vCount, iCount, new THREE.MeshStandardMaterial());

    const geometryId = batchedMesh.addGeometry( LODArray[0], vCount, iCount );
    batchedMesh.addGeometryLOD( geometryId, LODArray[1], 5);

    for (let i = 0; i < instanceCount; i++ ){
        const id = batchedMesh.addInstance( geometryId );
        
        dummy.position.set(
            Math.round( Math.random() * 50 ),
            Math.round( Math.random() * 50 ),
            Math.round( Math.random() * 50 )
        );

        dummy.updateMatrix();
        batchedMesh.setMatrixAt( id, dummy.matrix );
        batchedMesh.needsUpdate = true;
    };

    scene.add(batchedMesh);
}

init();




// Batched Mesh Loader

// const loader = new GLTFLoader().setPath('models/bim-model/');
// loader.load('sixty5-interiors-kitchens.glb', (gltf) => {
//     const materials = new Map()

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             if (!materials.has(child.material.name)) {
//                 materials.set(child.material.name, []);
//                 materials.get(child.material.name).push(child);
//             } else {
//                 materials.get(child.material.name).push(child);
//             }
//         }    
//     });

//     materials.forEach((meshes, mat) => {
//         let totalVertexCount = 0;
//         let totalIndexCount = 0;

//         meshes.forEach((m) => {
//             totalVertexCount += m.geometry.attributes.position.count;
//             totalIndexCount += m.geometry.index.count;
//         })

//         const batchedMesh = new THREE.BatchedMesh(
//             meshes.length,
//             totalVertexCount,
//             totalIndexCount,
//             meshes[0].material
//         )

//         meshes.forEach((m,i) => {
//             const geometryId = batchedMesh.addGeometry(m.geometry);
//             const instanceId = batchedMesh.addInstance(geometryId);

//             m.updateMatrixWorld();
//             batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
//         })

//         scene.add(batchedMesh);
//     })
// })

// const loader_2 = new GLTFLoader().setPath('models/bim-model/');
// loader_2.load('sixty5-structural.glb', (gltf) => {
//     const materials = new Map()

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             if (!materials.has(child.material.name)) {
//                 materials.set(child.material.name, []);
//                 materials.get(child.material.name).push(child);
//             } else {
//                 materials.get(child.material.name).push(child);
//             }
//         }    
//     });

//     materials.forEach((meshes, mat) => {
//         let totalVertexCount = 0;
//         let totalIndexCount = 0;

//         meshes.forEach((m) => {
//             totalVertexCount += m.geometry.attributes.position.count;
//             totalIndexCount += m.geometry.index.count;
//         })

//         const batchedMesh = new THREE.BatchedMesh(
//             meshes.length,
//             totalVertexCount,
//             totalIndexCount,
//             meshes[0].material
//         )

//         meshes.forEach((m,i) => {
//             const geometryId = batchedMesh.addGeometry(m.geometry);
//             const instanceId = batchedMesh.addInstance(geometryId);

//             m.updateMatrixWorld();
//             batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
//         })

//         scene.add(batchedMesh);
//     })
// })

// const loader_3 = new GLTFLoader().setPath('models/bim-model/');
// loader_3.load('sixty5-mep.glb', (gltf) => {
//     const materials = new Map()

//     console.log(gltf.scene)

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             if (!materials.has(child.material.name)) {
//                 materials.set(child.material.name, []);
//                 materials.get(child.material.name).push(child);
//             } else {
//                 materials.get(child.material.name).push(child);
//             }
//         }    
//     });

//     materials.forEach((meshes, mat) => {
//         let totalVertexCount = 0;
//         let totalIndexCount = 0;

//         meshes.forEach((m) => {
//             totalVertexCount += m.geometry.attributes.position.count;
//             totalIndexCount += m.geometry.index.count;
//         })

//         const batchedMesh = new THREE.BatchedMesh(
//             meshes.length,
//             totalVertexCount,
//             totalIndexCount,
//             meshes[0].material
//         )

//         meshes.forEach((m,i) => {
//             const geometryId = batchedMesh.addGeometry(m.geometry);
//             const instanceId = batchedMesh.addInstance(geometryId);

//             m.updateMatrixWorld();
//             batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
//         })

//         scene.add(batchedMesh);
//     })
// })

// const loader_4 = new GLTFLoader().setPath('models/bim-model/');
// loader_4.load('sixty5-W-installatie-hires.glb', (gltf) => {
//     const materials = new Map()

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             if (!materials.has(child.material.name)) {
//                 materials.set(child.material.name, []);
//                 materials.get(child.material.name).push(child);
//             } else {
//                 materials.get(child.material.name).push(child);
//             }
//         }    
//     });

//     materials.forEach((meshes, mat) => {
//         let totalVertexCount = 0;
//         let totalIndexCount = 0;

//         meshes.forEach((m) => {
//             totalVertexCount += m.geometry.attributes.position.count;
//             totalIndexCount += m.geometry.index.count;
//         })

//         const batchedMesh = new THREE.BatchedMesh(
//             meshes.length,
//             totalVertexCount,
//             totalIndexCount,
//             meshes[0].material
//         )

//         meshes.forEach((m,i) => {
//             const geometryId = batchedMesh.addGeometry(m.geometry);
//             const instanceId = batchedMesh.addInstance(geometryId);

//             m.updateMatrixWorld();
//             batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
//         })

//         scene.add(batchedMesh);
//     })
// })

// const loader_5 = new GLTFLoader().setPath('models/bim-model/');
// loader_5.load('sixty5-architectural.glb', (gltf) => {
//     const materials = new Map()

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
            
//             if (!materials.has(child.material.name)) {
//                 materials.set(child.material.name, []);
//                 materials.get(child.material.name).push(child);
//             } else {
//                 materials.get(child.material.name).push(child);
//             }
//         }    
//     });

//     materials.forEach((meshes, mat) => {
//         let totalVertexCount = 0;
//         let totalIndexCount = 0;

//         meshes.forEach((m) => {
//             totalVertexCount += m.geometry.attributes.position.count;
//             totalIndexCount += m.geometry.index.count;
//         })

//         const batchedMesh = new THREE.BatchedMesh(
//             meshes.length,
//             totalVertexCount,
//             totalIndexCount,
//             meshes[0].material
//         )

//         meshes.forEach((m,i) => {
//             const geometryId = batchedMesh.addGeometry(m.geometry);
//             const instanceId = batchedMesh.addInstance(geometryId);

//             m.updateMatrixWorld();
//             batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
//         })

//         scene.add(batchedMesh);
//     })
// })

// const loader_5 = new GLTFLoader().setPath('models/bim-model/');
// loader_5.load('sixty5-architectural.glb', (gltf) => {
//     const meshes = [];

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
//             meshes.push(child);
//         }
//     });

//     let totalVertexCount = 0;
//     let totalIndexCount = 0;

//     meshes.forEach((m) => {
//         totalVertexCount += m.geometry.attributes.position.count;
//         totalIndexCount += m.geometry.index.count;
//     })

//     const batchedMesh = new THREE.BatchedMesh(
//         meshes.length,
//         totalVertexCount,
//         totalIndexCount,
//         new THREE.MeshToonMaterial({
//             color: "#1980af"
//         })
//     )

//     batchedMesh.matrix.identity();
//     batchedMesh.position.set(0, 0, 0);
//     batchedMesh.scale.set(1, 1, 1);

//     meshes.forEach((m,i) => {
//         const geom = m.geometry.clone();
//         m.updateMatrixWorld();
//         geom.applyMatrix4(m.matrixWorld);
        
//         const geometryId = batchedMesh.addGeometry(geom);
//         const instanceId = batchedMesh.addInstance(geometryId);

//         m.updateMatrixWorld();
//         batchedMesh.setMatrixAt(instanceId, new THREE.Matrix4());
//     })

//     scene.add(batchedMesh);
// })

// // Batched Loader
// const loader = new GLTFLoader();

// loader.load('models/piperack/piperacks-batching-test.glb', (gltf) => {    
//     const gltfScene = gltf.scene;
//     console.log(gltf.scene)

//     const objects = new Map()
//     const batchLOD = new THREE.LOD()

//     gltfScene.traverse((child) => {
//         if (child.isMesh) {
//             if (child.name === "Merged_Output") {
//                 objects.set(child.name, child)
            
//             } else {
//                 const [obj, res] = child.name.split(';')

//                 if (!objects.has(obj)) {
//                     objects.set(obj, new Map())
//                     objects.get(obj).set(res, child)

//                 } else {
//                     objects.get(obj).set(res, child)
//                 }
//             }
//         }
//     })

//     objects.forEach((res_map, object_id) => {
//         if (object_id === 'Merged_Output') {
//             batchLOD.addLevel(res_map, 10)
//         } else {
        
//             const lod = new THREE.LOD()

//             let hires_pos = res_map.get('hires').position
//             let worldPos = new THREE.Vector3();
//             let worldQuat = new THREE.Quaternion();
//             let worldScale = new THREE.Vector3();
            
//             res_map.get('hires').updateMatrixWorld(true)

//             res_map.get('hires').matrixWorld.decompose(worldPos, worldQuat, worldScale);
            
//             lod.position.copy(hires_pos)
//             lod.quaternion.copy(worldQuat);
//             lod.scale.copy(worldScale);

//             res_map.forEach((mesh, resolution) => {
//                 mesh.position.set(0, 0, 0);
//                 mesh.quaternion.set(0, 0, 0, 1);
//                 mesh.scale.set(1, 1, 1);

//                 if (resolution === 'hires') {
//                     lod.addLevel(mesh, 0)
//                 } else {
//                     lod.addLevel(mesh, 5)
//                 }
//             })

//             batchLOD.addLevel(lod,0)
//         }
//     });
//     scene.add(batchLOD)
// })



// Dynamic LOD Loader
// const loader = new GLTFLoader();

// loader.load('models/piperack/piperacks_lod_working_4.glb', (gltf) => {    
//     const gltfScene = gltf.scene;

//     const objects = new Map()

//     gltfScene.traverse((child) => {
//         if (child.isMesh) {
//             const [obj, res] = child.name.split(';')

//             if (!objects.has(obj)) {
//                 objects.set(obj, new Map())
//                 objects.get(obj).set(res, child)

//             } else {
//                 objects.get(obj).set(res, child)
//             }
//         }
//     })

//     objects.forEach((res_map, object_id) => {
//         const lod = new THREE.LOD()

//         let hires_pos = res_map.get('hires').position
//         let worldPos = new THREE.Vector3();
//         let worldQuat = new THREE.Quaternion();
//         let worldScale = new THREE.Vector3();
        
//         res_map.get('hires').updateMatrixWorld(true)

//         res_map.get('hires').matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
//         lod.position.copy(hires_pos)
//         lod.quaternion.copy(worldQuat);
//         lod.scale.copy(worldScale);

//         res_map.forEach((mesh, resolution) => {
//             mesh.position.set(0, 0, 0);
//             mesh.quaternion.set(0, 0, 0, 1);
//             mesh.scale.set(1, 1, 1);

//             if (resolution === 'hires') {
//                 lod.addLevel(mesh, 0)
//             } else {
//                 lod.addLevel(mesh, 5)
//             }
//         })

//         scene.add(lod)
//     })
// })

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // // 1. Reset visibility (Blunt approach: hide all)
    // for (let i = 0; i < instanceCount; i++) {
    //     batchedMesh.setVisibleAt(i, false);
    // }

    // // 2. Perform intersection test
    // const intersected = checkSphereIntersections();

    // // 3. Show only intersected instances
    // for (let i = 0; i < intersected.length; i++) {
    //     batchedMesh.setVisibleAt(intersected[i], true);
    // }
    
    renderer.render(scene, camera);

    perfMonitor.update(renderer, scene);
};

animate();