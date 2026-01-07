# Optimizing Draw Calls in a three.js Scene

In our [LOD Control Model](per-object-lod-control-with-threejs.md), we were able to establish that dynamic switching between low and high quality meshes reduces GPU strain. Our results proved that this optimization did not affect `draw calls`, but did not elaborate more on it. In this paper I explain the basics of draw calls, their impact on the performance of the scene and, and explore optimization techniques to limit their net impact.

