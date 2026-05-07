import pymeshlab
import numpy as np
import pygltflib

GLTF_COMPONENT_TYPES = {
    5120: np.int8,
    5121: np.uint8,
    5122: np.int16,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32
}

def decimate_mesh(v_mat, f_mat, perc_red=0.0):
    """
    Reduce mesh complexity using quadric edge collapse and remap original indices.

    Loads a mesh from a file, performs decimation to a target percentage, and 
    reorders the original vertex and face matrices so that the decimated 
    vertices occupy the leading indices.

    Parameters
    ----------
    v_mat : ndarray
        Original vertex array in numpy format.
    f_mat : ndarray
        Original face (trianlge) array in numpy format
    perc_red : float, optional
        Target reduction percentage for the decimation algorithm (0.0 to 1.0). 
        Default is 0.0 (no reduction).

    Returns
    -------
    v_org_rmp : ndarray
        The original vertex matrix reordered to align with decimated indices.
    f_org_rmp : ndarray
        The original face matrix updated to reflect the reordered vertex indices.
    v_dm : ndarray
        The vertex matrix of the decimated mesh.
    f_dm : ndarray
        The face matrix of the decimated mesh.

    Raises
    ------
    AssertionError
        If the remapped original vertices do not align with the decimated 
        vertex set.
    """
    try: 
        ms = pymeshlab.MeshSet()
        org_m = pymeshlab.Mesh(v_mat, f_mat)

        ms.add_mesh(org_m)

        ms.meshing_decimation_quadric_edge_collapse(optimalplacement=False, targetperc=perc_red) #preservetopology=True, qualitythr=0.5
        m = ms.current_mesh()

        v_dm = m.vertex_matrix()
        f_dm = m.face_matrix()

        v_dict = { tuple(row): i for i, row in enumerate(v_dm) }
        v_remapping = np.argsort(np.array([v_dict.get(tuple(row), np.inf) for row in v_mat ]))

        v_org_rmp = v_mat[v_remapping]

        v_inv_mapping = np.argsort(v_remapping)
        f_org_rmp = v_inv_mapping[f_mat]

        ms.clear()

        return v_org_rmp, f_org_rmp, v_dm, f_dm
    
    except Exception as e:
        print(f"Error in decimate_mesh: {e}")
        return None, None, None, None
    
# Helper functions for matrix transforms
def trs_to_matrix(t, r, s):
    """Converts Translation, Rotation (Quat), and Scale to a 4x4 Matrix."""
    # Translation matrix
    T = np.eye(4)
    if t: T[:3, 3] = t
    
    # Scale matrix
    S = np.eye(4)
    if s: np.fill_diagonal(S[:3, :3], s)
    
    # Rotation matrix from Quaternion [x, y, z, w]
    R = np.eye(4)
    if r:
        x, y, z, w = r
        R[:3, :3] = [
            [1 - 2*y**2 - 2*z**2, 2*x*y - 2*z*w,     2*x*z + 2*y*w],
            [2*x*y + 2*z*w,     1 - 2*x**2 - 2*z**2, 2*y*z - 2*x*w],
            [2*x*z - 2*y*w,     2*y*z + 2*x*w,     1 - 2*x**2 - 2*y**2]
        ]
    
    # glTF order: M = T * R * S
    return T @ R @ S

def compute_world_matrices(gltf):
    """Calculates absolute world matrices for all nodes in the gltf."""
    world_matrices = [np.eye(4) for _ in range(len(gltf.nodes))]
    
    # Find root nodes (nodes not listed as children of anyone)
    all_children = set()
    for node in gltf.nodes:
        if node.children:
            all_children.update(node.children)
    
    roots = [i for i in range(len(gltf.nodes)) if i not in all_children]

    def traverse(node_idx, parent_matrix):
        node = gltf.nodes[node_idx]
        if node.matrix:
            local_m = np.array(node.matrix).reshape(4, 4).T # Column-major to Row-major
        else:
            local_m = trs_to_matrix(node.translation, node.rotation, node.scale)
        
        world_m = parent_matrix @ local_m
        world_matrices[node_idx] = world_m
        
        if node.children:
            for child_idx in node.children:
                traverse(child_idx, world_m)

    for root_idx in roots:
        traverse(root_idx, np.eye(4))
        
    return world_matrices

