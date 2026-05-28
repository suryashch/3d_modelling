import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './utils/performanceMonitor.js'
import { FrameProfiler } from './utils/frameProfiler.js';

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
const profiler = new FrameProfiler(60);

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;

// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');

// let bvh_struct;
// loader1.load('sixty5-interiors-kitchens.glb', (gltf) => {

//     gltf.scene.traverse((child) => {
//         if (child.isMesh){
//             const mesh = child;
//             mesh.material =  new THREE.MeshStandardMaterial({
//                 color:"#b6b6b6",
//                 transparent: true,
//                 opacity: 1
//             });
//             scene.add(mesh);
//         }
//     })


    // const mesh = gltf.scene;
    // mesh.position.set(0,0,0);
    // const material = new THREE.MeshStandardMaterial({
    //     color:"#c23434",
    //     wireframe: true
    // });
    // // material.wireframe = true;
    // // material.format=THREE.RGBAFormat
    // // material.opacity = 0.5;

    // mesh.material = material;

    // scene.add(mesh);
// });


// // Basic BatchedMesh
// const loader_instance = new GLTFLoader().setPath('models/bim-model/');
// loader_instance.load('sixty5-interiors-kitchens-hires.glb', (gltf) => {
    
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

let totalVertexCount = 0;
let totalIndexCount = 0;
let totalInstanceCount = 0;

let hiresGeomIdFor = [];
let lowresGeomIdFor = [];

let batchedMesh;
let bvh;
let final_map = new Map();


init();

async function init() {
    renderer.render(scene, camera);
    const loader = new GLTFLoader().setPath( 'models/bim-model/' );
    
    const status = await loadFiles( loader );
    
    requestRender();
    // final_map = null;

};

