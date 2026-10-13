import sys
import pygltflib
import numpy as np
import pymeshlab
from pathlib import Path

GLTF_COMPONENT_TYPES = {
    5120: np.int8,
    5121: np.uint8,
    5122: np.int16,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32
}

def decimate_gltf(gltf_path, perc_red=0.0):

    gltf = pygltflib.GLTF2().load(gltf_path)

    # Initialize empty GLTF container to store the newly created mesh objects.
    gltf_export = pygltflib.GLTF2()
    gltf_export.scenes.append(pygltflib.Scene(nodes=[]))
    gltf_export.scene = 0

    # Initialize Counters and Binary Blob
    node_counter = 0
    mesh_counter = 0
    accessor_counter = 0
    bufferView_counter = 0
    currByteOffset = 0

    main_binary_blob = bytearray()
    binary_blob = gltf.binary_blob()

    visited = {}

    for node in gltf.nodes:

        mesh = node.mesh
        print(f"working on {mesh}")

        if mesh in visited:
            # If mesh exists, use the existing mesh ID. Do not need to create new bufferviews etc.
            ## Decimated comes SECOND
            print("exists")
            gltf_export.nodes.extend([
                pygltflib.Node(
                    mesh = visited[mesh],
                    rotation = node.rotation,
                    translation = node.translation,
                    matrix = node.matrix,
                    scale = node.scale,
                    name = node.name,
                    children = [ node_counter + 1 ]
                ),
                pygltflib.Node(
                    mesh = visited[mesh] + 1,
                    name = node.name
                )
            ])
            gltf_export.scenes[0].nodes.extend([node_counter])
            node_counter += 2

            continue

        # If mesh does not exist yet, first add to dictionary
        print("does not exist need to add")
        visited[mesh] = mesh_counter

        # Get the original index, position and normal matrices
        triangles_accessor = gltf.accessors[gltf.meshes[mesh].primitives[0].indices]
        triangles_buffer_view = gltf.bufferViews[triangles_accessor.bufferView]
        f_matrix = np.frombuffer(
            binary_blob[
                triangles_buffer_view.byteOffset
                + triangles_accessor.byteOffset : triangles_buffer_view.byteOffset
                + triangles_buffer_view.byteLength
            ],
            dtype=GLTF_COMPONENT_TYPES[triangles_accessor.componentType],
            count=triangles_accessor.count,
        ).reshape((-1, 3))

        points_accessor = gltf.accessors[gltf.meshes[mesh].primitives[0].attributes.POSITION]
        points_buffer_view = gltf.bufferViews[points_accessor.bufferView]
        v_matrix = np.frombuffer(
            binary_blob[
                points_buffer_view.byteOffset
                + points_accessor.byteOffset : points_buffer_view.byteOffset
                + points_buffer_view.byteLength
            ],
            dtype=GLTF_COMPONENT_TYPES[points_accessor.componentType],
            count=points_accessor.count * 3,
        ).reshape((-1, 3))

        normals_accessor = gltf.accessors[gltf.meshes[mesh].primitives[0].attributes.NORMAL]
        normals_buffer_view = gltf.bufferViews[normals_accessor.bufferView]
        n_matrix = np.frombuffer(
            binary_blob[
                normals_buffer_view.byteOffset
                + normals_accessor.byteOffset : normals_buffer_view.byteOffset
                + normals_buffer_view.byteLength
            ],
            dtype=GLTF_COMPONENT_TYPES[normals_accessor.componentType],
            count=normals_accessor.count * 3,
        ).reshape((-1, 3))
        
        print("matrices acquired")

        # -------- Implement the Precision -----------------
        v_org, unq_indices, unq_inverse = np.unique(v_matrix, axis=0, return_index=True, return_inverse=True)
        f_org = unq_inverse[f_matrix]
        n_org = n_matrix[unq_indices]

        # --------------------------------------------------

        # Apply the decimation and remapping
        v_dm, f_dm, n_dm, v_org_rmp, f_org_rmp, n_org_rmp = decimate_mesh_2(v_org, f_org, n_org, perc_red)
        print("decimation done")

        f_org_rmp = f_org_rmp.astype(np.uint16)
        f_dm = f_dm.astype(np.uint16)

        v_org_rmp = v_org_rmp.astype(np.float32)
        v_dm = v_dm.astype(np.float32)

        n_org_rmp = n_org_rmp.astype(np.float32)
        n_dm = n_dm.astype(np.float32)

        # Convert to Bytes
        triangles_rmp_binary_blob = f_org_rmp.flatten().tobytes()
        points_rmp_binary_blob = v_org_rmp.tobytes()
        normals_rmp_binary_blob = n_org_rmp.tobytes()
        triangles_dm_binary_blob = f_dm.flatten().tobytes()
        points_dm_binary_blob = v_dm.tobytes()
        normals_dm_binary_blob = n_dm.tobytes()
        print("converted to bytes")

        # Append to Buffer
        main_binary_blob.extend(triangles_rmp_binary_blob + points_rmp_binary_blob + normals_rmp_binary_blob + triangles_dm_binary_blob)
        print("appended buffer")

        # Create New BufferViews
        gltf_export.bufferViews.extend([
                    
            ## Indices - Remapped
            pygltflib.BufferView(
                buffer = 0,
                byteOffset = currByteOffset,
                byteLength = len(triangles_rmp_binary_blob),
                target=pygltflib.ELEMENT_ARRAY_BUFFER
            ),

            ## Vertices - Remapped
            pygltflib.BufferView(
                buffer = 0,
                byteOffset = currByteOffset + len(triangles_rmp_binary_blob),
                byteLength = len(points_rmp_binary_blob),
                target=pygltflib.ARRAY_BUFFER
            ),

            ## Normals - Remapped
            pygltflib.BufferView(
                buffer = 0,
                byteOffset = currByteOffset + len(triangles_rmp_binary_blob) + len(points_rmp_binary_blob),
                byteLength = len(normals_rmp_binary_blob),
                target=pygltflib.ARRAY_BUFFER
            ),

            ## Indices - Decimated
            pygltflib.BufferView(
                buffer = 0,
                byteOffset = currByteOffset + len(triangles_rmp_binary_blob) + len(points_rmp_binary_blob) + len(normals_rmp_binary_blob),
                byteLength = len(triangles_dm_binary_blob),
                target=pygltflib.ELEMENT_ARRAY_BUFFER
            ),

            ## Vertices - Decimated
            pygltflib.BufferView(
                buffer = 0,
                byteOffset= currByteOffset + len(triangles_rmp_binary_blob),
                byteLength = len(points_dm_binary_blob),
                target=pygltflib.ARRAY_BUFFER
            ),

            ## Normals - Decimated
            pygltflib.BufferView(
                buffer = 0,
                byteOffset = currByteOffset + len(triangles_rmp_binary_blob) + len(points_rmp_binary_blob),
                byteLength = len(normals_dm_binary_blob),
                target=pygltflib.ARRAY_BUFFER
            ),
        ])
        print("created new bufferviews")

        # Create new Accessors
        gltf_export.accessors.extend([
                    
            ## Indices - Original Remapped
            pygltflib.Accessor(
                bufferView = bufferView_counter,
                componentType = pygltflib.UNSIGNED_SHORT,
                count = f_org_rmp.size,
                type = pygltflib.SCALAR,
                max = [int(f_org_rmp.max())],
                min = [int(f_org_rmp.min())],
            ),

            ## Vertices - Original Remapped
            pygltflib.Accessor(
                bufferView = bufferView_counter + 1,
                componentType = pygltflib.FLOAT,
                count = len(v_org_rmp),
                type = pygltflib.VEC3,
                max = v_org_rmp.max(axis=0).tolist(),
                min = v_org_rmp.min(axis=0).tolist(),
            ),

            ## Normals - Original Remapped
            pygltflib.Accessor(
                bufferView = bufferView_counter + 2,
                byteOffset = 0,
                componentType = pygltflib.FLOAT,
                count = len(n_org_rmp),
                type = pygltflib.VEC3,
                max = n_org_rmp.max(axis=0).tolist(),
                min = n_org_rmp.min(axis=0).tolist(),
            ),

            ## Indices - Decimated
            pygltflib.Accessor(
                bufferView = bufferView_counter + 3,
                componentType = pygltflib.UNSIGNED_SHORT,
                count = f_dm.size,
                type = pygltflib.SCALAR,
                max = [int(f_dm.max())],
                min = [int(f_dm.min())],
            ),

            ## Vertices - Decimated
            pygltflib.Accessor(
                bufferView = bufferView_counter + 4,
                componentType = pygltflib.FLOAT,
                count = len(v_dm),
                type = pygltflib.VEC3,
                max = v_dm.max(axis=0).tolist(),
                min = v_dm.min(axis=0).tolist(),
            ),

            ## Normals - Decimated
            pygltflib.Accessor(
                bufferView = bufferView_counter + 5,
                byteOffset = 0,
                componentType = pygltflib.FLOAT,
                count = len(n_dm),
                type = pygltflib.VEC3,
                max = n_dm.max(axis=0).tolist(),
                min = n_dm.min(axis=0).tolist(),
            )
        ])
        print("created new accessors")

        # Create new Meshes
        gltf_export.meshes.extend([
            pygltflib.Mesh(
                primitives=[
                    pygltflib.Primitive(
                        attributes=pygltflib.Attributes(
                            POSITION = accessor_counter + 1, 
                            NORMAL = accessor_counter + 2,
                        ),
                        indices = accessor_counter + 0
                    )
                ]
            ),
            pygltflib.Mesh(
                primitives=[
                    pygltflib.Primitive(
                        attributes=pygltflib.Attributes(
                            POSITION = accessor_counter + 4, 
                            NORMAL = accessor_counter + 5,
                        ),
                        indices = accessor_counter + 3
                    )
                ]
            )
        ])
        print("created new meshes")

        # Create new Nodes
        gltf_export.nodes.extend([
            pygltflib.Node(
                mesh = mesh_counter,
                rotation = node.rotation,
                translation = node.translation,
                scale = node.scale,
                matrix = node.matrix,
                name = node.name,
                children = [ node_counter + 1]
            ),
            pygltflib.Node(
                mesh = mesh_counter + 1,
                name = node.name
            )
        ])
        print("created new nodes")

        # Link nodes to scene
        gltf_export.scenes[0].nodes.extend([node_counter])

        # Increment all our counters
        node_counter += 2
        mesh_counter += 2
        accessor_counter += 6
        bufferView_counter += 6
        currByteOffset += len(triangles_rmp_binary_blob) + len(points_rmp_binary_blob) + len(normals_rmp_binary_blob) + len(triangles_dm_binary_blob)
        
        print("increment successful")
        print("run successful")

