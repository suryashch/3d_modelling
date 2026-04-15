# Preprocessing GLTF Files for Efficient LOD Control in Scenes

We have proven that [LOD control](../hosting-3d-model/per-object-lod-control-with-threejs.md) improves GPU computational efficieny in densely populated scenes. We also saw that [Batching](batched-mesh.md) our scene improves CPU efficiency. However, combining the 2 requires a little bit of out-of-the box thinking. While LOD functionality does exist within our `BatchedMesh` object, implementing this accurately requires careful consideration of the underlying vertex and index array.

In this work, I explain the basics of array structuring in GLTF files, optimizations which can be made for memory, as well as walking through the structure and rationale behind any scripts that we include. The [accompanying notebook](notebooks/gltf-eda.ipynb) provides additional insight and in depth analysis of code.

## Background

3D objects consist of [`vertices` and `faces`](../hosting-3d-model/analysis_threejs.md). The `vertices` are stored in a data structure called the `vertex_array`. This is essentially a 2D matrix, where the rows consist of individual vertices, and the columns correspond to coordinates (specifically X,Y,Z). Here is an example of what this may look like.

![example of a vertex array](../reducing-mesh-density/img/vertex_array-original.png)

`Faces` in the model refer to how the different certices are connected with each other to form surfaces. This data is stored in another data structure called the `index_array`. Alternatively, this could be called the face_matrix.

![example of index array](../reducing-mesh-density/img/face_matrix-original.png)

Here, the numbers refer to the specific row in the vertex array. For example, row 1 of our face matrix has the numbers (715, 31, 33). These numbers refer to our vertex array, and show what vertices are used to make a surface. In this example, Face 1 in the 3D model is created by joining the vertices is rows 715, 31 and 33.

Normally, the ordering of the vertices and indices should not matter, and are often created on the fly. However, LOD control in a `BatchedMesh` object requires a shared vertex structure between the different LOD objects. This means, lower level LOD's need to use the exact same vertices as the original mesh, just reconstructed with different faces.

We explored how to manage this manual indexing in the section on [mesh-simplification algorithms](../reducing-mesh-density/mesh-simplification.md). However, the conversion to GLTF file requires another bit of manual intervention.

Traditional GLTF file exporers will treat every individual object in the scene as unique. This means any scene with LOD objects with effectively "double" the file size- since each LOD is being considered its own object. We need to tweak the GLTF file creation process such that objects which share the same vertex array are treated the same.



Now, we explore how to achieve this manual GLTF file indexing and generation.





## Links

[LOD control](../hosting-3d-model/per-object-lod-control-with-threejs.md)

[Batching](batched-mesh.md)

[`vertices` and `faces`](../hosting-3d-model/analysis_threejs.md)