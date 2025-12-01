# Superposing Models of Different LOD in a Web Based Environment

I would like to explore the idea of superposing two models on top of one another in the same scene, and dynamically switching between the two when the user is a certain zoom level away from it. I have already been able to establish that reducing the mesh density of models makes them easier to navigate around (see `../reducing-mesh-density/analysis_decimate.md`). Now I would like to put that to the test by default loading the low density mesh, and switching to the high density one when the user zooms in.

The idea for this code has been partially derived from the work done in this sandbox: https://codesandbox.io/p/sandbox/12nmp?file=%2Fsrc%2FApp.js.

The code in this project was partially assisted by Google Gemini (credits provided where applicable).

## The baseline

The baseline file we shall build off has been described in full effect in my other work (see `./analysis_threejs.md`). The code below will build off an image of a webpage that has a 3D model shown as a scene, with basic user controls (panning, zooming and orbiting).


