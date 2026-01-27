# Batched Mesh

The [batched mesh](https://threejs.org/docs/#BatchedMesh) class of objects in three.js allow for draw call strerammlining when you have multiple individual objects in the scene with common materials. For large scenes with lots of individual objects, this means we can condense all our meshes sharing material properties down into one draw call for the GPU to handle, significantly improving the [CPU bottleneck that we tend to observe in large scenes](draw-calls-in-scenes.md). We shall work with our `architectural` BIM model and see if we can optimize the total number of draw calls that the scene is currently making.

## Implementation

We observe the following baseline results in our model.

![Performance Results Architectural Model](img/performance-results-architectural.png)

The results are not great. ~16,000 draw calls in the scene- one for each object. Extremely low FPS count at approximately 10 FPS. This shall serve as our baseline for all implementations going forward.

As a reminder, the scene above was loaded to three.js without any optimizations as follows.

```js
const loader = new GLTFLoader().setPath('models/bim-model/');
loader.load('sixty5-architectural.glb', (gltf) => {
    const mesh = gltf.scene;
    mesh.position.set(0,0,0);
    scene.add(mesh);
})
```

For more information on loading glb files to a three.js scene, [see this article here](../hosting-3d-model/analysis_threejs.md).

To implement the `BatchedMesh` method, we need to understand the parameters and considerations to keep in mind. From the [docs](https://threejs.org/docs/#BatchedMesh), we observe that this objects requires 4 parameters-
- `maxInstanceCount`: corresponding the the individual objects in the scene,
- `maxVertexCount`: corresponding to the max number of vertices that exist in the scene,
- `maxIndexCount`: corresponding to the total number of Indices (pointers to the vertex ID, used for creating faces),
- `material`: the material being used.

We shall be getting these properties by [traversing through the scene](../hosting-3d-model/bpy_with_lod.md). Here is the high level code which we use to acquire propoerties.

```js
const loader = new GLTFLoader().setPath('models/bim-model/');
loader.load('sixty5-architectural.glb', (gltf) => {
    const meshes = []

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            meshes.push(child);
        }
    });

    let totalVertexCount = 0;
    let totalIndexCount = 0;

    meshes.forEach((mesh) => {
        totalVertexCount += mesh.geometry.attributes.position.count;
        totalIndexCount += mesh.geometry.index.count;
    })

    const batchedMesh = new THREE.BatchedMesh(
        meshes.length,
        totalVertexCount,
        totalIndexCount,
        new THREE.MeshStandardMaterial()
    )

    meshes.forEach((mesh,_) => {
        const geometryId = batchedMesh.addGeometry(mesh.geometry);
        const instanceId = batchedMesh.addInstance(geometryId);

        mesh.updateMatrixWorld();
        batchedMesh.setMatrixAt(instanceId, mesh.matrixWorld);
    })

    scene.add(batchedMesh);
})
```

Let's break this down.

The first step is a simple [traversal loop](../hosting-3d-model/bpy_with_lod.md) which we use to acquire our meshes. The meshes are saved to an empty array called `meshes`. We then initialize two variables `totalVertexCount` and `totalIndexCount` which shall be used to store this data from the model.

For each of the meshes in the array, we need to get the number of vertices and indices. These properties exist in the `geometry` tab of the object. We can print the contents of the geometry attribute to the console as follows. This will sit within our traversal loop.

```js
gltf.scene.traverse((child) => {
    if (child.isMesh) {
        console.log(child.geometry);
    }
})
```
The output of this looks like so in the console.

![Object Attributes printed to console](img/object-geometry-attributes-in-console.png)

We observe a section for the `position`. This will track the number of vertices that exist in each mesh. As well, we notice a section called `index`. This will track the number of indices that exist in each mesh. We notice that the number of indices and vertices are different within the same mesh. This is because the vertices point to exact points in space, but indices refer to shapes that are drawn using these vertices. A vertex may be reused across different faces in a mesh, in which case it will have multiple index counts that all refer to the same vertex.

We proceed with this information, and push the counts for each mesh to our created variables `totalVertexCount` and `totalIndexCount`.

```js
meshes.forEach((mesh) => {
    totalVertexCount += mesh.geometry.attributes.position.count;
    totalIndexCount += mesh.geometry.index.count;
})
```

Now that we have this information, we can create our `BatchedMesh` object.

```js
const batchedMesh = new THREE.BatchedMesh(
    meshes.length,
    totalVertexCount,
    totalIndexCount,
    new THREE.MeshStandardMaterial()
)
```

The reason why we pre allocate this memory in our `BatchedMesh` object is so that this entire block of memory (known as a buffer) gets passed from the CPU to the GPU as one `draw call`. In the vanilla implementation, our CPU was passing 16,000 individual draw calls the GPU causing the massive bottleneck.

We pass our required parameters to `BatchedMesh`. Note, for trial purposes we create a new `MeshstandardMaterial`, which will be applied to all objects in our scene. Under normal conditions, we would likely need to split the geometry in the model by their internal memory property, and save each group to a different `BatchedMesh` object.




## Links

[batched mesh](https://threejs.org/docs/#BatchedMesh)

[traversing through the scene](../hosting-3d-model/bpy_with_lod.md)

[CPU bottleneck that we tend to observe in large scenes](draw-calls-in-scenes.md)