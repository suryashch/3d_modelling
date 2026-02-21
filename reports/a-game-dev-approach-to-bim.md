# A Game Dev Approach to BIM

BIM (Building Information Modelling) is a technology solution being explored in the construction industry. Although it has been around for a while, 



## Introduction to the Model

In this project I am working with an open source BIM model provided by [buildingsmart-community](https://github.com/buildingsmart-community). The model is of a real residential building in the Netherlands called [Sixty5](https://www.strijp-s.nl/en/building/sixty5). The model contains XXX layers, and a total of XXX objects.

Here is a breakdown of the data.



## Triangles and Draw Calls

In prior work, [LOD Control Model](per-object-lod-control-with-threejs.md), we were able to establish that dynamic switching between low and high resolution meshes reduces GPU strain. Our results proved that this optimization did not affect `draw calls`, but did not elaborate more on it. What is a `draw call`?

As the name suggests, a `draw call` is a command sent from the CPU to the GPU to 'draw' an object to the screen. It includes the individual `vertices`, `faces` and materials that make up a mesh.

As the number of objects in the scene increase, as do the number of draw calls, and if you aren't careful, this number of `draw calls` can significantly limit the performance capabilities of the scene well before GPU bottlenecks start emerging. In BIM projects where we have lots of individual objects, this is especially an issue.

Take for example, the MEP (Mechanical, Electrical, Plumbing) layer of our BIM model.

If we load this model directly to our scene, we start to appreciate why `draw calls` need to be limited. We have ~22000 draw calls in our scene- one for each object. Here is what the raw model looks like in our [basic scene](analysis_threejs.md).

![Unedited version of Sixty5 MEP model](../hosting-3d-model/img/unedited-sixty5-mep-model.gif)

The performance is slow and buggy. I would not want to use this for more than a few minutes at a time. We notice extremely slow `FPS` (Frames Per Second) as well.

We load two different layers of our BIM model to the scene- the `Interiors / Kitchens` model and the `Architectural` model. Measuring the performance of each model, we observe some striking differences.

Here are the results we observe from the Interior Model.

![Performance Results Interior Kitchen Model](../research/optimizing-the-scene/img/performance-results-interiors-kitchens.png)

And here are the results we observe from the Architectural Model.

![Performance Results Architectural Model](../research/optimizing-the-scene/img/performance-results-architectural.png)

1) The number of `draw calls` in the interior model (3,096) is much less than the architectural model (16,374). This implies there are a lot more individual objects in the architectural model than the interior one.

2) The total number of [triangles](../reducing-mesh-density/analysis_decimate.md) in the scene are roughly the same (~1.6M). This implies that the `interior-kitchen` model is more finely modelled than the `architectural` model, since the `architectural` model has vastly more individual objects.

3) The FPS count for the interior model is ~100 FPS compared to ~13 from the architectural model- significantly lower.








## Batching the Scene




## LOD Control




## Spatial Querying




## Buffer Updates




## Packaging it Together



## Results



## Conclusion and Next Steps


