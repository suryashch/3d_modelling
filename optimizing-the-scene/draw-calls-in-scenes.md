# Optimizing Draw Calls in a three.js Scene

In our [LOD Control Model](per-object-lod-control-with-threejs.md), we were able to establish that dynamic switching between low and high quality meshes reduces GPU strain. Our results proved that this optimization did not affect `draw calls`, but did not elaborate more on it. In this paper I explore the basics of draw calls, their impact on the performance of the scene, and explore optimization techniques to limit their net impact.

## What are Draw Calls?

A `draw call`, as the name suggests, is a call from the CPU to the GPU to `draw` an object to the screen. The more objects you have in your scene, the more draw calls you have. If you aren't careful, this number of `draw calls` can significantly limit the performance capabilities of the scene well before GPU bottlenecks start emerging. In BIM projects where we have lots of individual objects, this is especially an issue.

In this project I am working with an open source BIM model provided by [buildingsmart-community](https://github.com/buildingsmart-community). The model is of a real residential development in the Netherlands called [Sixty5](https://www.strijp-s.nl/en/building/sixty5). For ease of memory and github hosting limits, we limit our model to just the MEP (Mechanical, Electrical, Plumbing) layer for the time being.

If we load this model directly to our scene, we start to appreciate why `draw calls` need to be limited. We have ~22000 draw calls in our scene- one for each object. Here is what the raw model looks like in our [basic scene](analysis_threejs.md).

![Unedited version of Sixty5 MEP model](../hosting-3d-model/img/unedited-sixty5-mep-model.gif)

The performance is slow and buggy. I would not want to use this for more than a few minutes at a time. We notice extremely slow `FPS` (Frames Per Second) as well.

Using our original `piperacks` model as an example, we see the results from a 50ft view. Here we have 303 `draw calls` for each of the objects in our scene.

![Original Piperack Scene](../hosting-3d-model/img/performance-results-50ft-view.png)

To test out how `draw calls` work, I merge all the objects in my scene into one mesh. This means I should only have one large `draw call` that I need to make to render my scene. Sure enough, onl loading to the scene, we get these results.

![Merged Model performance](../hosting-3d-model/img/performance-results-merged-model.png)

2 `draw calls`- one for rendering the mesh, one for rendering the 2D grid.

We observe that the number of draw calls and triangles do not change as we move around the scene. This is becuase of a method called `Frustum Culling`.


### References

[buildingsmart-community](https://github.com/buildingsmart-community)

[Sixty5](https://www.strijp-s.nl/en/building/sixty5)