async function loadFiles( loader ) {

    // First need to load all models to scene completely
    // let [ gltf_1_hi, gltf_1_low, gltf_2_hi, gltf_2_low ] = await Promise.all([  //

    //     loader.loadAsync( "sixty5-W-installatie-hires_test.glb" ),
    //     loader.loadAsync( "sixty5-W-installatie-lowres.glb" ),
    //     loader.loadAsync( "sixty5-mep-test.glb" ),
    //     loader.loadAsync( "sixty5-mep-lowres-test.glb" )

    // ]);
    
    // Need to sequentially populate the mesh_map

    const hi_res_files = [
        "sixty5-W-installatie_hires.glb",
        "sixty5-W-installatie_lowres.glb"
        // "sixty5-mep_hires.glb",
        // "sixty5-mep_lowres.glb"
    ];

    for (const fileName of hi_res_files) {

        let gltf = await loadGLTFfile( loader, fileName );
        
        const [name, res] = fileName.split("_");
        
        if (res === 'hires.glb') final_map = await initMap( gltf, final_map );
        if (res === 'lowres.glb') final_map = await appendMap( gltf, final_map );
        
        gltf = null;

    };

    // for (const fileName of low_res_files) {

    //     const gltf = await loadGLTFfile( loader, fileName );
    //     final_map = await appendMap( gltf, final_map );
    //     gltf.scene.clear();
    
    // };

    // const gltf_1_hi = await loader.loadAsync( "sixty5-W-installatie-hires_test.glb" );
    // final_map = await initMap( gltf_1_hi, final_map );
    // gltf_1_hi.scene.clear();
    // // gltf_1_hi.scene.traverse(child => {
    // //     if (child.isMesh) {
    // //         if (child.geometry) child.geometry.dispose();
    // //         if (child.material) {
    // //             if (Array.isArray(child.material)) {
    // //                 child.material.forEach(m => m.dispose());
    // //             } else {
    // //                 child.material.dispose();
    // //             }
    // //         }
    // //     }
    // // });
    
    // const gltf_2_hi = await loader.loadAsync( "sixty5-mep-test.glb" );
    // final_map =  await initMap( gltf_2_hi, final_map );
    // gltf_2_hi.scene.clear();
    // // gltf_2_hi.scene.traverse(child => {
    // //     if (child.isMesh) {
    // //         if (child.geometry) child.geometry.dispose();
    // //         if (child.material) {
    // //             if (Array.isArray(child.material)) {
    // //                 child.material.forEach(m => m.dispose());
    // //             } else {
    // //                 child.material.dispose();
    // //             }
    // //         }
    // //     }
    // // });
    
    // const gltf_1_low = await loader.loadAsync( "sixty5-W-installatie-lowres.glb" );
    // final_map = await appendMap( gltf_1_low, final_map );
    // gltf_1_low.scene.clear();
    // // gltf_1_low.scene.traverse(child => {
    // //     if (child.isMesh) {
    // //         if (child.geometry) child.geometry.dispose();
    // //         if (child.material) {
    // //             if (Array.isArray(child.material)) {
    // //                 child.material.forEach(m => m.dispose());
    // //             } else {
    // //                 child.material.dispose();
    // //             }
    // //         }
    // //     }
    // // });
    
    // const gltf_2_low = await loader.loadAsync( "sixty5-mep-lowres-test.glb" );
    // final_map = await appendMap( gltf_2_low, final_map );
    // gltf_2_low.scene.clear();
    // // gltf_2_low.scene.traverse(child => {
    // //     if (child.isMesh) {
    // //         if (child.geometry) child.geometry.dispose();
    // //         if (child.material) {
    // //             if (Array.isArray(child.material)) {
    // //                 child.material.forEach(m => m.dispose());
    // //             } else {
    // //                 child.material.dispose();
    // //             }
    // //         }
    // //     }
    // });
    
    
    batchedMesh = await generateBatchedMesh( final_map );
    bvh = new ObjectBVH( batchedMesh );
    scene.add( batchedMesh );
    
    // gltf_1_hi = null;
    // gltf_2_hi = null;
    // gltf_1_low = null;
    // gltf_2_low = null;

    // console.log(gltf_1_hi);

    // // 3. Ensure GLTF scene object hierarchies are purged
    // [gltf_1_hi, gltf_1_low, gltf_2_hi, gltf_2_low].forEach(gltf => {
    //     gltf.scene.traverse(child => {
    //         if (child.isMesh) {
    //             if (child.geometry) child.geometry.dispose();
    //             if (child.material) {
    //                 if (Array.isArray(child.material)) {
    //                     child.material.forEach(m => m.dispose());
    //                 } else {
    //                     child.material.dispose();
    //                 }
    //             }
    //         }
    //     });
    // });

    return true;
};

function loadGLTFfile( loader, fileName ) {
    const gltf = loader.loadAsync( fileName );

    return gltf;
}

function generateBatchedMesh(final_map) {

    const bm = new THREE.BatchedMesh(
        totalInstanceCount, 
        totalVertexCount, 
        totalIndexCount, 
        new THREE.MeshStandardMaterial()
    );
    
    final_map.forEach(( value, key ) => {

        const hires_geometry = value.get( "geometry_hires" );
        const matrices = value.get( "matrix" );

        if (matrices.length > 0) {
            
            const hires_geomId = bm.addGeometry( hires_geometry );
            
            let lowres_geomId

            if ( value.has( "geometry_lowres" ) ) {
                lowres_geomId = bm.addGeometry( value.get( "geometry_lowres" ) );
            } else {
                lowres_geomId = hires_geomId; 
            }

            for ( let i=0; i < matrices.length; i++ ){

                const instanceId = bm.addInstance( lowres_geomId );

                bm.setMatrixAt( instanceId, matrices[i] );

                hiresGeomIdFor[ instanceId ] = hires_geomId;
                lowresGeomIdFor[ instanceId ] = lowres_geomId;
            };

        };
    });

    // 1. Purge WebGL memory allocations for source geometries
    final_map.forEach(( value ) => {
        const hires = value.get( "geometry_hires" );
        if ( hires ) hires.dispose();

        const lowres = value.get( "geometry_lowres" );
        if ( lowres && lowres !== hires ) lowres.dispose();
    });

    // 2. Sever Javascript references
    final_map.clear();
    final_map = null;
    
    bm.needsUpdate = true;
    return bm;
};

