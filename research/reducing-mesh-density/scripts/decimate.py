import pymeshlab as ms
import numpy as np


def decimate_mesh(obj_path, perc_red=0.0):
    """
    Reduce mesh complexity using quadric edge collapse and remap original indices.

    Loads a mesh from a file, performs decimation to a target percentage, and 
    reorders the original vertex and face matrices so that the decimated 
    vertices occupy the leading indices.

    Parameters
    ----------
    obj_path : str
        Path to the input .obj mesh file.
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
    ms.load_new_mesh(obj_path)
    m = ms.current_mesh()
    
    v_org = m.vertex_matrix()
    f_org = m.face_matrix()

    ms.meshing_decimation_quadric_edge_collapse(targetperc=perc_red, optimalplacement=False)
    m = ms.current_mesh()

    v_dm = m.vertex_matrix()
    f_dm = m.face_matrix()

    v_dict = { tuple(row): i for i, row in enumerate(v_dm) }
    v_remapping = np.argsort(np.array([v_dict.get(tuple(row), np.inf) for row in v_org ]))

    v_org_rmp = v_org[v_remapping]
    f_org_rmp = v_remapping[f_org]

    assert v_org_rmp[:len(v_dm)].all() == v_dm.all()

    ms.clear()

    return v_org_rmp, f_org_rmp, v_dm, f_dm