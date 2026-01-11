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