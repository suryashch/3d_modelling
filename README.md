# 3d_modelling
A repo where I explore how 3D modelling works.

## Getting started

[Link](https://suryashch.github.io/3d_modelling/) to latest hosted version of 3D model.

### Recommended Reading Order

1) [Reducing Mesh Density of 3D Objects in Blender](https://github.com/suryashch/3d_modelling/blob/main/reducing-mesh-density/analysis_decimate.md)
This document explores how to make 3D models simpler by reducing the number of triangles they contain. By testing different levels of reduction, it measures when a model becomes too low-quality to be useful. The results show that you can significantly lower the file size and complexity without losing much detail, as long as the most important shapes are preserved. This helps developers find the right balance between a fast-running model and one that still looks accurate.

2) [Hosting 3D models on a Website](https://github.com/suryashch/3d_modelling/blob/main/hosting-3d-model/analysis_threejs.md)
This document evaluates Three.js as a tool for hosting and rendering 3D models in web browsers, focusing on its ability to handle complex assets efficiently. It analyzes key performance factors such as file format compatibility (favoring GLTF/GLB), memory management, and the impact of lighting and shaders on frame rates. The study concludes that Three.js is a robust solution for web-based 3D visualization, provided that developers implement optimization techniques—like texture compression and level-of-detail (LOD) management—to ensure smooth performance across different devices.

3) [Mean Pooling Function on a 3D Model](https://github.com/suryashch/3d_modelling/blob/main/reducing-mesh-density/analysis_mean-pooling-on-mesh.md)
This document explains a method for simplifying 3D models by using "mean pooling" to reduce the number of points in a mesh. It describes how the computer takes groups of nearby points and averages their positions into a single point, which makes the model use less data. The analysis shows that while this method is very fast and easy to do, it can sometimes blur sharp edges or make the model look a bit smoother than intended.

4) [Basic LOD Control with ThreeJS](https://github.com/suryashch/3d_modelling/blob/main/hosting-3d-model/basic-lod-control-with-threejs.md)
This document provides a practical guide on implementing Level of Detail (LOD) in Three.js to optimize web-based 3D rendering. It explains how to use the THREE.LOD class to automatically switch between high-resolution and low-resolution versions of a model based on its distance from the camera. By reducing the number of active polygons for distant objects, this technique preserves visual quality while significantly improving performance and frame rates in complex scenes.

5) [Superposing Models of Different LOD in a Web Based Environment](https://github.com/suryashch/3d_modelling/blob/main/hosting-3d-model/analysis_superposing-models.md)
This document explains how to put multiple 3D models on top of each other in a web browser using Three.js. It focuses on how to make sure the different models align correctly and stay in the right place even when you move the camera. The guide also covers how to keep the website running fast when using many models at once by managing the computer's memory and processing power efficiently.

6) [Understanding LOD Compression with Blender API (bpy)](https://github.com/suryashch/3d_modelling/blob/main/hosting-3d-model/bpy_with_lod.md)
This document demonstrates how to use the Blender Python API (bpy) to automate the creation of multiple Level of Detail (LOD) versions of a 3D model. By scripting the decimation process, it allows for the consistent generation of high, medium, and low-resolution meshes that can be exported for use in web or game engines. This automated approach ensures that all LOD levels are correctly named and organized, significantly reducing the manual effort required to prepare assets for optimized real-time rendering.

7) [Per Object LOD Control with ThreeJS](https://github.com/suryashch/3d_modelling/blob/main/hosting-3d-model/per-object-lod-control-with-threejs.md)
This document explains how to set up "Level of Detail" (LOD) for individual objects in a 3D scene using Three.js. It shows how to make the computer switch to a simpler, faster version of an object when it is far away and a detailed version when it is close. This method helps the scene run smoothly by focusing the computer's power only on the things the viewer can see clearly.


* Summaries provided by Gemini Flash
