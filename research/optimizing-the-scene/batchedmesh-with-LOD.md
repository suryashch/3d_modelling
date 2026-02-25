# BatchedMesh with LOD

We have established that [instancing](instanced-mesh.md) and [batching](batched-mesh.md) are techniques which can be used to improve the performance of the scene. Both these methods tackle the issue of multiple draw calls dominating the resources of our scene. In those examples, we worked with a scene containing ~20k objects and proved that by batching and instancing, we were able to increase FPS count, as well as reduce memory usage. However, we established that this does not relate to GPU performance at all, and in intricately modelled scenes (as in the case with our MEP model), we will still be throttled by the performance of the GPU.



Now we will add [LOD control](../hosting-3d-model/per-object-lod-control-with-threejs.md) to this scene, reducing the overall triangle count too and hopefully improving performance even further.

We draw inspiration for this project from [this example](https://threejs.org/examples/webgl_batch_lod_bvh.html) by gkjohnson.

![LOD with BatchedMesh example](img/lod-with-batchedmesh-example.png)

## Problem Statement

[In prior research]((../hosting-3d-model/per-object-lod-control-with-threejs.md)), we implemented LOD control to our scene using the [three.LOD()](https://threejs.org/docs/#LOD) class. This tool worked best when we had individual objects being loaded in a standard fashion.

![LOD control using three.LOD()](../hosting-3d-model/img/first-working-lod-model.gif)

However, when working with `BatchedMesh` we start running into problems. Firstly, our objects are no longer saved as meshes- they are saved as instances. We need to be deliberate with how we load our objects into the buffer. This adds an additional layer of complexity that will need to be addressed.

Secondly, since we're dealing with contiguous blocks of memory here, we will need to address how the LOD swapping mechanism works at the CPU - GPU interaction level. The last thing we'd want is to streamline our scene with batching and instancing, and then ruin it all by having the CPU send throusands of draw calls each frame when needing to swap the LOD of the objects.

And lastly, since we have so many objects in the scene, we do not want to be using traditional distance check algorithms when determining the objects that lie in our search radius. This will lead to many redundant calculations, and could even cause an entirely new bottleneck to our scene that will need fixing. Here, I would like to implement an [octree](notebooks/octree-querying.ipynb) search system that will narrow down our distance calculations to only a few carefully selected objects. I have an entire repo dedicated to studying [octree mechanics](https://github.com/suryashch/octree), so check that out.

This problem requires three logical parts that all need to come together and work in harmony- a three body problem, if you will.

## Understanding the Example

The example scene from gkjohnson provides us with a good starting point. [Here is the code behind it](https://github.com/mrdoob/three.js/blob/master/examples/webgl_batch_lod_bvh.html). The main code section we're interested in the </script> tag. There is a lot of code here, so I won't paste it unless it is important, but feel free to open and follow along if you so wish.

Before we peer into the code, I would like to list out the main questions I'd like to have answered-->

1) How are the LOD's of the geometry being created?
2) How is the LOD added to the `BatchedMesh`?
3) How does the engine know which instances of the mesh are closest to the camera?
4) What sort of acceleration structure is being used to conduct our distance checks for determining active LODs?

We will keep these questins in mind as we move through the code.

Things kick off at the top with the imports. There are a few new ones that have not been seen before.

```js
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { acceleratedRaycast, computeBatchedBoundsTree } from 'three-mesh-bvh';

import { createRadixSort, extendBatchedMeshPrototype, getBatchedMeshLODCount } from '@three.ez/batched-mesh-extensions';
import { performanceRangeLOD, simplifyGeometriesByErrorLOD } from '@three.ez/simplify-geometry';
```

The first import is just the base three.js library. The next 4 are cosmetic and not necessarily related to the mechanism. What is important are the last 3- `three-mesh-bvh`, `@three.ez/batched-mesh-extensions` and `three.ez/simplify-geometry`.

