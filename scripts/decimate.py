import pymeshlab
import numpy as np


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

        ms.meshing_decimation_quadric_edge_collapse(targetperc=perc_red, optimalplacement=False)
        m = ms.current_mesh()

        v_dm = m.vertex_matrix()
        f_dm = m.face_matrix()

        v_dict = { tuple(np.round(row,6)): i for i, row in enumerate(v_dm) }
        v_remapping = np.argsort(np.array([v_dict.get(tuple(row), np.inf) for row in v_mat ]))

        v_org_rmp = v_mat[v_remapping]

        v_inv_mapping = np.argsort(v_remapping)
        f_org_rmp = v_inv_mapping[f_mat]

        ms.clear()

        return v_org_rmp, f_org_rmp, v_dm, f_dm
    
    except Exception as e:
        print(f"Error in decimate_mesh: {e}")
        return None, None, None, None