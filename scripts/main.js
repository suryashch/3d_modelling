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

// const perfMonitor = new PerformanceMonitor();
const profiler = new FrameProfiler(60);

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;

const CONSTANTS = {
    SEARCH_RADIUS: 15,
    changeLODcolor: true
}


// Basic BatchedMesh

let bvh_struct;
let batchedMesh_struct;

initBase();

async function initBase() {
    const loader_instance = new GLTFLoader().setPath('models/bim-model/');
    const gltf = await loader_instance.loadAsync('sixty5-structural.glb')
    
    const material = new THREE.MeshStandardMaterial({
        color: "#a7a7a7",
        transparent: true,
        opacity: 1.0,
        depthWrite: true
    });

    // const material = gltf.scene.children[10].material;
    // material.transparent = true;
    // material.opacity = 1.0;
    // // material.color = "white";
    
    let material_map = new Map();

    material_map = await initMap( gltf, material_map)
    
    batchedMesh_struct = await generateBatchedMesh( material_map, material );
    
    bvh_struct = new ObjectBVH( batchedMesh_struct );
    scene.add( batchedMesh_struct );

    return true;
}

let totalVertexCount = 0;
let totalIndexCount = 0;
let totalInstanceCount = 0;

let hiresGeomIdFor = [];
let lowresGeomIdFor = [];

let batchedMesh;
let bvh;
let final_map = new Map();


initDetails();

async function initDetails() {
    renderer.render(scene, camera);
    const loader = new GLTFLoader().setPath( 'models/bim-model/' );
    
    const status = await loadFiles( loader );
    
    requestRender();

    configGUI();

};

async function loadFiles( loader ) {
    
    // Need to sequentially populate the mesh_map

    const hi_res_files = [
        // "sixty5-W-installatie_hires.glb",
        // "sixty5-W-installatie_lowres.glb"
        "sixty5-mep_hires.glb",
        "sixty5-mep_lowres.glb"
        // "sixty5-interiors-kitchens_hires.glb",
        // "sixty5-interiors-kitchens_lowres.glb"
    ];

    for (const fileName of _files) {

        let gltf = await loadGLTFfile( loader, fileName );
        
        const [name, res] = fileName.split("_");
        
        if (res === 'hires.glb') final_map = await initMap( gltf, final_map );
        if (res === 'lowres.glb') final_map = await appendMap( gltf, final_map );
        
        gltf = null;

    };
    
    batchedMesh = await generateBatchedMesh( final_map );
    bvh = new ObjectBVH( batchedMesh );
    scene.add( batchedMesh );

    return true;
};

function loadGLTFfile( loader, fileName ) {
    const gltf = loader.loadAsync( fileName );

    return gltf;
}

function generateBatchedMesh( final_map, material = new THREE.MeshStandardMaterial()) {

    const bm = new THREE.BatchedMesh(
        totalInstanceCount, 
        totalVertexCount, 
        totalIndexCount, 
        material
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

    // Memory Management
    final_map.forEach(( value ) => {
        const hires = value.get( "geometry_hires" );
        if ( hires ) hires.dispose();

        const lowres = value.get( "geometry_lowres" );
        if ( lowres && lowres !== hires ) lowres.dispose();
    });

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
let prevNear = new Set();
let prevStruct = new Set();

const highlightColor = new THREE.Color( "#F600C1" );
const nonHighlightColor = new THREE.Color( "#d8d8d8" );

const structOpaque = new THREE.Vector4(1.0, 1.0, 1.0, 1.0);
const structTrans = new THREE.Vector4(0, 0, 0.55, 0.35);

function queryNearInstances( cameraPos ) {

    const nearIds = new Set();
    const structIds = new Set();

    querySphere.center.copy( cameraPos );
    querySphere.radius = CONSTANTS.SEARCH_RADIUS;

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

    // CONSTANTS.SEARCH_RADIUS = 5;

    bvh_struct.shapecast({
        intersectsBounds : ( box ) => {

            if (!querySphere.intersectsBox( box )) return NOT_INTERSECTED;
            return INTERSECTED;
        },
        intersectsObject : ( object, instanceId ) => {

            structIds.add( instanceId );
            return false;
        }
    })

    return [nearIds, structIds];
};

function updateLODs( cameraPos ) {

    const [newNear, newStruct] = queryNearInstances( cameraPos );

    newNear.forEach(( id ) => {

        if (!prevNear.has( id )) {

            batchedMesh.setGeometryIdAt( id, hiresGeomIdFor[ id ] );
            if ( CONSTANTS.changeLODcolor ) {
                batchedMesh.setColorAt( id, highlightColor );
            }
        };
    });

    prevNear.forEach(( id ) =>{

        if (!newNear.has( id )) {

            batchedMesh.setGeometryIdAt( id, lowresGeomIdFor[ id ] );
            batchedMesh.setColorAt( id, nonHighlightColor );
        };
    });

    newStruct.forEach((id) => {
        if (!prevStruct.has( id )) {

            batchedMesh_struct.setColorAt( id, structTrans );
            
        };
    })

    prevStruct.forEach((id) => {
        if (!newStruct.has( id )) {

            batchedMesh_struct.setColorAt( id, structOpaque );

        };
    })

    prevNear = newNear;
    prevStruct = newStruct;
};

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function configGUI() {

    const gui = new GUI();

    gui.add(CONSTANTS, "SEARCH_RADIUS", 5, 20, 1).name("Search Radius").onChange( v => {
        CONSTANTS.SEARCH_RADIUS = v;
        requestRender();
    });

    gui.add(CONSTANTS, "changeLODcolor").name("Change LOD Color").onChange( v => {
        CONSTANTS.changeLODcolor = v;
        batchedMesh.setColorAt( id, nonHighlightColor );
    })
}

window.addEventListener( 'resize', onWindowResize );

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

let lastCameraPos = camera.position.clone();
let renderRequested = false;

function render() {

    renderRequested = false;
    
    renderer.render( scene, camera );
    updateLODs( camera.position );

}

function requestRender() {
    
    if (
        !renderRequested &&
        bvh &&
        camera.position != lastCameraPos
    ) {
        // perfMonitor.update( renderer, scene );
        renderRequested = true;
        requestAnimationFrame( render );
    };
}

controls.addEventListener( 'change', requestRender );
window.addEventListener( 'resize', requestRender );

let frameCount = 0;

function animate() {
    stats.begin();
    
    requestAnimationFrame( animate );

    // Throttled Frame Refresh
    if ( frameCount % 1000 === 0 ) {
    if (bvh && frameCount % 10 === 0) {
        requestRender();
    }
    
    frameCount++;

    stats.end();
}

animate()
