import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './performance_monitor.js'

import { ObjectBVH, acceleratedRaycast, computeBatchedBoundsTree, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';

import { createRadixSort, extendBatchedMeshPrototype, getBatchedMeshLODCount } from '@three.ez/batched-mesh-extensions';
import { performanceRangeLOD, simplifyGeometriesByErrorLOD, simplifyGeometryByErrorLOD } from '@three.ez/simplify-geometry';
// import { batch } from 'three/src/nodes/accessors/BatchNode.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(5,5,5);

// const camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
// scene.add( camera );
// camera.position.set(40,10,25);
// camera.zoom = 10;
// camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
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

extendBatchedMeshPrototype();

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

class FrameProfiler {
  constructor(reportEveryNFrames = 60) {
    this.sections = new Map();          // name -> { total, count, max }
    this.reportEvery = reportEveryNFrames;
    this.frameCount = 0;
    this._marks = new Map();            // name -> start time
  }

  begin(name) {
    this._marks.set(name, performance.now());
  }

  end(name) {
    const start = this._marks.get(name);
    if (start === undefined) return;
    const dt = performance.now() - start;
    let s = this.sections.get(name);
    if (!s) {
      s = { total: 0, count: 0, max: 0 };
      this.sections.set(name, s);
    }
    s.total += dt;
    s.count += 1;
    if (dt > s.max) s.max = dt;
  }

  endFrame() {
    this.frameCount++;
    if (this.frameCount >= this.reportEvery) {
      this.report();
      this.frameCount = 0;
      for (const s of this.sections.values()) {
        s.total = 0; s.count = 0; s.max = 0;
      }
    }
  }

  report() {
    const rows = [];
    for (const [name, s] of this.sections) {
      rows.push({
        section: name,
        avg_ms: +(s.total / s.count).toFixed(3),
        max_ms: +s.max.toFixed(3),
        calls: s.count,
      });
    }
    rows.sort((a, b) => b.avg_ms - a.avg_ms);
    console.table(rows);
  }
}

const profiler = new FrameProfiler(60);

// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-structural.glb', (gltf) => {

//     const mesh = gltf.scene
//     mesh.position.set(0,0,0);
//     mesh.material = new THREE.MeshStandardMaterial({
//         color:"#8a8a8a",
//         transparent: true,
//         opacity: 0.1
//     });
//     scene.add(mesh);
// });



// testing with bvh

let meshes = new Map();

let totalVertexCount = 0;
let totalIndexCount = 0;
let totalInstanceCount = 0;

let hiresGeomIdFor = [];
let lowresGeomIdFor = [];

let batchedMesh_final;
let bvh;


const loader = new GLTFLoader().setPath('models/bim-model/');

async function loadFiles(loader) {

    const [gltf_1, gltf_2] = await Promise.all([
        loader.loadAsync("sixty5-mep-test.glb"),
        loader.loadAsync("sixty5-mep-lowres-test.glb")
    ]);

    const uuid_map = await initMap(gltf_1);
    const final_map = await appendMap(gltf_2, uuid_map)

    batchedMesh_final = await generateBatchedMesh(final_map)

    bvh = new ObjectBVH( batchedMesh_final );

    scene.add(batchedMesh_final);
};

function generateBatchedMesh(final_map) {
    const batchedMesh = new THREE.BatchedMesh(totalInstanceCount, totalVertexCount, totalIndexCount, new THREE.MeshBasicMaterial());
    
    final_map.forEach((value, key) => {
        const hires_geometry = value.get("geometry_hires");
        
        const lowres_geometry = value.has("geometry_lowres") ? value.get("geometry_lowres") : value.get("geometry_hires");
        
        const matrices = value.get("matrix")

        if (matrices.length > 0) {
            const hires_geomId = batchedMesh.addGeometry(hires_geometry);
            const lowres_geomId = batchedMesh.addGeometry(lowres_geometry);

            for ( let i=0; i < matrices.length; i++){
                const instanceId = batchedMesh.addInstance(lowres_geomId)
                batchedMesh.setMatrixAt( instanceId, matrices[i] )

                hiresGeomIdFor[instanceId] = hires_geomId;
                lowresGeomIdFor[instanceId] = lowres_geomId;
            };

        }
    });
    
    batchedMesh.needsUpdate = true;
    return batchedMesh
}

function initMap(gltf) {

    let uuid_map = new Map();

    gltf.scene.traverse((child) => {
        if (child.isMesh){
            
            const geom = child.geometry;
            const geom_uuid = child.userData.mesh_id;
            const inst_matrix = child.matrixWorld;

            if ( !uuid_map.has( geom_uuid )) {
                // If map does not have the uuid already, first create it
                
                uuid_map.set( geom_uuid, new Map() );

                uuid_map.get( geom_uuid ).set( "geometry_hires", geom );
                uuid_map.get( geom_uuid ).set( "matrix", [] );

                uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

                totalVertexCount += geom.attributes.position.count;
                totalIndexCount += geom.index.count;
                totalInstanceCount += 1;
            
            } else {
                // Map contains the uuid hence only need to push transformation matrix

                uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

                totalInstanceCount += 1;

            };
        };
    });

    return uuid_map
}

function appendMap(gltf, uuid_map) {
    gltf.scene.traverse((child) => {
        if ( child.isMesh && uuid_map.has( child.userData.mesh_id )){
            const geom = child.geometry;
            
            uuid_map.get( child.userData.mesh_id ).set( "geometry_lowres", geom );

            totalVertexCount += geom.attributes.position.count;
            totalIndexCount += geom.index.count;
            totalInstanceCount += 1;
        }
    });

    return uuid_map
}

loadFiles(loader)

const querySphere = new THREE.Sphere();
const SEARCH_RADIUS = 15;
let prevNear = new Set();

const highlightColor = new THREE.Color( "#F600C1" );
const nonHighlightColor = new THREE.Color( "#d8d8d8" );

function queryNearInstances(cameraPos) {
    const nearIds = new Set();

    querySphere.center.copy(cameraPos);
    querySphere.radius = SEARCH_RADIUS;

    bvh.shapecast({
        intersectsBounds : (box) => {
            if (!querySphere.intersectsBox(box)) return NOT_INTERSECTED;

            return INTERSECTED;
        },
        intersectsObject : (object, instanceId) => {
            nearIds.add(instanceId);
            
            return false;
        }

    });

    return nearIds;
};

function updateLODs(cameraPos) {
    const newNear = queryNearInstances(cameraPos);

    newNear.forEach((id) => {
        if (!prevNear.has(id)) {
            batchedMesh_final.setGeometryIdAt(id, hiresGeomIdFor[id])
            batchedMesh_final.setColorAt(id, highlightColor)
        }
    });

    prevNear.forEach((id) =>{
        if (!newNear.has(id)) {
            batchedMesh_final.setGeometryIdAt(id, lowresGeomIdFor[id])
            batchedMesh_final.setColorAt(id, nonHighlightColor)
        }
    });

    prevNear = newNear;
}












// loader.load('sixty5-mep-test.glb', (gltf) => {
//     // console.log(gltf);
    
//     gltf.scene.traverse((child) => {
//         if (child.isMesh){
            
//             const geom = child.geometry;
//             const geom_uuid = child.userData.mesh_id;
//             const inst_matrix = child.matrixWorld;

//             if ( !uuid_map.has( geom_uuid )) {
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
            
            
            
//             // totalVertexCount += child.geometry.attributes.position.count
//             // totalIndexCount += child.geometry.index.count
            
//             // meshes.push(child)
//         };
//     });

//     batchedMesh = new THREE.BatchedMesh(totalInstanceCount * 2, totalVertexCount, totalIndexCount, new THREE.MeshBasicMaterial());

//     uuid_map.forEach((value, key) => {
//         const geometry = value.get("geometry");
//         const matrices = value.get("matrix")

//         if (matrices.length > 1) {
//             const geomId = batchedMesh.addGeometry(geometry);
//             for ( let i=0; i < matrices.length; i++){
//                 const instanceId = batchedMesh.addInstance(geomId)
//                 batchedMesh.setMatrixAt( instanceId, matrices[i] )
//             };

//         }
        
//         // const instId = batchedMesh.addInstance(geomId);

//         // m.updateMatrixWorld();
//         // batchedMesh.setMatrixAt(instId, m.matrixWorld);
//     });

//     batchedMesh.needsUpdate = true;

//     bvh = new ObjectBVH( batchedMesh );

//     scene.add(batchedMesh);
// });

// const querySphere = new THREE.Sphere();
// const SEARCH_RADIUS = 15;
// let prevNear = new Set();

// const highlightColor = new THREE.Color( "#F600C1" );
// const nonHighlightColor = new THREE.Color( "#d8d8d8" );

// function queryNearInstances(cameraPos) {
//     const nearIds = new Set();

//     querySphere.center.copy(cameraPos);
//     querySphere.radius = SEARCH_RADIUS;

//     bvh.shapecast({
//         intersectsBounds : (box) => {
//             if (!querySphere.intersectsBox(box)) return NOT_INTERSECTED;

//             return INTERSECTED;
//         },
//         intersectsObject : (object, instanceId) => {
//             nearIds.add(instanceId);
            
//             return false;
//         }

//     });

//     return nearIds;
// };

// function updateLODs(cameraPos) {
//     const newNear = queryNearInstances(cameraPos);

//     newNear.forEach((id) => {
//         if (!prevNear.has(id)) batchedMesh.setColorAt(id, highlightColor)
//     });

//     prevNear.forEach((id) =>{
//         if (!newNear.has(id)) batchedMesh.setColorAt(id, nonHighlightColor)
//     });

//     prevNear = newNear;
// }

// // Basic Loader
// const loader1 = new GLTFLoader().setPath('models/bim-model/');
// loader1.load('sixty5-mep-lowres-test.glb', (gltf) => {
//     // console.log(gltf)
//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
//             // console.log(child.userData.mesh_id)
//             if (
//                 uuid_map.has(child.position)
//             ) {
//                 console.log("Hurray")
//             }
//         };
//     });
// });

// console.log(uuid_map)






// // Batched Mesh Loader

// const loader = new GLTFLoader().setPath('models/bim-model/');
// loader.load('sixty5-mep-lowres.glb', (gltf) => {
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



// // BatchedMesh Loader v2

// let meshes = [];
// let mesh_map = new Map();
// let totalVertexCount = 0;
// let totalIndexCount = 0;

// const loader_1 = new GLTFLoader().setPath('models/bim-model/');
// const gltf_1 = await loader1.loadAsync('test-mep.glb')

// gltf_1.scene.traverse((child) => {
//     if (child.isMesh) {
//         meshes.push(child)

//         totalVertexCount += child.geometry.attributes.position.count;
//         totalIndexCount += child.geometry.index.count;
//     }    
// });

// const batchedMesh = new THREE.BatchedMesh(
//     meshes.length / 2,
//     totalVertexCount,
//     totalIndexCount,
//     new THREE.MeshBasicMaterial()
// );

// const hiresGeomIdFor = [];
// const lowresGeomIdFor = [];

// meshes.forEach((m) => {
//     const [base_name, mesh_resolution] = m.name.split("-");

//     if ( !mesh_map.has(base_name) ){
//         mesh_map.set(base_name, new Map());
//         mesh_map.get(base_name).set(mesh_resolution, m);
//     } else {
//         mesh_map.get(base_name).set(mesh_resolution, m);
//     }
// });

// mesh_map.forEach(( value,key ) => {
    
//     const hi_res_mesh = value.get("hires");
//     const low_res_mesh = value.get("lowres");

//     const hiresId = batchedMesh.addGeometry(hi_res_mesh.geometry);
//     const lowresId = batchedMesh.addGeometry(low_res_mesh.geometry);

//     const instanceId = batchedMesh.addInstance(lowresId);
//     batchedMesh.setMatrixAt(instanceId, hi_res_mesh.matrixWorld);

//     hiresGeomIdFor[instanceId] = hiresId;
//     lowresGeomIdFor[instanceId] = lowresId;
// });

// batchedMesh.needsUpdate = true;

// scene.add(batchedMesh);

// const nearInstances = new Set();

// batchedMesh.computeBoundsTree({ maxDepth: 40 });
// // console.log(bvh)

// function updateLODs() {
//     const newNear = new Set();
//     batchedMesh.intersectsSphere(camera.position, 10, (instanceID) => {
//         newNear.add(instanceID);
//     });

//     for (const id of newNear) {
//         if (!nearInstances.has(id)) {
//             batchedMesh.setGeometryIdAt(id, hiresGeomIdFor[id]);
//         }
//     }

//     for (const id of newInstances) {
//         if (!newNear.has(id)) {
//             batchedMesh.setGeometryIdAt(id, lowresGeomIdFor[id])
//         }
//     }

//     nearInstances.clear();
//     for (const id of newNear) newInstances.add(id);
// };

// let lastUpdatePos = camera.position.clone();
// const UPDATE_THRESHOLD = 10 * 0.25;

// function checkUpdateLODs() {
//     if (camera.position.distanceTo(lastUpdatePos) > UPDATE_THRESHOLD) {
//         updateLODs();
//         lastUpdatePos.copy(camera.position);
//     }
// }


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


// // BatchedMesh with LOD - Using custom GLTF script with Piperack model
// extendBatchedMeshPrototype();

// THREE.Mesh.prototype.raycast = acceleratedRaycast;
// THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

// let batchedMesh;
// let uuid_map = new Map();

// async function init() {

//     let totalInstanceCount = 0;
//     let totalVertexCount = 0;
//     let totalIndexCount = 0;
    
//     const loader_instance = new GLTFLoader().setPath('models/bim-model/');
//     const gltf = await loader_instance.loadAsync('test-mep.glb')
    
//     const meshes = [];

//     gltf.scene.traverse((child) => {
//         if (child.isMesh) {
//             meshes.push( child )
//         };
//     });

//     for (const child of meshes) {
//         const geom = child.geometry;
//         const geom_uuid = geom.uuid;
//         const index_count = geom.index.count;
//         const vertex_count = geom.attributes.position.count;
//         const inst_matrix = child.matrixWorld.clone();

//         const [base_name, mesh_resolution] = child.name.split("-");

//         if ( !uuid_map.has( base_name )){
//             // If map does not have the mesh already, first create it
            
//             uuid_map.set( base_name, new Map() );

//             uuid_map.get( base_name ).set( "geometry", [] );
//             uuid_map.get( base_name ).get( "geometry").push( geom )

//             uuid_map.get( base_name ).set( "LODIndexCount", index_count * 2 );
//             uuid_map.get( base_name ).set( "matrix", [] );

//             uuid_map.get( base_name ).get( "matrix").push( inst_matrix );

//             totalVertexCount += vertex_count;
//             totalIndexCount += index_count * 2;
//             totalInstanceCount += 1;
        
//         } else {
            
//             if ( mesh_resolution === "hires"){
//                 uuid_map.get( base_name ).get( "geometry").unshift( geom )
//             } else {
//                 uuid_map.get( base_name ).get( "geometry").push( geom )
//             };

//             totalInstanceCount += 1;
//         };
//     };

//     batchedMesh = new THREE.BatchedMesh( meshes.length / 2, totalVertexCount, totalIndexCount, new THREE.MeshStandardMaterial() );

//     uuid_map.forEach((value, key) => {

//         const geometry = value.get("geometry");
//         const LODIndexCount = value.get("LODIndexCount")
//         const matrices = value.get("matrix");

//         const geometry_hires = geometry[ 0 ];
//         const geometry_lowres = geometry[ 1 ];
        
//         const geometryId = batchedMesh.addGeometry( geometry_hires, -1, LODIndexCount );
//         batchedMesh.addGeometryLOD( geometryId, geometry_lowres, 10 );

//         const instanceId = batchedMesh.addInstance( geometryId )
//         batchedMesh.setMatrixAt( instanceId, matrices[ 0 ] )

//     });

//     batchedMesh.needsUpdate = true;

//     // // compute blas (bottom-level acceleration structure) bvh ( three-mesh-bvh )
//     // batchedMesh.computeBoundsTree({maxDepth: 40});

//     scene.add(batchedMesh);
// };

// init();


// // compute tlas (top-level acceleration structure) bvh ( @three.ez/batched-mesh-extensions )
// const tlasBVH = batchedMesh.computeBVH( THREE.WebGLCoordinateSystem );
// const nearInstances = new Set()

// function updateLODs(){
//     const newNear = new Set()
//     tlasBVH.intersectsSphere(camera.position, 10, (instanceId) => {
//         newNear.add(instanceId);
//     });

//     for (const id of newNear) {
//         if (!newNear.has(id)) {
//             batchedMesh.setGeometryIdAt(id, hires)
//         }
//     }
// }

let frameCount = 0

function animate() {
    requestAnimationFrame(animate);
    // profiler.begin("controls");
    controls.update();
    // profiler.end("controls");

    // profiler.begin("renderer");
    renderer.render(scene, camera);
    // profiler.end("renderer");

    // profiler.begin("perfMonitor");
    perfMonitor.update(renderer, scene);
    // profiler.end("perfMonitor");

    if (bvh && frameCount % 2 ==0) {
        updateLODs(camera.position);
    }
    

    // profiler.endFrame();
};

animate();
