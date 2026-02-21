# Instanced Mesh

The [Instanced Mesh](https://threejs.org/docs/#InstancedMesh) class of objects in ThreeJS allows for efficient renderings of the same geometry in different locations. Essentially this means that a scene which contains multiple different objects each with the same geometry can render using one 1 [draw call](draw-calls-in-scenes.md). An example of where this may be useful is in rendering of scenes that contain 

Think blades of grass in a field, bolts in a steel beam, 90 degree elbows in a pipe- all have the same geometry, just loaded to different positions in the scene. From a memory perspective this grants us huge savings- we now only need to store the `edge` and `vertex` data of our object once. Everything else can be controlled by adjusting the position, rotation, and scale of the object. This is how video games can have scenes with millions of blades of grass, all which run at a comfortable 60 FPS.


Let's see if we can incorporate the same in our BIM model.

## High Level Logic

The model we will be working with is the MEP (Mechanical, Electrical, Plumbing) model from our Sixty5 BIM model, provided by the [buildingsmart-community](https://github.com/buildingsmart-community). Because we have already [batched our scene](batched-mesh.md), we observe a toasty 130 FPS when rendering this large model. As a reminder, batching allows us to upload geometry data to the buffer directly as one contiguous block of memory, reducing the bottleneck associated with CPU to GPU interactions. Even though our scene contains ~20k individual objects, we only have 39 draw calls (one for each unique material in the scene).

![Baseline results on a purely Batched Scene](img/instancing-mep-baseline.png)

Batching was a great quick fix to our draw call issue, but to truly optimize the scene, we need to reduce redundancy. The key figure we are looking for in this scene is the memory, which currently stands at ~500 MB.

![Baseline figures on a purely Batched Scene](img/instancing-mep-baseline-figures.png)

Here is what our plan of attack looks like. The first thing we need to do is indentify which objects in our scene contain the same geometry. We save these objects and their transformation matrices to an array which we shall use to create our `InstancedMesh`. For all other objects that don't have duplicated geometries, we load as normal using `BatchedMesh`.

Utlimately at the end, we should see a higher number of draw calls than earlier but with singificant savings in memory. Let's see what we get.

## InstancedMesh Properties

[InstancedMesh](https://threejs.org/docs/#InstancedMesh) requires the following attributes-
- `geometry`: The mesh geometry
- `material`: The mesh material
- `count`: The number of instances



## Code Implementation

The first problem we need to tackle is finding out which objects in our scene share the same geometry. We take a look at our 3D model in the browser console prior to conducting any batching. Using tha basic loader, we call this code to our [Pre established Three JS scene](../hosting-3d-model/analysis_threejs.md).

```js
const loader = new GLTFLoader().setPath('models/bim-model/');
loader.load('sixty5-mep.glb', (gltf) => {
    const mesh = gltf.scene;
    
    console.log(gltf.scene);
    
    mesh.position.set(0,0,0);
    scene.add(mesh);
})
```

Now we open the console in our browser to see what we get.

![Console Log of the gltf.scene](img/instancing-console-base.png)

Note the first two objects in the scene. They are both "IfcFlowFittingM_Bend_Circular_DYKA". This appears to be a fitting of some sort. In theory, these 2 objects should share the same geometry, however, we note that their `uuid` ia different. But, when we expand both objects in the scene-

![Expanding the Geometry of the 2 objects](img/instancing-geometry-uuid.png)

We can observe that both objects refer to the same geometry `uuid`. This is an avenue we can use to check for instancing- test to see if the geometry points to the same `uuid`. An important note here is that both these objects have different tranformation matrices, as proved by their different `position` attributes. This means, we will need to extract the exact transformation matrix for each instance when we make our traversal loop.

Let's try combining this into a code block and running it on our `mep` model.

```js
const loader_instance = new GLTFLoader().setPath('models/bim-model/');
loader_instance.load('sixty5-mep.glb', (gltf) => {
    let uuid_map = new Map();
    
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            const geom = child.geometry
            const geom_uuid = geom.uuid;
            const inst_matrix = child.matrixWorld;

            if ( !uuid_map.has( geom_uuid )){
                // If map does not have the uuid already, first create it
                
                uuid_map.set( geom_uuid, new Map() );

                uuid_map.get( geom_uuid ).set( "geometry", geom );
                uuid_map.get( geom_uuid ).set( "matrix", [] );

                uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );
            
            } else {
                // Map contains the uuid hence only need to push transformation matrix

                uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );
            
            };
        };
    });
    
    uuid_map.forEach((value, key) => {
        
        const geometry = value.get("geometry");
        const num_instances = value.get("matrix").length;
        const matrices = value.get("matrix");
        
        const material = new THREE.MeshToonMaterial({
            color:"#270a77",
        });

        const mesh = new THREE.InstancedMesh( geometry, material, num_instances );
        scene.add( mesh );

        for ( let i=0; i < matrices.length; i++){
            mesh.setMatrixAt( i, matrices[i] )
        };

        mesh.needsUpdate = true;
    });
})
```

Now that is a mouthful. Let's break it down.

To start, we first create our `loader` object to read in the gltf file, along with tha main dictionary that we will use to store the results called `uuid_map`.

```js
const loader_instance = new GLTFLoader().setPath('models/bim-model/');
loader_instance.load('sixty5-mep.glb', (gltf) => {
    let uuid_map = new Map();
    
    // ...
});
```

We have a main traversal loop that loops through all the objects in our scene, along with a basic if statement that executes only if the child is a mesh.

```js
gltf.scene.traverse((child) => {
        if (child.isMesh) {
            
            // ...
        };
})
```

Within the traversal loop, we create our map object. The key will correspond to the geometry `uuid` and the values will be an array of the transformation matrices of the individual objects. The logic tests to see if the uuid does not already exist and if so, create it. We save the value to be a new `Map()`.

This subsetted map creates two new key value pairs- the first `geometry`, saves the geometry object from the scene tree. The second, `matrix` is a list that will contain all the transformation matrices of the individual objects.

```js
const geom = child.geometry
const geom_uuid = geom.uuid;
const inst_matrix = child.matrixWorld;

if ( !uuid_map.has( geom_uuid )){
    // If map does not have the uuid already, first create it
    
    uuid_map.set( geom_uuid, new Map() );

    uuid_map.get( geom_uuid ).set( "geometry", geom );
    uuid_map.get( geom_uuid ).set( "matrix", [] );

    uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

} else {
    // Map contains the uuid hence only need to push transformation matrix

    uuid_map.get( geom_uuid ).get( "matrix").push( inst_matrix );

};
```

Now, we loop through our dictionary and create a new `InstacedMesh` for each unique object geometry. We then set the individual instance transformations by looping through the array `matrix` 

## Results




## Conclusion


## Links

[Instanced Mesh](https://threejs.org/docs/#InstancedMesh)

[draw call](draw-calls-in-scenes.md)

[batched our scene](batched-mesh.md)