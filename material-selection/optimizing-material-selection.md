# Optimizing Material Selection for Web Rendering

In large 3D models an often overlooked aspect of memory and computational usage is the material of the 3D object. GPU `shaders` are basic functions that rely on this information and determine how light is reflected / scattered / absorbed by the surface of the object. If not optimized, this can lead to bottlenecks in GPU usage. This paper provides a quick analysis of the basics of material selection in 3D models.

## UVs and Normals

While conducting [EDA on our .obj file](../reducing-mesh-density/notebooks/obj-eda.ipynb), we noticed a section of data labelled `vt`, or `vertex textures`. The format of this data appears to be coordinates. Digging in a little deeper, the two numbers are indeed coordinates that refer to a 2D space.

## Exploring Different Materials in three.js



## Selecting the Optimal Material



## Implementing to the Scene



## Conclusion