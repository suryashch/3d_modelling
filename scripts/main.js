import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './utils/performanceMonitor.js'
import { FrameProfiler } from './utils/frameProfiler.js';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { ObjectBVH, acceleratedRaycast, INTERSECTED, NOT_INTERSECTED, computeBatchedBoundsTree } from 'three-mesh-bvh';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const mouse = new THREE.Vector2();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(-70,70,50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.minDistance=0.1;
controls.maxDistance=150;
controls.minPolarAngle=0;
controls.maxPolarAngle=3;
controls.autoRotate=false;
controls.target = new THREE.Vector3(21, 30, -30);
controls.rotateSpeed = 0.15;
controls.zoomSpeed = 0.50;
controls.panSpeed = 0.50;
controls.update();

const stats = new Stats();
document.body.appendChild( stats.dom );

const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set( 10,10,0 )
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Color, Intensity
scene.add(ambientLight);

const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
gridHelper.position.set(21, -1, -30);
scene.add( gridHelper );

const perfMonitor = new PerformanceMonitor();
const profiler = new FrameProfiler(60);

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;

const CONSTANTS = {
    SEARCH_RADIUS: 15,
    FOCUS_RADIUS: 15,
    changeLODcolor: true
}

const bvh_group = new THREE.Group();

// Basic BatchedMesh

const loader = new GLTFLoader().setPath('models/bim-model/')

const facade_group = await initFacade( loader, [
        "sixty5-structural.glb",
        "sixty5-architectural-noglass_facade.glb",
        "sixty5-architectural-noglass_structural_interior.glb"
    ]
);
bvh_group.add(facade_group);

const interior_group = await initInterior( loader, [
        "sixty5-interiors-kitchens_hires.glb",
        "sixty5-interiors-kitchens_lowres.glb",
        "sixty5-architectural-noglass_interiors.glb"
    ]
);
bvh_group.add(interior_group);

const focus_group = await initFocus( loader, [
        "sixty5-W-installatie_hires.glb",
        "sixty5-W-installatie_lowres.glb",
        "sixty5-mep_hires.glb",
        "sixty5-mep_lowres.glb"
    ]
);
bvh_group.add(focus_group);

scene.add(bvh_group);

const bvh = new ObjectBVH( bvh_group );

async function initFacade( loader, _files ) {
    let material_map = new Map();
    const facade_group = new THREE.Group();
    
    for (const file of _files) {
        let gltf = await loader.loadAsync( file );
        
        material_map = await createMaterialMap( gltf, material_map );
    };

    for (let material of material_map.keys()) {
        let meshes = material_map.get( material );
        let bm = await createBatchedMesh( meshes, material );
        
        facade_group.add( bm );
    };
    facade_group.parentName = "facade";
    // scene.add( facade_group );
    return facade_group;
};


async function initInterior( loader, _files ) {
    let material_map = new Map();
    const interior_group = new THREE.Group();

    const defaultMaterial = new THREE.MeshStandardMaterial({
        color: "#7f7f7f",
        transparent: true
    })

    for (const file of _files) {
        let gltf = await loader.loadAsync( file );
        const [name, res] = file.split("_");
        
        if (res === "hires.glb") {
            material_map = await createMaterialMap( gltf, material_map, defaultMaterial );
        } else if (res === "lowres.glb") {
            material_map = await appendMaterialMap( gltf, material_map, defaultMaterial );
        } else {
            material_map = await createMaterialMap( gltf, material_map )
        };
    };

    for (let material of material_map.keys()) {
        let meshes = material_map.get( material );
        let bm = await createBatchedMesh( meshes, material );

        interior_group.add( bm );
    };
    interior_group.parentName = "interior";
    // scene.add( interior_group );
    // console.log(interior_group);
    return interior_group;
};

async function initFocus( loader, _files ) {
    let material_map = new Map();
    const focus_group = new THREE.Group();

    const defaultMaterial = new THREE.MeshStandardMaterial({
        color: "#7f7f7f",
        transparent: true
    });

    for (const file of _files) {
        let gltf = await loader.loadAsync( file );
        const [name, res] = file.split("_");

        if (res === "hires.glb") {
            material_map = await createMaterialMap( gltf, material_map, defaultMaterial );
        } else {
            material_map = await appendMaterialMap( gltf, material_map, defaultMaterial );
        }
    };

    for (let material of material_map.keys()) {
        let meshes = material_map.get( material );
        let bm = await createBatchedMesh( meshes, material );

        focus_group.add( bm );
    };
    focus_group.parentName = "focus";
    
    return focus_group;
};


function createBatchedMesh( meshes, material ){

    const batchedMesh = new THREE.BatchedMesh(
        meshes.instCount,
        meshes.vCount,
        meshes.iCount,
        material
    );

    meshes.unique_geoms.forEach((mesh) => {
        const geom = mesh.geometry;
        const lowres_geom = mesh.lowres_geometry;
        const matrices = mesh.matrices;

        if (matrices.length > 0){
            const geom_id = batchedMesh.addGeometry( geom );
            let lowres_geom_id;

            if ( lowres_geom ) {
                lowres_geom_id = batchedMesh.addGeometry( lowres_geom );
            } else {
                lowres_geom_id = geom_id;
            }

            for ( let i=0; i < matrices.length; i++){
                const instanceId = batchedMesh.addInstance(lowres_geom_id)
                batchedMesh.setMatrixAt( instanceId, matrices[i] )

            };
        };

    });

    batchedMesh.needsUpdate = true;
    return batchedMesh;

}

function appendMaterialMap(gltf, material_map, defMaterial=null ) {
    let visited = new Set();

    gltf.scene.traverse(( child ) => {

        if ( 
            child.userData.mesh_id &&
            !visited.has(child.userData.mesh_id)
        ) {
            const meshId = child.userData.mesh_id;

            let material;
            let geometry;

            if (child.children.length > 0){
                child = child.children[0]     // If the obejct has more than one child (due to mutliple materials) only select the first
            };

            geometry = child.geometry;

            if ( defMaterial ) {
                material = defMaterial;
            } else {
                material = child.material;
            }
            
            let material_key;

            if ( !material_map.has(material) ) {
                for (let material in material_map.keys()) {   // If material map does not have material, loop through all mesh ids until we find it
                    if (material.has( meshId )) {
                        material_key = material_map.get( material );
                        break;
                    }
                };
                
                return;

            } else {
                material_key = material_map.get( material );
            }

            if (material_key.unique_geoms.has( meshId )) {
                material_key.unique_geoms.get( meshId ).lowres_geometry = geometry;

                material_key.instCount++;
                material_key.vCount += geometry.attributes.position.count;
                material_key.iCount += geometry.index.count;
            }
            
        }
    });

    return material_map;
}

function createMaterialMap( gltf, material_map, defMaterial=null ){

    gltf.scene.traverse((child) => {
        if ( child.userData.mesh_id ) {
            
            const meshId = child.userData.mesh_id;

            let material;
            let geometry;
            let inst_matrix;
            
            if (child.children.length > 0){
                child = child.children[0]     // If the obejct has more than one child (due to mutliple materials) only select the first
            };

            geometry = child.geometry;
            inst_matrix = child.matrixWorld;

            if ( defMaterial ) {
                material = defMaterial;
            } else {
                material = child.material;
            }

            if ( !material_map.has( material ) ) {
                material_map.set( material, {
                    unique_geoms: new Map(),
                    vCount: 0,
                    iCount: 0,
                    instCount: 0
                });
            };

            const material_key = material_map.get( material );
            material_key.instCount++;

            if ( !material_key.unique_geoms.has( meshId )) {
                material_key.unique_geoms.set( meshId, {
                    geometry: null,
                    lowres_geometry: null,
                    matrices: []
                });

                material_key.vCount += geometry.attributes.position.count;
                material_key.iCount += geometry.index.count;
            
            } 
            
            material_key.unique_geoms.get( meshId ).geometry = geometry;
            material_key.unique_geoms.get( meshId ).matrices.push( inst_matrix );            

        };
    });

    return material_map
}

// let bvh_struct;
// let batchedMesh_struct;

// initBase();

// async function initBase() {
//     const loader_instance = new GLTFLoader().setPath('models/bim-model/');

//     const meshes_1 = [];
//     const meshes_2 = [];

//     let totalVertexCount_1 = 0;
//     let totalIndexCount_1 = 0;
//     let totalInstanceCount_1 = 0

//     let totalVertexCount_2 = 0;
//     let totalIndexCount_2 = 0;
//     let totalInstanceCount_2 = 0;

//     let material_map_1 = new Map();
//     let material_map_2 = new Map();
    
//     const [gltf_1, gltf_2] = await Promise.all([
//         loader_instance.loadAsync('sixty5-architectural-noglass_rev2.glb'), //'sixty5-architectural-noglass_rev1.glb'
//         loader_instance.loadAsync('sixty5-structural.glb')
//     ])

//     gltf_1.scene.traverse((child) => {
//         if (child.userData.mesh_id) {
//             meshes_1.push(child);
//         }
//     });

//     gltf_2.scene.traverse((child) => {
//         if (child.userData.mesh_id) {
//             meshes_2.push(child);
//         }
//     });

//     meshes_1.forEach((value) => {
//         let child;
//         const meshID = value.userData.mesh_id;
        
//         if (value.children.length > 0) {
//             child = value.children[0];
//         } else { child = value };


//         const material = child.material;
//         material.transparent = true;
//         const geom = child.geometry;
        
//         child.updateMatrixWorld(true);
//         const inst_matrix = child.matrixWorld;

//         if ( !material_map_1.has( material ) ) {
//             material_map_1.set( material, {
//                 unique_geoms: new Map(),
//                 vCount: 0,
//                 iCount: 0,
//                 instCount: 0
//             });
//         };

//         const material_key = material_map_1.get( material );
//         material_key.instCount++;
            
//         if ( !material_key.unique_geoms.has( meshID )) {
//             material_key.unique_geoms.set( meshID, {
//                 geometry: geom,
//                 matrices: []
//             });

//             material_key.vCount += geom.attributes.position.count;
//             material_key.iCount += geom.index.count;
        
//         } 

//         material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
//     });

//     meshes_2.forEach((value) => {
//         let child;
//         const meshID = value.userData.mesh_id;
        
//         if (value.children.length > 0) {
//             child = value.children[0];
//         } else { child = value };
        
//         const material = child.material;
//         material.transparent = true;
//         const geom = child.geometry;
        
//         child.updateMatrixWorld(true);
//         const inst_matrix = child.matrixWorld.clone();

//         if ( !material_map_2.has( material ) ) {
//             material_map_2.set( material, {
//                 unique_geoms: new Map(),
//                 vCount: 0,
//                 iCount: 0,
//                 instCount: 0
//             });
//         };

//         const material_key = material_map_2.get( material );
//         material_key.instCount++;
            
//         if ( !material_key.unique_geoms.has( meshID )) {
//             material_key.unique_geoms.set( meshID, {
//                 geometry: geom,
//                 matrices: []
//             });

//             material_key.vCount += geom.attributes.position.count;
//             material_key.iCount += geom.index.count;
        
//         } 

//         material_key.unique_geoms.get( meshID ).matrices.push( inst_matrix );
//     });

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

//         });
        
//         bm_1.needsUpdate = true;

//         bvh_group.add( bm_1 );

//     });

//     material_map_2.forEach((value, key) => {
//         const material = key;

//         const bm_2 = new THREE.BatchedMesh(
//             value.instCount,
//             value.vCount,
//             value.iCount,
//             key
//         );

//         value.unique_geoms.forEach((mesh) => {
//             const geom = mesh.geometry;
//             const matrices = mesh.matrices;

//             if (matrices.length > 0){
//                 const geom_id = bm_2.addGeometry( geom );

//                 for ( let i=0; i < matrices.length; i++){
//                     const instanceId = bm_2.addInstance(geom_id)
//                     bm_2.setMatrixAt( instanceId, matrices[i] )

//                 };
//             };

//         });
        
//         bm_2.needsUpdate = true;

//         bvh_group.add( bm_2 );

//     });
    
//     scene.add( bvh_group );
//     bvh_struct = new ObjectBVH( bvh_group );

//     return true;
// }

// let totalVertexCount = 0;
// let totalIndexCount = 0;
// let totalInstanceCount = 0;

// let hiresGeomIdFor = [];
// let lowresGeomIdFor = [];

// let batchedMesh;
// let bvh;
// let final_map = new Map();


// initDetails();

// async function initDetails() {
//     renderer.render(scene, camera);
//     const loader = new GLTFLoader().setPath( 'models/bim-model/' );
    
//     const status = await loadFiles( loader );
    
//     requestRender();

//     configGUI();

// };

// async function loadFiles( loader ) {
    
//     // Need to sequentially populate the mesh_map

//     const _files = [
//         "sixty5-W-installatie_hires.glb",
//         "sixty5-W-installatie_lowres.glb",
//         "sixty5-mep_hires.glb",
//         "sixty5-mep_lowres.glb"
//         // "sixty5-interiors-kitchens_hires.glb"
//         // "sixty5-interiors-kitchens_lowres.glb"
//     ];

//     for (const fileName of _files) {

//         let gltf = await loadGLTFfile( loader, fileName );
        
//         const [name, res] = fileName.split("_");
        
//         if (res === 'hires.glb') final_map = await initMap( gltf, final_map );
//         if (res === 'lowres.glb') final_map = await appendMap( gltf, final_map );
        
//         gltf = null;

//     };
    
//     batchedMesh = await generateBatchedMesh( final_map );
//     bvh = new ObjectBVH( batchedMesh );
//     scene.add( batchedMesh );

//     return true;
// };

// function loadGLTFfile( loader, fileName ) {
//     const gltf = loader.loadAsync( fileName );

//     return gltf;
// }

// function generateBatchedMesh( final_map, material = new THREE.MeshStandardMaterial()) {

//     const bm = new THREE.BatchedMesh(
//         totalInstanceCount, 
//         totalVertexCount, 
//         totalIndexCount, 
//         material
//     );
    
//     final_map.forEach(( value, key ) => {

//         const hires_geometry = value.get( "geometry_hires" );
//         const matrices = value.get( "matrix" );

//         if (matrices.length > 0) {
            
//             const hires_geomId = bm.addGeometry( hires_geometry );
            
//             let lowres_geomId

//             if ( value.has( "geometry_lowres" ) ) {
//                 lowres_geomId = bm.addGeometry( value.get( "geometry_lowres" ) );
//             } else {
//                 lowres_geomId = hires_geomId; 
//             }

//             for ( let i=0; i < matrices.length; i++ ){

//                 const instanceId = bm.addInstance( lowres_geomId );

//                 bm.setMatrixAt( instanceId, matrices[i] );

//                 hiresGeomIdFor[ instanceId ] = hires_geomId;
//                 lowresGeomIdFor[ instanceId ] = lowres_geomId;
//             };

//         };
//     });

//     // Memory Management
//     final_map.forEach(( value ) => {
//         const hires = value.get( "geometry_hires" );
//         if ( hires ) hires.dispose();

//         const lowres = value.get( "geometry_lowres" );
//         if ( lowres && lowres !== hires ) lowres.dispose();
//     });

//     final_map.clear();
//     final_map = null;
    
//     bm.needsUpdate = true;
//     return bm;
// };

// function initMap( gltf, mesh_map ) {

//     gltf.scene.traverse(( child ) => {

//         if ( child.isMesh ){ 

//             const geom = child.geometry;
//             const mesh_id = child.userData.mesh_id;
            
//             const inst_matrix = child.matrixWorld.clone();

//             if ( !mesh_map.has( mesh_id )) {
                
//                 // If map does not have the uuid already, first create it
//                 mesh_map.set( mesh_id, new Map() );

//                 mesh_map.get( mesh_id ).set( "geometry_hires", geom );
//                 mesh_map.get( mesh_id ).set( "matrix", [] );

//                 mesh_map.get( mesh_id ).get( "matrix" ).push( inst_matrix );

//                 totalVertexCount += geom.attributes.position.count;
//                 totalIndexCount += geom.index.count;
//                 totalInstanceCount += 1;
            
//             } else {
                
//                 // Map contains the uuid hence only need to push transformation matrix

//                 mesh_map.get( mesh_id ).get( "matrix" ).push( inst_matrix );
//                 totalInstanceCount += 1;

//             };
//         };
//     });

//     return mesh_map;
// };

// function appendMap( gltf, mesh_map ) {

//     let visited = new Set();

//     gltf.scene.traverse(( child ) => {

//         if ( 
//             child.isMesh && 
//             mesh_map.has( child.userData.mesh_id ) &&
//             !visited.has(child.userData.mesh_id)
//         ) {
//             const mesh_id = child.userData.mesh_id;
//             const geom = child.geometry;
            
//             mesh_map.get( mesh_id ).set( "geometry_lowres", geom );

//             totalVertexCount += geom.attributes.position.count;
//             totalIndexCount += geom.index.count;
//             totalInstanceCount += 1;

//             visited.add( mesh_id );
            
//         };
//     });

//     return mesh_map;
// };


// const querySphere = new THREE.Sphere();
// let prevNear = new Set();
// let prevStruct = new Map();

// const highlightColor = new THREE.Color( "#F600C1" );
// const nonHighlightColor = new THREE.Color( "#d8d8d8" );

// const structOpaque = new THREE.Vector4(1.0, 1.0, 1.0, 1.0);
// const structTrans = new THREE.Vector4(0, 0, 0.55, 0.35);

// function queryNearInstances( cameraPos ) {

//     const nearIds = new Set();
//     const structIds = new Map();

//     querySphere.center.copy( cameraPos );
//     querySphere.radius = CONSTANTS.SEARCH_RADIUS;

//     bvh.shapecast({

//         intersectsBounds : ( box ) => {

//             if (!querySphere.intersectsBox( box )) return NOT_INTERSECTED;
//             return INTERSECTED;
//         },
//         intersectsObject : ( object, instanceId ) => {

//             nearIds.add( instanceId );
//             return false;
//         }

//     });

//     querySphere.radius = CONSTANTS.FOCUS_RADIUS;

//     bvh_struct.shapecast({
//         intersectsBounds : ( box ) => {

//             if (!querySphere.intersectsBox( box )) return NOT_INTERSECTED;
//             return INTERSECTED;
//         },
//         intersectsObject : ( object, instanceId ) => {

//             structIds.set( instanceId, object );
//             return false;
//         }
//     })

//     return [nearIds, structIds];
// };

// function updateLODs( cameraPos ) {

//     const test = new Set();
//     const [newNear, newStruct] = queryNearInstances( cameraPos );

//     newNear.forEach(( id ) => {

//         if (!prevNear.has( id )) {

//             batchedMesh.setGeometryIdAt( id, hiresGeomIdFor[ id ] );
//             if ( CONSTANTS.changeLODcolor ) {
//                 batchedMesh.setColorAt( id, highlightColor );
//             }
//         };
//     });

//     prevNear.forEach(( id ) =>{

//         if (!newNear.has( id )) {

//             batchedMesh.setGeometryIdAt( id, lowresGeomIdFor[ id ] );
//             batchedMesh.setColorAt( id, nonHighlightColor );
//         };
//     });

//     newStruct.forEach((object, id) => {
//         if ( !prevStruct.has( id )) {

//             // batchedMesh_struct.setColorAt( id, structTrans );
//             object.setColorAt( id, structTrans );
//         };
//     })

//     prevStruct.forEach((object, id) => {
//         if ( !newStruct.has( id )) {

//             // batchedMesh_struct.setColorAt( id, structOpaque );
//             object.setColorAt( id, structOpaque );

//         };
//     })

//     prevNear = newNear;
//     prevStruct = newStruct;
// };

// function onWindowResize() {

//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();

//     renderer.setSize( window.innerWidth, window.innerHeight );

// }

// function configGUI() {

//     const gui = new GUI();

//     gui.add(CONSTANTS, "FOCUS_RADIUS", 0, 20, 1).name("Search Radius").onChange( v => {
//         CONSTANTS.FOCUS_RADIUS = v;
//         requestRender();
//     });

//     gui.add(CONSTANTS, "changeLODcolor").name("Change LOD Color").onChange( v => {
//         CONSTANTS.changeLODcolor = v;
//         batchedMesh.setColorAt( id, nonHighlightColor );
//         updateLODs();
//     })
// }

// window.addEventListener( 'resize', onWindowResize );

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

});

// let lastCameraPos = camera.position.clone();
let renderRequested = false;

function render() {

    renderRequested = false;
    
    renderer.render( scene, camera );
    // updateLODs( camera.position );

}

function requestRender() {
    
    if (
        !renderRequested
    ) {
        // perfMonitor.update( renderer, scene );
        renderRequested = true;
        requestAnimationFrame( render );
    };
}

controls.addEventListener( 'change', requestRender );

let frameCount = 0;
requestRender();

function animate() {
    stats.begin();
    perfMonitor.update(renderer, scene);
    
    requestAnimationFrame( animate );
    // renderer.render( scene, camera );

    // Throttled Frame Refresh
    if ( frameCount % 60 === 0 ) {
        requestRender();
    }
    
    frameCount++;

    stats.end();
}

animate()
