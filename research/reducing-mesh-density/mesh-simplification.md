# Mesh Simplification Techniques

In this research we explore the basics of Mesh Simplification. In prior work we have explored the usage of the [edge collapse](analysis_decimate.md) algorithm in `Blender`. While powerful, the algorithm has certain drawbacks, namely that the orginal vertex structure is decimeted in the process and our compressed mesh is essentially treated as a completely new object, and not a subset representation of the original, as intended. As seen in the [batched-mesh-with-LOD](../optimizing-the-scene/batchedmesh-with-LOD.md) example, we require this object to be a subset of the original and so shall explore various techniques to achieve the same.

## Introduction to MeshLab

For the purpose of this work, we shall be working with an open source program known as [MeshLab](https://www.meshlab.net/). This software provides in depth tools for working with meshes and includes a Python based API, [PyMeshLab](https://pymeshlab.readthedocs.io/en/latest/).


## Problem Statement

Here, we load a simple model of a valve handle derived from the original [piperacks.glb](../hosting-3d-model/analysis_threejs.md) model file. Opening this with MeshLab shows the following statistics and image.

![Initial Load of Piperacks Valve Model File](img/piperacks-valve-vertex-count.png)

From the statistics, we see that the mesh has 3,606 vertices and 7,088 faces. The main handle of the valve hsas some extremely intricate geometry, which will be likely where we see the most decimation and edge compression. An important consideration here is that this model file is a closed-form manifold mesh. This means there are no gaps or open edges. This is likely a best case scenario, since our piping files will likely have open ends or "holes", where they connect to other pipes. We shall also address this form of geometry later.

For the time being, let's apply a simple decimation filter on our mesh. Here, we are using the simple Edge-Collapse with decimate filter, with a ratio of 0.4. These are the results -->

![Pre and Post Decimate Valve Results](img/piperacks-valve-pre-post-decimation-vertex-count.png)

We observe familiar results, and note that our number of vertices in the mesh are down to 1,479 (approximately 40% of the original), as well as the faces down to 2,834 (approximately 40% of the original). However, we notice that the algorithm has created new meshes in this process of simplification.

Here, we track the face right in the center of our mesh before and after compression.

![Pre and Post Decimate Face and Edge results](img/piperacks-valve-vertex-comparison.png)

Before compression, our mesh in the center was composed of vertices indexed at (895, 926, 910). After compression, this face is now deformed and composed of the vertices (633, 643, 638). Our algorithm has essentially created a new mesh with different vertex indices.

This is in essence, the problem statement, and we shall explore various methods of compression which preserve the original vertex indices.

## Mesh Decimation Algorithms

We saw in the example above that the default Edge Collapse algorithm fails to achieve our intended purpose since it created new vertices. That said, there is an option in the original algorithm choices that may help improve our results- "Optimal Position of Simplified Vertices".

[Option to Keep the Optimal Position of Simplified Vertices](img/edge-collapse-optimal-position.png)

By default, this option is checked since this controls the final error between the original mesh and compressed mesh. However, when unchecked we see that the algorithm will collapse the edges into the original vertices, thereby effectively acting as a sampler for the mesh.

Here are the results of this algorithm with the option unchecked.

![Edge Collapse algorithm with Optimal Position of Vertices Option Unchecked](img/edge-collapse-optimal-position-results.png)

If we overlay this mesh on top of the original, we see that it is indeed a subset of the original. In the figure below, the large RED points are from our decimated mesh.

![Optimal Edge Collapse Algorithm Overlayed with Original Mesh](img/edge-collapse-optimal-position-results-overlay.png)

While this is promising, we note that our algorithm still has not maintained the indices of our original mesh.

![Optimal Edge Collapse Algorithm still does not maintain the vertex indices](img/edge-collapse-optimal-position-indices-not-maintained.png)




## Sampling and Reconstruction

A theory I would like to test out is that of sampling and reconstruction from the mesh. We treat our mesh as a point cloud, where each vertex corresponds to a point. We run a sampling algorithm (here, we use Poisson Disk Sampling) to choose a predefined number of vertices from our original mesh as a sub-sample. Then, we reconstruct our triangles from the subsample, to ideally, create a low-resolution representation of our mesh.

Here is our original mesh.

![Initial Load of Piperacks Valve Model File](img/piperacks-valve-vertex-count.png)

We resample our vertices from this mesh using the Poisson Disk Resample filter that is available to us in MeshLab -->

![Poisson Disk Sampling Filter Options](img/poisson-disk-sampling.png)

We maintain the default options here, except for checking the box "Base Mesh Subsampling", which implies that our base set of points to sample from will be our original mesh's vertices. We would like our compressed mesh representation to include data from the original, so this makes sense for why we would need it. Here are the results of this sampling.

The points chosen by our sampling algorithm:

![Poisson Sampling Results](img/poisson-sampling-prelim-results.png)

Overlayed with the original mesh, we see that the sampling algorithm has indeed chosen the vertices from our original mesh.

![Poisson Sampling Results Overlayed with Original Mesh](img/poisson-sampling-prelim-results-overlay.png)

In the figure above, we see recolor our sampled points from the Poisson Sampling Algorithm in red. Overlayed with the original mesh, we are able to quickly observe that the red points completely overlay on top of the original vertices (identified by the stars).

This is good news and promising.

Now, we reconstruct our triangles using this information. 

There are multiple options for reconstruction. We shall attempt these 2 --> Ball-Pivot Method and Screened Poisson.

We observe the following mesh reconstruction using the default parameters of this method.

![Results from Prelimiary Reconstruction](img/reconstruction-results-preliminary.png)

Ball-Pivot appears to have captured better information about the handle of the valve while Screened-Poisson has worked well to maintain closed-form surfaces. We observe that the Ball-Pivot method has created non-manifold geometry in this process- specifically, in the spokes of the handle we see no depth, some vertices are only connected by a line. This is not ideal, but perhaps might be fixed with better sampling.

We observe that neither model was able to consolidate our points into one mesh.

Let's try increasing our sample size. We do so by increasing the parameter `Number of Samples` from 1000 to 2000. Here are the results.

![Results from Reconstruction with n_sammples=2000](img/reconstruction-results-nsamples2000.png)

As expected, both methods now have a more accurate reconstruction of the original mesh. The Ball-Pivot method was able to identify our geometry in the handle with increased precision, and the Screened Poisson method was able to identify a closed loop surface for the handle of our valve.

We notice however, that the Ball Pivot method has completely missed the back half of our mesh, instead only reconstructing the front where all the dense vertices are. Observing the original mesh, we see a long distance between the bulk of the valve and the back. This could likely be improved by increasing our clustering distance.

As well, even though we have a high concentration of points in the handle of our valve, the Screened Poisson method was unable to create the surface topology of the handle. We could likely control this, again, with the clustering distance.



## Links

[MeshLab](https://www.meshlab.net/)

[PyMeshLab](https://pymeshlab.readthedocs.io/en/latest/)