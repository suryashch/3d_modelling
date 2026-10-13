import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { ObjectBVH, acceleratedRaycast } from 'three-mesh-bvh';
import nipplejs from 'nipplejs';

import { PerformanceMonitor } from './utils/performanceMonitor.js';

const guiControls = {
    perspective : true,
    fov: 45,
    test: false,
};

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setClearColor( "#949393" )
// renderer.setClearColor( "#363535" )
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();

const perspCamera = new THREE.PerspectiveCamera( guiControls.fov, window.innerWidth / window.innerHeight, 0.1, 1000 );

const orthoCamera = new THREE.OrthographicCamera(- window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, - window.innerHeight / 2, 0.1, 1000);
const initZoom = 15;
orthoCamera.zoom = initZoom;
orthoCamera.updateProjectionMatrix();

let camera = perspCamera;
const camStartingPosition = new THREE.Vector3( 55, 55, 55 );
camera.position.copy( camStartingPosition );

// const light = new THREE.AmbientLight();
// scene.add(light);

const controls = new OrbitControls( camera, renderer.domElement );
controls.enablePan = true;
controls.minDistance = 0.1;
controls.maxDistance = 150;
controls.minPolarAngle = 0;
controls.maxPolarAngle = 3;
controls.zoomSpeed = 0.5;
controls.panSpeec = 0.5;
controls.rotateSpeed = 0.15;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
	MIDDLE: THREE.MOUSE.DOLLY,
	RIGHT: THREE.MOUSE.PAN
}

let controlsTargetPoint = new THREE.Vector3( 0, 20, 0 )
let newTargetPoint = controlsTargetPoint;
controls.target.copy( controlsTargetPoint );
controls.update();

const initTargetDistance = controls.target.distanceTo( camStartingPosition );

const gridHelper = new THREE.GridHelper(100, 50, "#9e9e9e", "#5e5e5e");
scene.add( gridHelper );

const raycaster = new THREE.Raycaster();
THREE.Mesh.prototype.raycast = acceleratedRaycast;
raycaster.firstHitOnly = true;

const mouse = new THREE.Vector2();

const performanceMonitor = new PerformanceMonitor();

const n_Instances = 11617;  // 11617    10957
let needsUpdate = false;

const manager = nipplejs.create({
    zone: document.getElementById('zone'),
    mode: 'static',
    shape: 'circle',
    color: {
        front: "#141313",
        back: "rgba(200, 200, 200, 0.1)"
    },
    position: { right: '10%', bottom: '10%' },
    restJoystick: true,
    threshold: 0.9,
});

let currentTarget = controlsTargetPoint;
let currentCameraAngle = camera.rotation;

let eulerAngle = new THREE.Euler();

manager.on( 'move', (e) => {
    
    controls.target.set(
        currentTarget.x - ( e.data.vector.x * 0.50 ),
        currentTarget.y - ( e.data.vector.y * 0.50 ),
        currentTarget.z
    );
    controls.update();
});

manager.on('end', () => {
    controls.target.copy( currentTarget );
    controls.update();
});

const vertexShader = `
    #include <batching_pars_vertex>
    #include <color_pars_vertex>

    varying vec3 v_BatchedNormal;
    varying vec4 v_BatchedColor;
    varying vec3 v_ViewDirection;

    void main() {
        #include <begin_vertex>
        #include <beginnormal_vertex>
        #include <batching_vertex>

        mat4 batchingModelViewMatrix = modelViewMatrix * batchingMatrix;

        vec4 batchedPosition = batchingModelViewMatrix * vec4( position, 1.0 );
        v_ViewDirection = normalize( -batchedPosition.xyz );

        v_BatchedNormal = vec3( normalize( batchingModelViewMatrix * vec4( normal, 0.0 )));

        #include <color_vertex>
        v_BatchedColor = vec4( vColor );
        
        // #include <project_vertex>
        gl_Position = projectionMatrix * batchedPosition;
    }
`

const fragmentShader = `
    varying vec3 v_BatchedNormal;
    varying vec4 v_BatchedColor;
    varying vec3 v_ViewDirection;

    void main() {
        float fresnel = dot( v_ViewDirection, v_BatchedNormal );

        gl_FragColor = vec4( vec3( fresnel * v_BatchedColor.rgb), v_BatchedColor.a );  // v_InstanceColor
        // gl_FragColor = vec4( fresnel * vec3( 0.8, 0.8, 0.8 ), 1.0 );
    }
`


// // Functions

