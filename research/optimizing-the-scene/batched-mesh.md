# Batched Mesh

The [batched mesh](https://threejs.org/docs/#BatchedMesh) class of objects in three.js allow for draw call strerammlining when you have multiple individual objects in the scene with common materials. For large scenes with lots of individual objects, this means we can condense all our meshes sharing material properties down into one draw call for the GPU to handle, significantly improving the [CPU bottleneck that we tend to observe in large scenes](draw-calls-in-scenes.md). We shall work with our `architectural` BIM model and see if we can optimize the total number of draw calls that the scene is currently making.

## Implementation

We observe the following baseline results in our model.

![Performance Results Architectural Model](img/performance-results-architectural.png)

The results are not great. ~16,000 draw calls in the scene- one for each object. Extremely low FPS count at approximately 10 FPS. This shall serve as our baseline for all implementations going forward.

As a reminder, the scene above was loaded to three.js without any optimizations as follows.

```js
const loader = new GLTFLoader().setPath('models/bim-model/');
loader.load('sixty5-architectural.glb', (gltf) => { // 'piperacks_merged.glb
    const mesh = gltf.scene;
    mesh.position.set(0,0,0);
    scene.add(mesh);
    console.log(mesh)
})
```

For more information on loading glb files to a three.js scene, [see this article here](../hosting-3d-model/analysis_threejs.md).

To implement the `BatchedMesh` method, we need to understand the parameters and considerations to keep in mind. From the [docs](https://threejs.org/docs/#BatchedMesh), we observe that this objects requires 4 parameters- 
- `maxInstanceCount`: corresponding the the individual objects in the scene,
- `maxVertexCount`: corresponding to the max number of vertices that exist in the scene,
- `maxIndexCount`: corresponding to the total number of Indices (pointers to the vertex ID, used for creating faces), and,
- `material`: the material being used.

We shall be getting these properties by [traversing through the scene](../hosting-3d-model/bpy_with_lod.md).


## Links

[batched mesh](https://threejs.org/docs/#BatchedMesh)

[traversing through the scene](../hosting-3d-model/bpy_with_lod.md)

[CPU bottleneck that we tend to observe in large scenes](draw-calls-in-scenes.md)