def convert_gltf(gltf):
    
    piperack_binary_blob = gltf.binary_blob()
    
    # Initialize empty GLTF container to store the newly created mesh objects.
    gltf_lod = pygltflib.GLTF2()
    gltf_lod.scenes.append(pygltflib.Scene(nodes=[]))
    gltf_lod.scene = 0

    # Empty array for appending binary blobs
    main_binary_blob = bytearray()

    # Compute world matrices for each mesh
    world_matrices = compute_world_matrices(gltf)

    # Variables for loop traversal
    byte_offset_ctr = 0
    bufferview_ctr = 0
    accessor_ctr = 0

    # Main loop
    for node_idx, original_node in enumerate(gltf.nodes):    
        if original_node.mesh is None:
            continue
        
        mesh_idx = original_node.mesh
        primitive = gltf.meshes[mesh_idx].primitives[0]

        # Step 1: Acquire the existing triangles and points array from the gltf file
        triangles_accessor = gltf.accessors[primitive.indices]
        triangles_buffer_view = gltf.bufferViews[triangles_accessor.bufferView]
        triangles = np.frombuffer(
            piperack_binary_blob[
                triangles_buffer_view.byteOffset
                + triangles_accessor.byteOffset : triangles_buffer_view.byteOffset
                + triangles_buffer_view.byteLength
            ],
            dtype=GLTF_COMPONENT_TYPES[triangles_accessor.componentType],
            count=triangles_accessor.count,
        ).reshape((-1, 3))

        points_accessor = gltf.accessors[primitive.attributes.POSITION]
        points_buffer_view = gltf.bufferViews[points_accessor.bufferView]
        points = np.frombuffer(
            piperack_binary_blob[
                points_buffer_view.byteOffset
                + points_accessor.byteOffset : points_buffer_view.byteOffset
                + points_buffer_view.byteLength
            ],
            dtype=GLTF_COMPONENT_TYPES[points_accessor.componentType],
            count=points_accessor.count * 3,
        ).reshape((-1, 3))

        # Step 2: Apply the decimation and remapping function
        points_rmp, triangles_rmp, points_dm, triangles_dm = decimate_mesh(points, triangles)

        triangles_rmp = triangles_rmp.astype(np.uint32)
        triangles_dm = triangles_dm.astype(np.uint32)

        points_rmp = points_rmp.astype(np.float32)
        points_dm = points_dm.astype(np.float32)

        # Step 3: Convert the new arrays to binary and append to main binary blob
        triangles_org_binary_blob = triangles_rmp.flatten().tobytes()
        triangles_dec_binary_blob = triangles_dm.flatten().tobytes()

        points_org_binary_blob = points_rmp.tobytes()
        points_dec_binary_blob = points_dm.tobytes()

        combined_byte_array = triangles_org_binary_blob + triangles_dec_binary_blob + points_org_binary_blob
        main_binary_blob.extend(combined_byte_array) # Note we do not append the decimated mesh vertices

        # Step 4: Format the GLTF file with the 2 new LODs
        # Append the BufferViews
        gltf_lod.bufferViews.extend([
            pygltflib.BufferView(
                buffer=0, 
                byteOffset=byte_offset_ctr, 
                byteLength=len(triangles_org_binary_blob), 
                target=pygltflib.ELEMENT_ARRAY_BUFFER
            ),
            pygltflib.BufferView(
                buffer=0, 
                byteOffset=byte_offset_ctr + len(triangles_org_binary_blob), 
                byteLength=len(triangles_dec_binary_blob), 
                target=pygltflib.ELEMENT_ARRAY_BUFFER
            ),
            pygltflib.BufferView(
                buffer=0, 
                byteOffset=byte_offset_ctr + len(triangles_org_binary_blob) + len(triangles_dec_binary_blob), 
                byteLength=len(points_org_binary_blob), 
                target=pygltflib.ARRAY_BUFFER
            ),
            pygltflib.BufferView(
                buffer=0, 
                byteOffset=byte_offset_ctr + len(triangles_org_binary_blob) + len(triangles_dec_binary_blob), 
                byteLength=len(points_dec_binary_blob), 
                target=pygltflib.ARRAY_BUFFER
            )
        ])

        # Append the Accessors
        gltf_lod.accessors.extend([
            pygltflib.Accessor(   # Original Mesh indices
                bufferView=bufferview_ctr,
                componentType=5125,
                count=triangles_rmp.size,
                type=pygltflib.SCALAR
            ),
            pygltflib.Accessor(   # Decimated Mesh indices
                bufferView=bufferview_ctr+1,
                componentType=5125,
                count=triangles_dm.size,
                type=pygltflib.SCALAR
            ),
            pygltflib.Accessor(    # Original mesh vertices
                bufferView=bufferview_ctr+2,
                componentType=pygltflib.FLOAT,
                count=len(points_rmp),
                type=pygltflib.VEC3,
                max=points_rmp.max(axis=0).tolist(),
                min=points_rmp.min(axis=0).tolist(),
            ),
            pygltflib.Accessor(    # Decimated mesh vertices
                bufferView=bufferview_ctr+3,
                componentType=pygltflib.FLOAT,
                count=len(points_dm),
                type=pygltflib.VEC3,
                max=points_dm.max(axis=0).tolist(),
                min=points_dm.min(axis=0).tolist(),
            )
        ])

        # Append the Meshes
        gltf_lod.meshes.extend([
            pygltflib.Mesh(
                primitives=[
                    pygltflib.Primitive(
                        attributes=pygltflib.Attributes(POSITION=bufferview_ctr+2), indices=bufferview_ctr
                    )
                ]
            ),
            pygltflib.Mesh(
                primitives=[
                    pygltflib.Primitive(
                        attributes=pygltflib.Attributes(POSITION=bufferview_ctr+3), indices=bufferview_ctr+1
                    )
                ]
            )
        ])

        world_m = world_matrices[node_idx]
        flat_m = world_m.T.flatten().tolist()

        # Append the Nodes
        gltf_lod.nodes.extend([
            pygltflib.Node(
                mesh=accessor_ctr,
                matrix=flat_m,
                name=f"Mesh_{node_idx}-hires"
            ),
            pygltflib.Node(
                mesh=accessor_ctr+1,
                matrix=flat_m,
                name=f"Mesh_{node_idx}-lowres"
            )
        ])

        # Add to the existing scene
        gltf_lod.scenes[0].nodes.extend([accessor_ctr, accessor_ctr+1])


        # Step 6: Manually update the counters
        byte_offset_ctr = byte_offset_ctr + len(triangles_org_binary_blob) + len(triangles_dec_binary_blob) + len(points_org_binary_blob)
        bufferview_ctr = bufferview_ctr + 4
        accessor_ctr = accessor_ctr + 2

    gltf_lod.buffers.append(pygltflib.Buffer(byteLength=len(main_binary_blob)))
    gltf_lod.set_binary_blob(main_binary_blob)

    return gltf_lod