function disposeMaterial(material) {
    // Dispose the material itself
    material.dispose();
    
    // Iterate through material properties to dispose attached textures
    for (const key in material) {
        const value = material[key];
        if (value && typeof value === 'object' && 'minFilter' in value) {
            value.dispose();
        }
    }
};

// gltf.scene.traverse((child) => {
//     if (!child.isMesh) return;

//     // Dispose geometry
//     if (child.geometry) {
//         child.geometry.dispose();
//     }

//     // Dispose material(s)
//     if (child.material) {
//         if (Array.isArray(child.material)) {
//             child.material.forEach(disposeMaterial);
//         } else {
//             disposeMaterial(child.material);
//         }
//     };
// });









// // Geometry


let instancedMesh;
let batchedMesh;
let fittingsBatchedMesh;
let structureBatchedMesh;
let archBatchedMesh;
let interiorBatchedMesh;

async function init() {
    
    let group = new THREE.Group();
    const loader = new GLTFLoader().setPath('models/bim-model/');
    
    let gltf = await loader.loadAsync('mep-hyperinstance-ifc-guid-color.glb');
    let fittingsGltf = await loader.loadAsync('mep-fittings_hi-lo-res_ifc-guid-2.glb');
    // let fittingsGltf = await loader.loadAsync('mep-fittings_ifc-guid.glb');
    // let structureGltf = await loader.loadAsync('sixty5-structural.glb');
    // let archGltf = await loader.loadAsync('sixty5-architectural-facade-final.glb')
    // let interiorGltf = await loader.loadAsync('sixty5-architectural-interiors-final.glb')
    
    const geometry = gltf.scene.children[0].geometry;

    // const material = new THREE.MeshLambertMaterial({
    //     flatShading: true,
    // });

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        wireframe: false,
        side: THREE.DoubleSide,
    });

    const nonFocusMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        opacity: 1,
        side: THREE.FrontSide,
    })
    
    // // InstancedMesh

    // const instancedColorsArray = new Float32Array(n_Instances * 3);
    // geometry.setAttribute('a_InstanceColor', new THREE.InstancedBufferAttribute(instancedColorsArray, 3))
    
    // instancedMesh = new THREE.InstancedMesh( geometry, material, n_Instances );
    // group.add( instancedMesh );

    // let matrix;
    // let i = 0;

    // gltf.scene.traverse((child) => {
    //     if ( child.isMesh ) {
            
    //         if ( i > n_Instances ) {
    //             console.log("Exceeded number of instances");
    //             return;
    //         };

    //         instancedColorsArray[i * 3 + 0] = child.userData.R;
    //         instancedColorsArray[i * 3 + 1] = child.userData.G;
    //         instancedColorsArray[i * 3 + 2] = child.userData.B;

    //         matrix = child.matrixWorld.clone();
            
    //         instancedMesh.setMatrixAt( i, matrix );
    //         i++;
    //     };
    // });

    // instancedMesh.needsUpdate = true;

    // group.add(instancedMesh);

    // instancedMesh = null;

    let visited = new Set();
    let totalInstanceCount = 0;
    let totalVertexCount = 0;
    let totalIndexCount = 0;

    fittingsGltf.scene.traverse((child) => {
        if (child.isMesh ) {
            totalInstanceCount += 1;
            
            if ( !visited.has( child.geometry.uuid ))
                visited.add( child.geometry.uuid );
                totalVertexCount += child.geometry.attributes.position.count;
                totalIndexCount += child.geometry.index.count;
        }

        console.log({
            "nCount": totalInstanceCount,
            'vCount': totalVertexCount,
            'iCount': totalIndexCount
        })
    })




    // // // BatchedMesh
    
    batchedMesh = new THREE.BatchedMesh( 10957, 64, 192, material );  // material
    const geometryId = batchedMesh.addGeometry( geometry );
    
    let matrix = new THREE.Matrix4();
    let i = 0;
    let instanceId;

    let instColor = new THREE.Vector4( );
    let defaultColor = new THREE.Vector4( 0.8, 0.8, 0.8, 1.0 );

    gltf.scene.traverse((child) => {
        if ( child.isMesh ) {
            
            if ( i > n_Instances ) {
                console.log("Exceeded number of instances");
                return;
            };

            matrix = child.matrixWorld.clone();

            if ( !child.userData.R ) {
                instColor.copy( defaultColor );
            } else {
                instColor.set( child.userData.R, child.userData.G, child.userData.B, child.userData.A );
            };
            
            instanceId = batchedMesh.addInstance( geometryId );
            batchedMesh.setMatrixAt( instanceId, matrix );
            batchedMesh.setColorAt( instanceId, instColor );
            i++;

            child.geometry = null;
            child.matrixWorld = null;

            child.traverse((element) => {
                element = null;
            })


            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(disposeMaterial);
                } else {
                    disposeMaterial(child.material);
                }
            };
        };
    });

    group.add( batchedMesh );


    fittingsBatchedMesh = new THREE.BatchedMesh( 23234, 5494367, 35104182, nonFocusMaterial );  // nonFocusMaterial
    
    let fittingsId;
    let fittingsVisited = [];
    i = 0;

    const greyColor = new THREE.Vector4(0.28, 0.28, 0.28, 1.0);

    
    // console.log(fittingsGltf);

    fittingsGltf.scene.traverse(( child ) => {
        if ( child.isMesh && child.children.length === 0 ) {    // && child.children.length === 0
            
            if ( i > n_Instances ) {
                console.log("Exceeded number of instances");
                return;
            };

            if ( child.matrix ) {
                matrix = child.matrixWorld.clone();
            } else {
                rotation = child.rotation.clone();
                translation = child.translation.clone();
                scale = child.scale.clone();

                matrix.compose(translation, rotation, scale);
            }
            
            
            if (!fittingsVisited.includes( child.geometry.uuid )) {
                fittingsId = fittingsBatchedMesh.addGeometry( child.geometry );
                fittingsVisited.push( child.geometry.uuid );
            };
            
            instanceId = fittingsBatchedMesh.addInstance( fittingsVisited.indexOf( child.geometry.uuid ));
            fittingsBatchedMesh.setMatrixAt( instanceId, matrix );
            fittingsBatchedMesh.setColorAt( instanceId, greyColor );
            i++;

            child.geometry = null;
            child.matrixWorld = null;

            child.traverse((element) => {
                element = null;
            })


            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(disposeMaterial);
                } else {
                    disposeMaterial(child.material);
                }
            };
        }
    })

    group.add( fittingsBatchedMesh );
    

    // structureBatchedMesh = new THREE.BatchedMesh(1208, 197729, 332838, material);

    // let structureVisited = [];
    // i=0;

    // structureGltf.scene.traverse(( child ) => {
    //     if ( child.isMesh ) {
            
    //         if ( i > n_Instances ) {
    //             console.log("Exceeded number of instances");
    //             return;
    //         };

    //         matrix = child.matrixWorld.clone();
            
    //         if (!structureVisited.includes( child.geometry.uuid )) {
    //             fittingsId = structureBatchedMesh.addGeometry( child.geometry );
    //             structureVisited.push( child.geometry.uuid );
    //         };
            
    //         instanceId = structureBatchedMesh.addInstance( structureVisited.indexOf( child.geometry.uuid ));
    //         structureBatchedMesh.setMatrixAt( instanceId, matrix );
    //         structureBatchedMesh.setColorAt( instanceId, greyColor );
    //         i++;

    //         child.geometry = null;
    //         child.matrixWorld = null;

    //         child.traverse((element) => {
    //             element = null;
    //         })


    //         if (child.material) {
    //             if (Array.isArray(child.material)) {
    //                 child.material.forEach(disposeMaterial);
    //             } else {
    //                 disposeMaterial(child.material);
    //             }
    //         };
    //     }
    // })

    // // group.add( structureBatchedMesh );






    // archBatchedMesh = new THREE.BatchedMesh(4655, 646450, 1184310, material);

    // let archVisited = [];
    // i=0;

    // archGltf.scene.traverse(( child ) => {
    //     if ( child.isMesh ) {
            
    //         if ( i > n_Instances ) {
    //             console.log("Exceeded number of instances");
    //             return;
    //         };

    //         matrix = child.matrixWorld.clone();
            
    //         if (!archVisited.includes( child.geometry.uuid )) {
    //             fittingsId = archBatchedMesh.addGeometry( child.geometry );
    //             archVisited.push( child.geometry.uuid );
    //         };
            
    //         instanceId = archBatchedMesh.addInstance( archVisited.indexOf( child.geometry.uuid ));
    //         archBatchedMesh.setMatrixAt( instanceId, matrix );
    //         archBatchedMesh.setColorAt( instanceId, greyColor );
    //         i++;

    //         child.geometry = null;
    //         child.matrixWorld = null;

    //         child.traverse((element) => {
    //             element = null;
    //         })


    //         if (child.material) {
    //             if (Array.isArray(child.material)) {
    //                 child.material.forEach(disposeMaterial);
    //             } else {
    //                 disposeMaterial(child.material);
    //             }
    //         };
    //     }
    // })

    // group.add( archBatchedMesh );






    // interiorBatchedMesh = new THREE.BatchedMesh(6631, 1888637, 3239355, nonFocusMaterial );

    // let interiorVisited = [];
    // i=0;

    // interiorGltf.scene.traverse(( child ) => {
    //     if ( child.isMesh ) {
            
    //         if ( i > n_Instances ) {
    //             console.log("Exceeded number of instances");
    //             return;
    //         };

    //         matrix = child.matrixWorld.clone();
            
    //         if (!interiorVisited.includes( child.geometry.uuid )) {
    //             fittingsId = interiorBatchedMesh.addGeometry( child.geometry );
    //             interiorVisited.push( child.geometry.uuid );
    //         };
            
    //         instanceId = interiorBatchedMesh.addInstance( interiorVisited.indexOf( child.geometry.uuid ));
    //         interiorBatchedMesh.setMatrixAt( instanceId, matrix );
    //         interiorBatchedMesh.setColorAt( instanceId, greyColor );
    //         i++;

    //         child.geometry = null;
    //         child.matrixWorld = null;

    //         child.traverse((element) => {
    //             element = null;
    //         })


    //         if (child.material) {
    //             if (Array.isArray(child.material)) {
    //                 child.material.forEach(disposeMaterial);
    //             } else {
    //                 disposeMaterial(child.material);
    //             }
    //         };
    //     }
    // })

    // group.add( interiorBatchedMesh );







    // batchedMesh = null;
    // gltf = null;

    // fittingsGltf = null;
    // fittingsBatchedMesh = null;
    
    // const mesh = new THREE.Mesh( geometry, material );
    // scene.add( mesh );
    group.position.set( -21, 0, 32 );

    scene.add( group );
    const bvh = new ObjectBVH( group );
    
    // group = null;

    
    
    window.addEventListener( 'dblclick', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects( bvh.objects );
    
        if (intersects.length > 0) {
            newTargetPoint = intersects[0].point;
            currentTarget = newTargetPoint;
            needsUpdate = true;
            requestAnimationFrame(animate);
        };
    });

    window.addEventListener( 'resize', () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        requestAnimationFrame(animate);
    });

    controls.addEventListener( 'change', () => {
        requestAnimationFrame(animate);
    });
    
    configGUI();
    animate();

};

