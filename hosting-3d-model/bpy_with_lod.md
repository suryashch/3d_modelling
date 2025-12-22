# Understanding LOD Compression with Blender API

Blender's API allows you to modify objects in a scene in bulk. This is useful for BIM models that tend to have lots of objects. I would like to use the API to eventually build a pipeline that compresses our model down into lower `Level of Detail` (LOD), such that our rendering engine can swap between low res, med res and hi res versions of the same object on the fly. To do so, we will be using the Blender API library `bpy`.

## Basic Scripting With bpy

This is how to access all objects in a scene

```py
import bpy

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(obj.name)
```

Here we add the check `if obj.type == 'MESH'` to only list objects in our scene. This will not include items like lights or cameras. The output will be printed to console as a list of all objects in the scene.

Here is how you can access a `collection` (group of objects) in a scene:

```py
collection = bpy.data.collections.get('Collection')

if collection:
    for obj in collection.objects:
        print(obj.name)
```

In this code, we print out all objects' names within our specified collection.

Now, let's access specific data attributes within our object.

```py
collection = bpy.data.collections.get('Collection')

if collection:
    for obj in collection.objects:
        print(obj.location)
```

In this code block, we access the `location` attribute of our object. This will print out the vector coordinates of the center of our object.


### References

Mina Pecheux: https://www.youtube.com/@minapecheux
