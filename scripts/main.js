import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerformanceMonitor } from './performance_monitor.js'

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("#262837");
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
// camera.position.set(40,10,25);

const camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
scene.add( camera );
camera.position.set(40,10,25);
camera.zoom = 10;
camera.updateProjectionMatrix();

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

const light_3 = new THREE.DirectionalLight(0xffffff, 0.25);
light_3.position.set(-10,-10,10)
scene.add(light_3);

const light_4 = new THREE.DirectionalLight(0xffffff, 0.25);
light_4.position.set(10,-10,10)
scene.add(light_4);

const light_5 = new THREE.DirectionalLight(0xffffff, 0.25);
light_5.position.set(-10,10,10)
scene.add(light_5);

const gridHelper = new THREE.GridHelper( 100, 50 ); // ( size, divisions )
scene.add( gridHelper );

const perfMonitor = new PerformanceMonitor()

// // // Basic Loader
// const loader = new GLTFLoader().setPath('models/bim-model/');
// loader.load('sixty5-interiors-kitchens.glb', (gltf) => { // 'piperacks_merged.glb
//     const mesh = gltf.scene;
//     mesh.position.set(0,0,0);
//     scene.overrideMaterial = new THREE.MeshLambertMaterial({
//         color:"#156082",
//     });
//     scene.add(mesh);
// })

// Batched Mesh Loader



const loader = new GLTFLoader().setPath('models/bim-model/');
loader.load('sixty5-interiors-kitchens.glb', (gltf) => {
    const materials = new Map()

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            if (!materials.has(child.material.name)) {
                materials.set(child.material.name, []);
                materials.get(child.material.name).push(child);
            } else {
                materials.get(child.material.name).push(child);
            }
        }    
    });

    materials.forEach((meshes, mat) => {
        let totalVertexCount = 0;
        let totalIndexCount = 0;

        meshes.forEach((m) => {
            totalVertexCount += m.geometry.attributes.position.count;
            totalIndexCount += m.geometry.index.count;
        })

        const batchedMesh = new THREE.BatchedMesh(
            meshes.length,
            totalVertexCount,
            totalIndexCount,
            meshes[0].material
        )

        meshes.forEach((m,i) => {
            const geometryId = batchedMesh.addGeometry(m.geometry);
            const instanceId = batchedMesh.addInstance(geometryId);

            m.updateMatrixWorld();
            batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
        })

        scene.add(batchedMesh);
    })
})

const loader_2 = new GLTFLoader().setPath('models/bim-model/');
loader_2.load('sixty5-structural.glb', (gltf) => {
    const materials = new Map()

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            if (!materials.has(child.material.name)) {
                materials.set(child.material.name, []);
                materials.get(child.material.name).push(child);
            } else {
                materials.get(child.material.name).push(child);
            }
        }    
    });

    materials.forEach((meshes, mat) => {
        let totalVertexCount = 0;
        let totalIndexCount = 0;

        meshes.forEach((m) => {
            totalVertexCount += m.geometry.attributes.position.count;
            totalIndexCount += m.geometry.index.count;
        })

        const batchedMesh = new THREE.BatchedMesh(
            meshes.length,
            totalVertexCount,
            totalIndexCount,
            meshes[0].material
        )

        meshes.forEach((m,i) => {
            const geometryId = batchedMesh.addGeometry(m.geometry);
            const instanceId = batchedMesh.addInstance(geometryId);

            m.updateMatrixWorld();
            batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
        })

        scene.add(batchedMesh);
    })
})

const loader_3 = new GLTFLoader().setPath('models/bim-model/');
loader_3.load('sixty5-mep-lowres.glb', (gltf) => {
    const materials = new Map()

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            if (!materials.has(child.material.name)) {
                materials.set(child.material.name, []);
                materials.get(child.material.name).push(child);
            } else {
                materials.get(child.material.name).push(child);
            }
        }    
    });

    materials.forEach((meshes, mat) => {
        let totalVertexCount = 0;
        let totalIndexCount = 0;

        meshes.forEach((m) => {
            totalVertexCount += m.geometry.attributes.position.count;
            totalIndexCount += m.geometry.index.count;
        })

        const batchedMesh = new THREE.BatchedMesh(
            meshes.length,
            totalVertexCount,
            totalIndexCount,
            meshes[0].material
        )

        meshes.forEach((m,i) => {
            const geometryId = batchedMesh.addGeometry(m.geometry);
            const instanceId = batchedMesh.addInstance(geometryId);

            m.updateMatrixWorld();
            batchedMesh.setMatrixAt(instanceId, m.matrixWorld);
        })

        scene.add(batchedMesh);
    })
})


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
//         new THREE.MeshBasicMaterial({
//             wireframe:true,
//             color: "0x000000"
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