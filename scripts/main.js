import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './utils/performanceMonitor.js'
import { FrameProfiler } from './utils/frameProfiler.js';

import { ObjectBVH, acceleratedRaycast, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const mouse = new THREE.Vector2();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(15,15,15);

// const camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
// scene.add( camera );
// camera.position.set(40,10,25);
// camera.zoom = 10;
// camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance=0.1;
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

const perfMonitor = new PerformanceMonitor();
const profiler = new FrameProfiler(60);

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;


// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-mep.glb', (gltf) => {

//     const mesh = gltf.scene
//     mesh.position.set(0,0,0);
//     const material = new THREE.MeshStandardMaterial({
//         color:"#8a8a8a"
//     });
//     material.transparent = true;
//     material.format=THREE.RGBAFormat
//     material.opacity = 0.5;

//     mesh.material = material;
//     scene.add(mesh);
// });


// Basic BatchedMesh
const loader_instance = new GLTFLoader().setPath('models/bim-model/');
loader_instance.load('sixty5-W-installatie-hires.glb', (gltf) => {
    
    let material_map = new Map();
    
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            const material = child.material
            const geom = child.geometry
            const geom_uuid = geom.uuid;
            const inst_matrix = child.matrixWorld;
            
            if ( !material_map.has( material )){
                material_map.set( material, {
                    unique_geoms: new Map(),
                    vCount: 0,
                    iCount: 0,
                    instCount: 1
                });
            };
            
            const data = material_map.get( material )
            data.instCount++;

            if ( !data.unique_geoms.has( geom_uuid ) ) {
                data.unique_geoms.set(geom_uuid, {
                    geometry: geom,
                    matrix: []
                });

                data.vCount += geom.attributes.position.count;
                data.iCount += geom.index.count;
            };
            
            data.unique_geoms.get(geom_uuid).matrix.push( inst_matrix )
        };
    });

    material_map.forEach(( value,key ) => {
        const batchedMesh = new THREE.BatchedMesh(
            value.instCount,
            value.vCount,
            value.iCount,
            key
        );

        value.unique_geoms.forEach((subvalue) => {
        
            const geometry = subvalue.geometry;
            const matrices = subvalue.matrix;
            
            if (matrices.length > 0){
                const geom_id = batchedMesh.addGeometry( geometry );

                for ( let i=0; i < matrices.length; i++){
                    const instanceId = batchedMesh.addInstance(geom_id)
                    batchedMesh.setMatrixAt( instanceId, matrices[i] )
                };
            };
        });
        
        batchedMesh.needsUpdate = true;
        scene.add(batchedMesh);
    });
});



let meshes = new Map();

let totalVertexCount = 0;
let totalIndexCount = 0;
let totalInstanceCount = 0;

let hiresGeomIdFor = [];
let lowresGeomIdFor = [];

let batchedMesh;
let bvh;

const loader = new GLTFLoader().setPath( 'models/bim-model/' );

loadFiles( loader );


async function loadFiles( loader ) {

    // First need to load both models to scene completely
    const [ gltf_1, gltf_2 ] = await Promise.all([

        loader.loadAsync( "sixty5-mep-test.glb" ),
        loader.loadAsync( "sixty5-mep-lowres-test.glb" )

    ]);

    // Need to sequentially populate the mesh_map

    console.log(gltf_1);
    const mesh_map = await initMap( gltf_1 );
    const final_map = await appendMap( gltf_2, mesh_map );

    
    batchedMesh = await generateBatchedMesh( final_map );

    bvh = new ObjectBVH( batchedMesh );

    scene.add( batchedMesh );
};

function generateBatchedMesh(final_map) {

    const bm = new THREE.BatchedMesh(
        totalInstanceCount, 
        totalVertexCount, 
        totalIndexCount, 
        new THREE.MeshBasicMaterial()
    );
    
    final_map.forEach(( value, key ) => {

        const hires_geometry = value.get( "geometry_hires" );
        const lowres_geometry = value.has( "geometry_lowres" ) ? value.get( "geometry_lowres" ) : value.get( "geometry_hires" );
        
        const matrices = value.get( "matrix" );

        if (matrices.length > 0) {

            const hires_geomId = bm.addGeometry( hires_geometry );
            const lowres_geomId = bm.addGeometry( lowres_geometry );

            for ( let i=0; i < matrices.length; i++){

                const instanceId = bm.addInstance( lowres_geomId );

                bm.setMatrixAt( instanceId, matrices[i] );

                hiresGeomIdFor[ instanceId ] = hires_geomId;
                lowresGeomIdFor[ instanceId ] = lowres_geomId;
            };

        };
    });
    
    bm.needsUpdate = true;
    return bm;
};

function initMap( gltf ) {

    let mesh_map = new Map();

    gltf.scene.traverse(( child ) => {

        if ( child.isMesh ){
            
            const geom = child.geometry;
            const mesh_id = child.userData.mesh_id;
            const inst_matrix = child.matrixWorld;

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

    return mesh_map
};

function appendMap( gltf, mesh_map ) {

    gltf.scene.traverse(( child ) => {

        if ( child.isMesh && mesh_map.has( child.userData.mesh_id )){

            const mesh_id = child.userData.mesh_id;
            const geom = child.geometry;
            
            mesh_map.get( mesh_id ).set( "geometry_lowres", geom );

            totalVertexCount += geom.attributes.position.count;
            totalIndexCount += geom.index.count;
            totalInstanceCount += 1;
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

let lastCameraPos = camera.position.clone();
const UPDATE_THRES = 4;

function checkForUpdateLOD(camera_pos) {
    if (camera_pos.distanceToSquared(lastCameraPos) > UPDATE_THRES) {
        updateLODs(camera_pos);
        lastCameraPos.copy(camera_pos);
    };
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


// window.addEventListener('click', (event) => {
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);

//     const intersects = raycaster.intersectObjects(bvh);

//     console.log(intersects);

//     if (intersects.length > 0) {
//         // The exact intersection point in 3D world space
//         const intersectionPoint = intersects[0].point;

//         controls.target.copy(intersectionPoint);
//         controls.update();
//     };
// });

window.addEventListener('pointermove', () => {

    controls.update();
    renderer.render(scene, camera);
    checkForUpdateLOD(camera.position);
    
});

window.addEventListener('wheel', () => {


    controls.update();
    renderer.render(scene, camera);
    checkForUpdateLOD(camera.position);

});



let frameCount = 0;

// controls.update();

function animate() {

    profiler.begin("LOD control")
    
    requestAnimationFrame(animate);
    if (bvh && frameCount % 100 ==0) {

        controls.update();
        renderer.render(scene, camera);
        checkForUpdateLOD(camera.position);
        
        
        
        // Every 10 frames update the LODs
        
        
    }
    perfMonitor.update(renderer, scene);
    profiler.end("LOD control")
    
    profiler.endFrame();
    
    frameCount++;
};

animate();