function initMap( gltf, mesh_map ) {

    gltf.scene.traverse(( child ) => {

        if ( child.isMesh ){ 

            const geom = child.geometry;
            const mesh_id = child.userData.mesh_id;
            
            const inst_matrix = child.matrixWorld.clone();

            if ( !mesh_map.has( mesh_id )) {
                
                // If map does not have the uuid already, first create it
                
                mesh_map.set( mesh_id, new Map() );

                mesh_map.get( mesh_id ).set( "geometry_hires", geom );
                mesh_map.get( mesh_id ).set( "matrix", [] );

                mesh_map.get( mesh_id ).get( "matrix" ).push( inst_matrix );

                totalVertexCount += geom.attributes.position.count;
                totalIndexCount += geom.index.count;
                totalInstanceCount += 1;
            
            } else {
                
                // Map contains the uuid hence only need to push transformation matrix

                mesh_map.get( mesh_id ).get( "matrix" ).push( inst_matrix );
                totalInstanceCount += 1;

            };
        };
    });

    return mesh_map;
};

function appendMap( gltf, mesh_map ) {

    let visited = new Set();

    gltf.scene.traverse(( child ) => {

        if ( 
            child.isMesh && 
            mesh_map.has( child.userData.mesh_id ) &&
            !visited.has(child.userData.mesh_id)
        ) {
            const mesh_id = child.userData.mesh_id;
            const geom = child.geometry;
            
            mesh_map.get( mesh_id ).set( "geometry_lowres", geom );

            totalVertexCount += geom.attributes.position.count;
            totalIndexCount += geom.index.count;
            totalInstanceCount += 1;

            visited.add( mesh_id );
            
        };
    });

    return mesh_map;
};


const querySphere = new THREE.Sphere();
const SEARCH_RADIUS = 15;
let prevNear = new Set();

const highlightColor = new THREE.Color( "#F600C1" );
const nonHighlightColor = new THREE.Color( "#d8d8d8" );

function queryNearInstances( cameraPos ) {

    const nearIds = new Set();

    querySphere.center.copy( cameraPos );
    querySphere.radius = SEARCH_RADIUS;

    bvh.shapecast({

        intersectsBounds : ( box ) => {

            if (!querySphere.intersectsBox( box )) return NOT_INTERSECTED;

            return INTERSECTED;
        },
        intersectsObject : ( object, instanceId ) => {

            nearIds.add( instanceId );
            
            return false;
        }

    });

    return nearIds;
};

function updateLODs( cameraPos ) {

    const newNear = queryNearInstances( cameraPos );

    newNear.forEach(( id ) => {

        if (!prevNear.has( id )) {

            batchedMesh.setGeometryIdAt( id, hiresGeomIdFor[ id ] );
            batchedMesh.setColorAt( id, highlightColor );
        };
    });

    prevNear.forEach(( id ) =>{

        if (!newNear.has( id )) {

            batchedMesh.setGeometryIdAt( id, lowresGeomIdFor[ id ] );
            batchedMesh.setColorAt( id, nonHighlightColor );
        };
    });

    prevNear = newNear;
};


window.addEventListener('dblclick', (event) => {
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects( bvh.objects );

    if (intersects.length > 0) {
        
        const intersectionPoint = intersects[0].point;

        controls.target.copy(intersectionPoint);
        controls.update();
    };

});

let lastCameraPos = camera.position.clone();
let renderRequested = false;

function render() {

    renderRequested = false;
    
    renderer.render(scene, camera);
    updateLODs(camera.position);

    light_2.position.set( camera.position.clone() )
}

function requestRender() {
    
    if (
        !renderRequested &&
        bvh &&
        camera.position != lastCameraPos
    ) {
        renderRequested = true;
        requestAnimationFrame(render);
    };
}

controls.addEventListener('change', requestRender );
window.addEventListener('resize', requestRender );

let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);

    perfMonitor.update(renderer, scene);
    
    if (bvh && frameCount % 10 === 0) {
        requestRender();
    }
    
    frameCount++;
}

animate()
