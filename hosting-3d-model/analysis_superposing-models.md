# Superposing Models of Different LOD in a Web Based Environment

I would like to explore the idea of superposing two models on top of one another in the same scene, and dynamically switching between the two when the user is a certain zoom level away from it. I have already been able to establish that reducing the mesh density of models makes them easier to navigate around (see `../reducing-mesh-density/analysis_decimate.md`). Now I would like to put that to the test by default loading the low density mesh, and switching to the high density one when the user zooms in.

The idea for this code has been partially derived from the work done in this sandbox: https://codesandbox.io/p/sandbox/12nmp?file=%2Fsrc%2FApp.js.

The code in this project was partially assisted by Google Gemini (credits provided where applicable).

## The baseline

The baseline file we shall build off has been described in full effect in my other work (see `./analysis_threejs.md`). The code below will build off an image of a webpage that has a 3D model shown as a scene, with basic user controls (panning, zooming and orbiting).

![Basic 3D model with user panning and zoom options](img/basic-3d-model-view.png)

## Adding the Compressed Model

The model we wish to add to the scene is saved in the `models/piperacks` repo under the name `piperacks_lod-04.glb`. This file is the exact same as our LOD 100 version, except it has been compressed using the decimate technique down to a ratio of 0.04.

We load this model to the scene by tweaking our original `main.js` file. Instead of loading our one object to the scene, we create a container that can dyamically switch which model is active at any current moment based on the camera's distance. Here is the code for creating the container.

```js
const lod = new THREE.LOD();
lod.position.set(0,0,0);
scene.add(lod);

// assist provided by Gemini
```

Here the LOD object acts as our container. Right now it is empty.

Our original code used the `loader` object to load our GLTF file to the scene. We will replace this with two loader objects that load our model to the container.

```js
loader.load('piperacks_lod-100.glb', (gltf) => {
    const highResMesh = gltf.scene;
    lod.addLevel(highResMesh, 0);
})

loader.load('piperacks_lod-04.glb', (gltf) => {
    const lowResMesh = gltf.scene;
    lod.addLevel(lowResMesh, 30);
})

// assist provided by Gemini
```

In our two loader objects, we load both the `highres` and `lowres` versions of our mesh. The `lod.addLevel` function is what toggles the switch and the parameter we pass in after the model name is the zoom distance from the model. The code above delineates the zoom range for which the lowres version of the model is active and the range for the highres.

The rest of the code stays the same.

## Results

Saving this file and navigating to https://suryashch.github.io/3d_modelling/, we are greeted with our lowres version of the piperack (as can be seen by the sqaure shaped pipes).

![LOD 04 model in scene](img/lod-04-model-in-scene.png)

Now, when we zoom into the model, we can see it seamlessly switch to the highres version past a certain point.

![lOD 100 model in scene](img/lod-100-model-in-scene.png)

Its a little hard to see the switch happen in real time, and you'd probably miss it unless you were looking for it, which we are in this case.

Let's extrapolate this out. I have a third model `piperacks_lod-10.glb` which I would like to fit in between the lod 04 and 100. I load this model in the same way as I did the others.

```js
loader.load('piperacks_lod-10.glb', (gltf) => {
    const medResMesh = gltf.scene;
    lod.addLevel(medResMesh, 30);
})
```

I also changed the zoom range level for the lod-04 model from 30 to 50. This way, we get the effect of the model becoming more detailed as we continue zooming in. 

```js
loader.load('piperacks_lod-04.glb', (gltf) => {
    const lowResMesh = gltf.scene;
    lod.addLevel(lowResMesh, 50);
})
```

Now, we can see three distinct zoom levels over which our model becomes more refined.

![LOD 10 model in scene](img/lod-10-model-in-scene.png)


## Conclusion

Superposing different versions of a model into the same scene and switching between them has the potential to speed up performance of large scale 3D models in the browser. We have seen that lower mesh densities ease the strain on the GPU, and so by switching to low resolution meshes when our user is far away from the source can significantly reduce the load that the GPU faces. In further research, I will break up each individual item in the model and dynamically load each one based on the user's distance from it. This way, we get the same benefits of visual compression but on a per-object basis. This might increase the initial load times, as well as the memory, but I would like to see how well it can improve the navigation capabilites.


#### Credits

1) Google Gemini 2.5 Flash
2) drcmda: https://codesandbox.io/p/sandbox/12nmp?file=%2Fsrc%2FApp.js.