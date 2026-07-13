import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { ObjectBVH, acceleratedRaycast, INTERSECTED, NOT_INTERSECTED } from "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.10/build/index.module.js";

export function initScene() {
    const scene = new THREE.Scene();

    // const renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor("#262837");
    // renderer.setPixelRatio(window.devicePixelRatio);
    
    // document.body.appendChild(renderer.domElement);

    // const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    // camera.position.set(-70,70,50);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enablePan = true;
    // controls.minDistance=0.1;
    // controls.maxDistance=150;
    // controls.minPolarAngle=0;
    // controls.maxPolarAngle=3;
    // controls.autoRotate=false;
    // controls.target = new THREE.Vector3(21, 30, -30);
    // controls.rotateSpeed = 0.15;
    // controls.zoomSpeed = 0.50;
    // controls.panSpeed = 0.50;
    // controls.update();

    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set( 10,10,0 )
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Color, Intensity
    scene.add(ambientLight);
    
    const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
    gridHelper.position.set(21, -1, -30);
    scene.add( gridHelper );

    const bvh_group = new THREE.Group();

    let bvh_struct;
    let batchedMesh_struct;
    const loader = new GLTFLoader();

    initBase();

    async function initBase() {
        const gltf = await loader.loadAsync('sixty5-structural.glb')
        
        const material = new THREE.MeshStandardMaterial({
            color: "#a1a1a1",
            transparent: true,
            opacity: 1.0,
            depthWrite: true
        });
        
        let material_map = new Map();

        material_map = await initMap( gltf, material_map)
        
        batchedMesh_struct = await generateBatchedMesh( material_map, material );
        
        bvh_struct = await new ObjectBVH( batchedMesh_struct );
        scene.add(bvh_struct);
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

    loadFiles();

    async function loadFiles() {
        
        // Need to sequentially populate the mesh_map

        const _files = [
            "sixty5-mep_hires.glb",
            "sixty5-mep_lowres.glb"
            // "sixty5-W-installatie_hires.glb",
            // "sixty5-W-installatie_lowres.glb"
        ];

        for (const fileName of _files) {

            const gltf = await loadGLTFfile( fileName );
            
            const [name, res] = fileName.split("_");
            
            if (res === 'hires.glb') final_map = await initMap( gltf, final_map );
            if (res === 'lowres.glb') final_map = await appendMap( gltf, final_map );
            
            // gltf = null;

        };
        
        batchedMesh = await generateBatchedMesh( final_map );
        bvh = await new ObjectBVH( batchedMesh );
        scene.add(bvh);
        scene.add( batchedMesh );

        return true;
    };

    function loadGLTFfile( fileName ) {
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

    return scene;
};