def get_triangles_array(in_gltf, mesh):  
    binary_blob = in_gltf.binary_blob()
    
    triangles_accessor = in_gltf.accessors[in_gltf.meshes[mesh].primitives[0].indices]
    triangles_buffer_view = in_gltf.bufferViews[triangles_accessor.bufferView]
    triangles_array = np.frombuffer(
        binary_blob[
            triangles_buffer_view.byteOffset
            + triangles_accessor.byteOffset : triangles_buffer_view.byteOffset
            + triangles_buffer_view.byteLength
        ],
        dtype=GLTF_COMPONENT_TYPES[triangles_accessor.componentType],
        count=triangles_accessor.count,
    ).reshape((-1, 3))

    return triangles_array

def get_points_array(in_gltf, mesh):
    binary_blob = in_gltf.binary_blob()
    
    points_accessor = in_gltf.accessors[in_gltf.meshes[mesh].primitives[0].attributes.POSITION]
    points_buffer_view = in_gltf.bufferViews[points_accessor.bufferView]
    points_array = np.frombuffer(
        binary_blob[
            points_buffer_view.byteOffset
            + points_accessor.byteOffset : points_buffer_view.byteOffset
            + points_buffer_view.byteLength
        ],
        dtype=GLTF_COMPONENT_TYPES[points_accessor.componentType],
        count=points_accessor.count * 3,
    ).reshape((-1, 3))

    return points_array

