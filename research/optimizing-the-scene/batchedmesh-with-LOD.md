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



## Links

[instancing](instanced-mesh.md)

[batching](batched-mesh.md)

[this example](https://threejs.org/examples/webgl_batch_lod_bvh.html)

[three.LOD()](https://threejs.org/docs/#LOD)

[octree](notebooks/octree-querying.ipynb)

[octree mechanics](https://github.com/suryashch/octree)

[Here is the code behind it](https://github.com/mrdoob/three.js/blob/master/examples/webgl_batch_lod_bvh.html)