[`three-mesh-bvh`](https://github.com/gkjohnson/three-mesh-bvh) is a library used to create a Bounding Volume Hierarchy (BVH) of your scene. A BVH is similar to an octree, but rather than recursively divide by spatial coordinates, we divide by objects in the scene. More on this later.

[`batched-mesh-extensions`](https://github.com/agargaro/batched-mesh-extensions/) is a library that adds functionality to the `batchedmesh` object in threejs. More on this later.

And finally, [`simplify-geometry`](https://www.npmjs.com/package/@three.ez/simplify-geometry) appears to be a tool used to create multiple LOD's of a mesh. We shall also explore this later.

The code moves on to setting up metadata for the scene. We have discussed the basic [nuaces and requirements for this here](../hosting-3d-model/analysis_threejs.md). One additional initialization we observe here is for batchedMesh extensions.

```js
// add and override BatchedMesh methods ( @three.ez/batched-mesh-extensions )
    extendBatchedMeshPrototype();
```

This code block is defined in the docs for [`three.ez/batched-mesh-extensions`](https://github.com/agargaro/batched-mesh-extensions/), and must be called to enable the extended functions for `BatchedMesh`.

A variable of interest here is `batchedMesh` which shall be used to create our batchedmesh object later.

```js
let batchedMesh;
```

There are a few additional terms in here, and one which is particularly of interest is the initialization of the raycaster.

```js
const raycaster = new THREE.Raycaster();
```

A raycaster allows for user interaction with the 3D model- it is how the model knows which object in the scene you have clicked on. This is the best analogy I have to understand how raycasting works. When you click on an object in the scene, think of the mouse emmitting a ray of light directly into the scene. This ray gets intersected by objects in the scene, and the first object to get hit is the object of interest. A raycaster "casts rays". Hopefully this helps.

The `init` function is where bulk of our main code is. Once again, I wont post the full code here, but feel free to follow along.

The code block I am interested in is the initialization of the BatchedMesh, which is here.

```js
const geometries = [
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 1, 1 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 1, 2 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 1, 3 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 1, 4 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 1, 5 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 2, 1 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 2, 3 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 3, 1 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 4, 1 ),
    new THREE.TorusKnotGeometry( 1, 0.4, 256, 32, 5, 3 )
];

// generate 4 LODs (levels of detail) for each geometry
const geometriesLODArray = await simplifyGeometriesByErrorLOD( geometries, 4, performanceRangeLOD );

// create BatchedMesh
const { vertexCount, indexCount, LODIndexCount } = getBatchedMeshLODCount( geometriesLODArray );
batchedMesh = new THREE.BatchedMesh( instancesCount, vertexCount, indexCount, new THREE.MeshStandardMaterial( { metalness: 1, roughness: 0.8 } ) );
```

`geometries` appears to be an array that contains the geometry of our individual instance objects. The parameters of `TorusKnotGeometry()` appear to control the shape of this object.

We then create a new variable `geometriesLODArray` using the function `simplifyGeometriesByErrorLOD`. This variable is then passed into another function `getBatchedMeshLODCount` which seems to return our `vertexCount`, `indexCount` and `instanceCount`- all of which are initialization parameters for [`BatchedMesh`](batched-mesh.md). For the time being, we will be creating our own LOD's so this step is not important.

The batchedmesh object is created using the properties acquired from the LOD generation step.

The next bit of code appears to index and instance our geometries. Here is what it looks like.

```js
// add geometries and their LODs to the batched mesh ( all LODs share the same position array )
for ( let i = 0; i < geometriesLODArray.length; i ++ ) {

    const geometryLOD = geometriesLODArray[ i ];
    const geometryId = batchedMesh.addGeometry( geometryLOD[ 0 ], - 1, LODIndexCount[ i ] );
    batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 1 ], 50 );
    batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 2 ], 100 );
    batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 3 ], 125 );
    batchedMesh.addGeometryLOD( geometryId, geometryLOD[ 4 ], 200 );

}
```

Let's break this down. The array geometriesLODArrayis an array of arrays. The first level of this array contains a reference to the specific geometry in the scene (specifically here it refers to our 10 different `TorusKnowGeometries` defined earlier). The second level of the list contains the geometry associated with our different LOD's. Researching a little more on [`SimplifyGeometry`](https://www.npmjs.com/package/@three.ez/simplify-geometry), we see that index 0 corresponds to the highest detailed mesh. We save the vairable `geometrylOD` to be the ith index of this array, so effectively we are looping through our different object instances.

The `geometryID` is returned after adding the geometry of our object to the `batchedMesh`. `batchedMesh.addGeometry()` is in the base three.js library and is a default method in batchedMesh. This method returns the specific ID of our geometry, which we can use later for instancing. Within the `addGeometry()` method, we are passing the specific geometry itself (in this case, geometryLOD[ 0 ], corresponding to the highest detailed mesh here). The next two parameters correspond to `reservedVertexCount`, and `reservedIndexCount`. -1 signifies the default value, and we pass in the exact count of the number of instances we would like in the scene through the `LODIndexCount`, returned by the function `getBatchedMeshLODCount`.

We are then introduced to a new method, `.addGeometryLOD()`. This is a new method from the [`batched-mesh-extensions` library](https://github.com/agargaro/batched-mesh-extensions/) specifically under the [`LOD.ts`](https://github.com/agargaro/batched-mesh-extensions/blob/master/src/core/feature/LOD.ts) file. The parameters are the ID of the geometry (from the previous paragraph), the geometry of the LOD itself, from the `geometryLOD` array, and the distance at which the switch occurs. Each of the 4 LODs are added at the distances specified.

That was an absolute mouthful. Essentially, we create a nested array geometryLOD, that contains at level 1, the basic geometries that exist in our model. Level 2 of the array contains the specific LODs for that object. Calling geometriesLODArray[0] will give us all the LOD's of the object in index 0. For each item in our for loop, we save the geometry of the object to our `BatchedMesh`, and then add the individual LOD's via the `addGeometryLOD()` method.

The next step in our code is to add the postitions of each of our instances. The code in our sample scene here adds these positions at random and places each instace on a 2x2 grid.

```js
const sqrtCount = Math.ceil( Math.sqrt( instancesCount ) );
const size = 5.5;
const start = ( sqrtCount / - 2 * size ) + ( size / 2 );

for ( let i = 0; i < instancesCount; i ++ ) {

    const r = Math.floor( i / sqrtCount );
    const c = i % sqrtCount;
    const id = batchedMesh.addInstance( Math.floor( Math.random() * geometriesLODArray.length ) );
    position.set( c * size + start, 0, r * size + start );
    quaternion.random();
    batchedMesh.setMatrixAt( id, matrix.compose( position, quaternion, scale ) );
    batchedMesh.setColorAt( id, color.setHSL( Math.random(), 0.6, 0.5 ) );

}
```

We won't go through this code in detail since our positions will be predefined in our scene. However, the key methods beind called here are `.addInstance()`, `setMatrixAt` and `setColorAt`, all of which are [base `batchedMesh` methods](https://threejs.org/docs/#BatchedMesh).

Moving on, the next 2 code lines relate to our acceleration structures.

```js
// compute blas (bottom-level acceleration structure) bvh ( three-mesh-bvh )
batchedMesh.computeBoundsTree();

// compute tlas (top-level acceleration structure) bvh ( @three.ez/batched-mesh-extensions )
batchedMesh.computeBVH( THREE.WebGLCoordinateSystem );
```

Researching further into the mechanisms of TLAS (Top Level Acceleration Structure) and BLAS (Bottom Level Acceleration Structure), we see that both improve the performance of raycasting. Both methods relate to the BVH (Bounding Volume Hierarchy) that is a [similar concept to an octree](https://github.com/suryashch/octree). 

The TLAS can be thought of as a broad phase algorithm. It starts at the top level of the scene and works its way down, checking constantly to see if our camera view intersects with a leaf node. The BLAS initiates after the TLAS is completed and iterates only through the results provided by the TLAS algorithm. The BLAS is more precise and goes down to the triangle level, to see if the raycast intersects with an object.

For the time being, we are more intersted in the TLAS, although the BLAS will be very useful too.

Finally, the batchedMesh is loaded to the scene. 

```js
scene.add( batchedMesh );
```

I think we're armed with sufficient information to recreate this concept with our own internal models.

## Basic Implementation

We shall try to recreate the above example using our Human Foot model. The first thing we need to do is split it out into its corresponding LOD's.





## Links

[instancing](instanced-mesh.md)

[batching](batched-mesh.md)

[this example](https://threejs.org/examples/webgl_batch_lod_bvh.html)

[three.LOD()](https://threejs.org/docs/#LOD)

[octree](notebooks/octree-querying.ipynb)

[octree mechanics](https://github.com/suryashch/octree)

[Here is the code behind it](https://github.com/mrdoob/three.js/blob/master/examples/webgl_batch_lod_bvh.html)

[nuaces and requirements for this here](../hosting-3d-model/analysis_threejs.md)

[`SimplifyGeometry`](https://www.npmjs.com/package/@three.ez/simplify-geometry)

[`three.ez/batched-mesh-extensions`](https://github.com/agargaro/batched-mesh-extensions/)

[`LOD.ts`](https://github.com/agargaro/batched-mesh-extensions/blob/master/src/core/feature/LOD.ts)

[base `batchedMesh` methods](https://threejs.org/docs/#BatchedMesh)