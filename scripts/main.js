import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './performance_monitor.js'

import { acceleratedRaycast, computeBatchedBoundsTree } from 'three-mesh-bvh';

import { createRadixSort, extendBatchedMeshPrototype, getBatchedMeshLODCount } from '@three.ez/batched-mesh-extensions';
import { performanceRangeLOD, simplifyGeometriesByErrorLOD } from '@three.ez/simplify-geometry';

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

// // // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-mep-lowres.glb', (gltf) => { // 'piperacks_merged.glb
//     const mesh = gltf.scene;
//     console.log(gltf.scene);
//     mesh.position.set(0,0,0);
//     mesh.material = new THREE.MeshToonMaterial({
//         color:"#270a77",
//     });
//     scene.add(mesh);
// })

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



// BatchedMesh with LOD
extendBatchedMeshPrototype();

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

const instanceCount = 10000;

let batchedMesh;

async function init() {
    const loader_batchLOD = new GLTFLoader().setPath('models/foot/');
    
    const [ hi, med, low ] = await Promise.all([
        loader_batchLOD.loadAsync('human-foot-hires.glb'),
        loader_batchLOD.loadAsync('human-foot-medres.glb'),
        loader_batchLOD.loadAsync('human-foot-lowres.glb')
    ]);
    
    const lod0 = hi.scene.children[0].geometry;
    const lod1 = med.scene.children[0].geometry;
    const lod2 = low.scene.children[0].geometry;

    const LODArray = [ 
        lod0,
        lod1,
        lod2
    ];
    
    const vCount = (lod0.attributes.position.count + 
                        lod1.attributes.position.count + 
                        lod2.attributes.position.count);
    
    const iCount = (lod0.index.count + 
                        lod1.index.count + 
                        lod2.index.count);

    const lod0_iCount = lod0.index.count;

    console.log( LODArray );

    const dummy = new THREE.Object3D();

    batchedMesh = new THREE.BatchedMesh( instanceCount, vCount, iCount, new THREE.MeshStandardMaterial());

    const geometryId = batchedMesh.addGeometry( LODArray[0], vCount, iCount );
    batchedMesh.addGeometryLOD( geometryId, LODArray[1], 5);
    batchedMesh.addGeometryLOD( geometryId, LODArray[2], 10);

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


// // // BatchedMesh with LOD for Pipe Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-mep.glb', (gltf) => { // 'piperacks_merged.glb
//     // console.log(gltf.scene);
//     let testVec = new THREE.Vector3(0, 52.5, 0)

//     const namesArray = [ "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE2320927",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE2320953",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1443",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1444",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1446",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3065586",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1447",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1448",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3066494",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1450",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3065588",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1451",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1452",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1453",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1454",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1455",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1456",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1457",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1458",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1459",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1460",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1461",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1462",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1463",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1464",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1465",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1466",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1467",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1468",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1469",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1470",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3069802",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1471",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1472",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1473",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1474",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1475",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1476",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1477",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1478",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1479",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1480",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1481",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1482",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1483",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1484",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1485",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1486",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1487",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3071984",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1488",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1489",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1490",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1491",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1492",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1493",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1494",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1495",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1496",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1497",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1498",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1499",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1500",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1501",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1502",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1503",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3072976",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1504",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1505",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1506",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1507",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1508",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1509",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3074666",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1510",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1511",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1512",
//                     "IfcFlowSegmentPipe_TypesGeberit_PE_Binnenriolering_PE_5m3081",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1513",
//                     "IfcFlowSegmentPipe_TypesDYKA_PE_Binnenriolering_PE3074897",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu1514",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_50m3641108",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646764",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646337",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646772",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646803",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646374",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3646813",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3647207",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3647240",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3647219",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648024",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648331",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648006",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648070",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3647250",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648104",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648036",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648367",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648058",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648341",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648762",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648781",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3648375",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3649150",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3649140",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3649361",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655320",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655547",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655488",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655733",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655739",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655563",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656216",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656138",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655970",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656264",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656247",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3655976",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656297",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656470",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656386",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656104",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656506",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656370",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656551",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656668",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657351",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657433",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657187",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3656949",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657458",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657508",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657111",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657449",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3657521",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663499",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663490",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663494",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663501",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663503",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663510",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663505",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663512",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663514",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663516",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663524",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663530",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663532",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663549",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663528",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663543",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663534",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663545",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663536",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663560",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663558",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663551",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663565",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663576",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663567",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663574",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663584",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663579",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663588",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663590",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663570",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663612",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663618",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663626",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663603",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663623",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663647",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663631",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663652",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663642",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663684",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663637",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663679",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663689",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663668",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663674",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663597",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663657",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3665923",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3666706",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3666596",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3666828",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_50m3666809",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_50m3666754",
//                     "IfcFlowSegmentPipe_TypesUponor_MLCP_Leiding_wit_100m3663608",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2082",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2083",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2085",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2086",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2088",
//                     "IfcFlowSegmentPipe_TypesDYKA_PP_Binnenriolering_Afvoerbu2090"
//             ];

//     let drawObj = [];
    
//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
//             const isClose = testVec.distanceToSquared(child.position) < 0.0001; 
//             if (namesArray.includes(child.name)){
//                 drawObj.push(child)
//                 console.log(child)
//             }
//         }
//         // console.log(child.position)
//     })
//     // console.log(drawObj)

//     drawObj.forEach((obj) => {
//         scene.attach(obj)
//     })
//     // scene.add(mesh);
// })




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
    renderer.render(scene, camera);

    perfMonitor.update(renderer, scene);
};

animate();