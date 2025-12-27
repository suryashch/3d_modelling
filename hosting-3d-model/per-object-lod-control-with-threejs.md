# Per Object LOD Control with ThreeJS

Threejs provides useful tools for viewing 3D models in a web environment. One of those tools is `three.LOD`, which allows you to define multiple versions of your mesh, and switch between them depending on the camera's distance from the object. This way, objects that are far away from the user can load in low-resolution, easing the strain on the GPU. When the user zooms into an object, the LOD controller dynamically swaps the low-res mesh to high resolution again. This type of switch is called LOD (Level of Detail) switching.

Let's see if we can implement this using our `piperacks` model.

## Setting the Scene

The model we are working with is a [GLTF](analysis_threejs.md) export from `Blender`. Using the [Decimate](../reducing-mesh-density/analysis_decimate.md) technique, we were able to supoerpose two versions of the model on top of one another, one `lowres` and one `highres`. This is illustrarted in the figure below. The object has been moved to the side to show the superposition.

![Low and High Res Mesh Superposed](img/hi-res-low-res-copy.png)

The structure of the data here is key, as this is what will give us the ability to traverse the model's different objects. I have specifically defined the naming convention for this object, wherein for both the low and high resolution of mesh, the object name is the same, the only appendage is the string `hires` and `lowres`.


## Traversing the Scene

The first step is to get comfortable with traversing our scene tree in js. Since we're working with `.glb` files, the data we need will be saved in the `scene` object. We can view what the glb file looks like by outputing its contents to the console. Here I show the basic code needed, to view the contents of our glb file.

```js
const loader = new GLTFLoader();

loader.load('../models/piperack/piperacks_lod_working_1.glb', (gltf) => {
    console.log(gltf.scene)
})
```

We define our `loader` object with is an instance of the `GLTFLoader()` class. We then load our model by providing the full path to the `loader.load` function. We have the opportunity to pass a callback function, to which we pass our row context as `gltf`. Calling `console.log()` will print stuff to the browser's console window. This can be accessed by right clicking on the webpage and selecting `inspect`.

Calling this `gltf.scene` object will print the contents of the binary file to the sceen. I show here a screenshot of what this might look like.

![Contents of a GLB file](img/glb-file-contents.png)

Basic scene traversal is done using the `.traverse` method.

```js
loader.load('models/piperack/piperacks_lod_working_1.glb', (gltf) => {
    const gltfScene = gltf.scene;

    gltfScene.traverse((child) => {
        if (child.isMesh) {
            const mesh = gltf.scene;
            scene.add(mesh)
        }
    })
})
```

The `.traverse` method accepts a callback function, to which we pass our row context as `child`. In this simple example, we first loop through the scene and for each object, check to see if the attribute `isMesh` is `true`. This is a good practice step that ensures we're only working with mesh objects and nothing extra like animations, cameras, or other noise.

We then define our `mesh` object as the specific mesh which our model is currently on, and add that mesh to the scene.

We run into some problems here. When I try this method, the function breaks and does not load our selection properly to the screen.

```js
gltfScene.traverse((child) => {
    if (child.name.startsWith("Pipe_")) {
        const mesh = child;
        scene.add(mesh)
    }
})
```

Looking into the `threejs` [docs](https://threejs.org/docs/#Object3D.traverse) for the `.traverse` method we see it explicitly says not to modify the scene graph within the callback function. In our current development, we are calling `scene.add(mesh)` which edits the scene graph and breaks the iterative integrity of the traversal loop.

/* why did the code block above work then? */ 

Another option, and temporary fix would be to load our entire model to scene and use `.traverse` to manage which objects are visible at any time (instead of adding the entire object to scene). We try that here.

```js
gltfScene.traverse((child) => {
    if (child.isMesh && !child.name.startsWith("Pipe_")) {
        const mesh = child;
        mesh.visible = false
    }
})

```

Here are our results.

![Traverse function results for only pipes](img/traverse-pipes-basic.png)

As expected, we get only the results that start with the string 'Pipe_'.

In this code block, the key thing to keep in mind is that we first need to check if the child is a mesh using `child.isMesh`. This addition specifies to the `.traverse` function that we are currently working with a leaf node. 

If the condition was not included, the function would check to see if the first object in the entire scene tree had the string 'Pipe_' in it. Since most likely not, it would have set that object's `.visible` property to `false`. Our meshes are set up as children of these objects, and are structured to inherit properties from their parents. Setting the parent's property to `.visible = false` would have set the same for all children. `child.isMesh` ensures that we only work with leaf nodes.




