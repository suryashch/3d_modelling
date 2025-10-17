# Overview

## Section 1
The aim of this project is to create a 3D model that is compressed, and efficient to use in glb format. The raw size of models I'm looking at here is often 50+ MB, and too slow to be used in traditional web viewers. However, with a little tweaking I'm confident we can improve end performance of these models in a web based environment.

## Identified Problems
Currently, the main issues I see with opening these models in a web viewer is performance. I suspect this has to do with the sheer number of objects in the scene, as I have seen better performance when it comes to consolidated models.

## Potential Solutions

### Zoom Based Rendering
My first idea is to create 4-5 different versions of the model, each with a progressively higher compression ratio. The further out you zoom from the model, the smaller the objects become on the screen, and the more compressed the object can become wihout losing too much spatial context to the user. One way I have found works is using the decimate feature in Blender. This method reduces the number of meshes and nodes in an object by a given ratio. The smaller this ratio is, the more deformed the final object looks, and I was able to get to a ratio of 0.4 before I started losing shape context of the object.

One drawback to this method is time. I'm not sure if its the way the code is currently being executed, but the code takes way too long to run. Here is the code block that worked for me, albeit after nearly 24 hours.

```python
import bpy

decimate_levels = 0.4

# Deselect everything (not strictly necessary)
bpy.ops.object.select_all(action='DESELECT')

# Get all mesh objects
mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

for obj in mesh_objs:
    # Set as active object (some modifiers require this)
    bpy.context.view_layer.objects.active = obj

    # Add decimate modifier
    decimate_mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
    decimate_mod.ratio = decimate_levels

    # Apply modifier using API (not bpy.ops)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=decimate_mod.name)
```

While there are nearly 12,000 objects in my scene, this process still seemed astronomically slow and will definitely need some fine tuning.

Once I have this 0.4 decimated model, I loaded it and the 100% model to a three.js scene. With a little code, I was able to swap the active model in scene based on the distance the user was from the model.

```javascript
//once I can find this code block, I will insert it here.
```

I noticed some performance gains, although none that I was able to discretely measure. Further testing may be required to get a conclusive answer to this hypothesis.

Another issue of note is that the models need to be perfectly aligned otherwise the zomm in and out process will not be smooth. I noticed that my 40% model had a slightly different center from the original 100% model, and this resulted in glitching when I zoomed past this point. Some tweaks may be possible in blender to achieve this continuous zoom.

A big hinderance I found here is that through the current state of code, I am unable to selectively render objects based on how close or far they are from the user- either the whole model is at 40% LOD or 100% LOD. This is not ideal and defeats the purpose of our project. We need to find a way to swap the object's LOD, not the model.

### External Object Triangulation

We will work on the name later.

I have another theory that I would like to test out. What if we modeled our entire scene as a single object. I have notced a lot more intricate glb and gltf models being loaded to a three.js scene, with smooth performance. One reason why this may speed things up is that the GPU no longer needs to keep track of multiple object transformations in memory. Our one object gets rotated, zoomed into, and panned, easing the load. But though this process, we lose access to the ability to select individual objects in a scene. A workaround I am postulating is to save these object bounding boxes in a virtual 3D scene (yes I'm aware we're already in a virtual world, this could be though of as 'meta-virtual').

We save our individual objects in the scene and their metadata to a database. We now create a 4D array, with 1 dimension for the object ID and the other three dimensions for the object's bounding box coordinates. Three.js has a useful feature called raycasting that tracks where in the scene the user has currently clicked. The way it clicked for me is to literally picture a laser beam shooting out from the tip of your mouse pointer, and tracking where in the scene it intersects when the user clicks. We can now get the coordinates of eactly where the user has clicked and triangulate this position to an object in our external database, thereby retrieving that metadata and information.

We could also physically overlay the 3D bounding box of this object onto the scene, giving visual confirmation of the click to the user.

To start, we must first export the bounding boxes from our individual objects in the model.