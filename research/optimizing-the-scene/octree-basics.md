# Octree Basics

We have been able to establish that [dynamically swapping a mesh's resolution](../hosting-3d-model/per-object-lod-control-with-threejs.md) in a scene can improve the overall performance. As a refresher on it's workings, we loaded low and high resolution versions of the same mesh to one `LOD` container, and swapped which mesh was active at any time depending on how far away it was from the camera. This way, low res meshes could be rendered to the screen when the user was far away, and high res versions of the mesh could be rendered when our user zoomed in.

As we navigated around the page, the webpage was performing distance calculations between the camera and every LOD container in the scene thousands of times per second. Since our model only contained 303 objects, we were able to get away with this computation intensive step without too much lag. However, when the number of objects in the scene explode (as is the case with BIM models), our computational debt increases and the webpage starts experiencing lag.

Why are we measuring the distance to every single object in our scene? It would be more efficient to group objects together in space. Now, if our camera is far enough away from this group of objects, we can immediately confirm that all the objects in the group should be rendered in low-res. When we get close to a group, we can apply our same distance based LOD swapping, but now on a much smaller scale. This is the basic mechanism behind the workings of an `Octree`.

## What is an Octree?

An Octree is a basic tree data structure that contains 8 children for every node. It provides a method for scaling up [traversal loops](../hosting-3d-model/bpy_with_lod.md) from O(n) to O(log n) runtime. Fundamentally speaking, as the number of objects in your scene increases n times, the performance only drops by a factor of log(n) For large scenes, the octree is an almost fundamental aspect of behind good performance.


An `Octree` is created by recursively dividing 3D space into smaller and smaller cubes. The graphic below shows the how an octree is constructed.



It is important to note here, that the cube in the picture is not a 3D model in itself- it refers to the space in your scene. Your 3D model would exist wholly within the root node (largest cube) of the octree. Objects in your scene will occupy space within this octree and may be structured within our tree as follows.




## Links

[traversal loops](../hosting-3d-model/bpy_with_lod.md)

[LOD control](../hosting-3d-model/per-object-lod-control-with-threejs.md)