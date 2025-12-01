# Hosting 3D models on a Website

The world of 3D modelling has eveolved a lot since the early days of AutoCAD. With improved graphics processing, compression techniques, and web engines being more powerful than ever, we can now view entire 3D models directly in the browser. With this improvement in web computation, I believe a significant drawback to 3D models will be addressed, namely file compatibility.

## The GLTF file type

The gltf file format is an open standard for the efficient transmission and loading of 3D scenes and models by engines and applications. gltf model are lightweight and can be quickly openend and viewed over a browser. Luckily `Blender` software allows for the export of 3D models and scenes to .gltf file format, which is what I shall be using for this testing purpose. I have a model `piperacks_lod-100.glb` which I shall attempt to load to a scene in the browser as a first step for further experimentation. Quick note: The .glb file extension is just a binary version of the gltf file format, it is more condensed and contains both the scene, as well as the materials, mesh details etc. It should function exactly the same as the gltf file.

## Setting up index.html

We need a boilerplate index.html file to serve as our root for the website. I attach here the basic code template which I derived from Dan Greenheck (Check out their YouTube channel here. https://www.youtube.com/@dangreenheck)

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>piperacks</title>

        <link rel="stylesheet" href="public/index.css">
        
        <script async src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
        <script type="importmap">
            {
                "imports":{
                    "three":"https://unpkg.com/three@v0.153.0/build/three.module.js",
                    "three/addons/": "https://unpkg.com/three@v0.153.0/examples/jsm/"
                }
            }
        </script>
    </head>
<body>
  <div id="heading">
    <h1>piperacks</h1>
    <div class="border"></div>
  </div>
  <script type="module" src="./scripts/main.js"></script>
</body>
</html>
```

Some important things to keep in mind here, I need to make a few imports from three.js which I download to this instance for the time being. These are found in the </script> tag of the metadata. I call a javascipt file called main.js in my main document folder. This file is saved in `/scripts/main.js`.

And the rest is just text. Opening the `index.html` file will open a localhost version of my webpage which for now, only contains a single line of text saying 'piperacks'.