function configGUI() {
    const gui = new GUI();

    gui.add(guiControls, "perspective").name("perspective").onChange( (v) => {
        guiControls.perspective = v;

        changeCamera( v );
    });

    gui.add(guiControls, "fov", 10, 90, 5).name("fov").onChange( (v) => {
        camera.fov = v;
        camera.updateProjectionMatrix();
        requestAnimationFrame(animate);
    });

    gui.add(guiControls, "test").name("test").onChange( (v) => {
        guiControls.test = v;

        instancedMesh.material.uniforms.u_PerspToOrtho = v ? 0.0 : 1.0;
    })
}

function changeCamera( perspective ) {
    let zoomScale;
    let prevPos = camera.position;
    let targetDistance;
    
    if ( !perspective ) {
        targetDistance = controls.target.distanceTo( prevPos );

        zoomScale = initZoom * initTargetDistance / targetDistance;
        
        camera = orthoCamera;
        camera.zoom = zoomScale;
        
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        }
    
    } else {
        // zoomScale = camera.zoom;

        // targetDistance = initZoom * initTargetDistance / zoomScale;
        // directionVector = camera.position.sub( controls.target ).normalize();

        camera = perspCamera;
        // camera.position.set( directionVector.multiplyScalar(targetDistance) );

        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        }
    }

    camera.position.copy( prevPos );
    camera.updateProjectionMatrix();
    
    controls.object = camera;
    controls.update();

    requestAnimationFrame(animate);

    console.log(camera);
}

function animate() {
    renderer.render( scene, camera );
    
    if ( needsUpdate ) {
        if ( controls.target.distanceToSquared( newTargetPoint ) < 0.05 ) { 
            needsUpdate = false;
            return;
        };
        
        controls.target.lerp( newTargetPoint, 0.15 );
        controls.update();
    };

    performanceMonitor.update( renderer, scene );
};


init();