def get_normals_array(in_gltf, mesh):
    binary_blob = in_gltf.binary_blob()
    
    normals_accessor = in_gltf.accessors[in_gltf.meshes[mesh].primitives[0].attributes.NORMAL]
    normals_buffer_view = in_gltf.bufferViews[normals_accessor.bufferView]
    normals_array = np.frombuffer(
        binary_blob[
            normals_buffer_view.byteOffset
            + normals_accessor.byteOffset : normals_buffer_view.byteOffset
            + normals_buffer_view.byteLength
        ],
        dtype=GLTF_COMPONENT_TYPES[normals_accessor.componentType],
        count=normals_accessor.count * 3,
    ).reshape((-1, 3))

    return normals_array

def decimate_mesh_2(v_mat, f_mat, n_mat, perc_red=0.0):
    """
    
    """
    
    ms = pymeshlab.MeshSet()
    org_m = pymeshlab.Mesh(v_mat, f_mat)

    ms.add_mesh(org_m)

    ms.meshing_decimation_quadric_edge_collapse(optimalplacement=False, targetperc=perc_red) #preservetopology=True, qualitythr=0.5
    ms.compute_normal_per_vertex()

    m = ms.current_mesh()

    v_dm = m.vertex_matrix()
    f_dm = m.face_matrix()
    n_dm = m.vertex_normal_matrix()

    v_dict = { tuple(row): i for i, row in enumerate(v_dm) }
    v_remapping = np.argsort(np.array([v_dict.get(tuple(row), np.inf) for row in v_mat ]))

    v_org_rmp = v_mat[v_remapping]
    n_org_rmp = n_mat[v_remapping] # Remap the normals according to the remapped vertex matrix

    v_inv_mapping = np.argsort(v_remapping)
    f_org_rmp = v_inv_mapping[f_mat]

    ms.clear()

    return v_dm, f_dm, n_dm, v_org_rmp, f_org_rmp, n_org_rmp

if __name__ == '__main__':
    decimate_gltf(Path(sys.argv[1]), sys.argv[2])