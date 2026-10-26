# Hierarchical LOD Modelling

We have seen that [LOD modelling](../../reports/improving-3d-model-performance-with-LOD.md) helps improve the performance of the scene by swapping between high and low resolution versions of the same mesh depending on the distance from the camera. We have also seen how [octree based data querying](notebooks/octree-querying.ipynb) is conducted in large scenes and how it can improve the performance of the overall scene. In this paper, we see if we can utilize the best of both these concepts to create a pre-batched and partitioned scene that can be used for automatic LOD retrieval as well as disposal.

## Introduction and Goals

We have observed a high degree of success from our [QSViewer project](../../reports/a-game-dev-approach-to-bim.md), wherein we used the spatial querying technique to optimize which objects were visible on the scnreen and when. In that project, we created a `querySphere` object around our camera and performed a bounding box intersection test with our octree. If the box intersected, go further into its children; if not, cull it entirely from the screen. This worked well to balance the total number of objets in the scene, as only the ones which were within the sphere would be highlighted.

Here, I'd like to build on that concept, but instead of using distance as our threshold check, we introduce a new concept called Screen Space Error. This, in theory, should work exactly the same as our previous purely distance based approach, but with the added benefit that the thresholds can be precomputed and saved in a data structure.

Lets start out with some fundamental understandings and assumptions.

We will be storing data within an octree. Each object will have a bounding box drawn around it, and based on how many octree children it intersects with, will be accordingly placed somewhere in the tree. The object will have a low and high resolution mesh, which will be visible at different zoom levels. Our goal will be to programmatically model this information such that it can be simply loaded to a scene and the engine does the rest.

The size of the bounding box determines the octree depth. This means objects with larger bounding boxes should be stored higher up the tree than ones with smaller bounding boxes.

There seem to be a lot of approaches to calculating the screen space error. Seems like it should be possible by measuring the distance between LOD vertices. We'll come back to this later.

For now, let's start with storing our objects in a hierarchical scene tree.

## Octree Storage

We have seen how Octrees can speed up spatial querying. Using off the shelf tools such as [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) helped us tremendously, but required upfront BVH calculations, and potentially used more memory than necessary. Let's see if we can recreate this using simple octrees.





## Links

[LOD modelling](../../reports/improving-3d-model-performance-with-LOD.md)

[octree based data querying](notebooks/octree-querying.ipynb)

[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)