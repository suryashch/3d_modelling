# Mean Pooling Function on a 3D Model

How can we compress the mesh density of a 3D model? We have established that using the `decimate` modifier in Blender provides a quick and easy way to reduce the vertex counts of the object. I would like to do this in a more predictable way. My plan is to conduct some mean pooling on the vertex coordinates.

## Getting the Coordinates for the Vertices From the Model

Blender provides the ability to export vertex information from the model. For this test I shall be working with the `human-foot-base-mesh` model.

Here is the script I ran in the blender interface to extract vertex coordinates from the model.

```py
import bpy
import csv
import os

# define the output path
filename = "vertexcoordinates.csv"
file_path = "reducing-mesh-density/data"
output_path = os.path.join(file_path, filename)

# get mesh data, applying any modifiers
mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()

# export to csv
with open(output_path, "w", newline='') as output_file:
    writer = csv.writer(output_file, delimiter=',')
    # write the header row
    writer.writerow(["Name", "Vertex_Index", "X", "Y", "Z"])

    # write vertex data
    for i, v in enumerate(mesh.vertices):
        # Get world coordinates
        world_coords = obj.matrix_world @ v.co
        writer.writerow([obj.name, i, world_coords.x, world_coords.y, world_coords.z])
```




