# Mean Pooling Function on a 3D Model

How can we compress the mesh density of a 3D model? We have established that using the `decimate` modifier in Blender provides a quick and easy way to reduce the vertex counts of the object. I would like to do this in a more predictable way. My plan is to conduct some mean pooling on the vertex coordinates.

## Getting the coordinates of the Model


