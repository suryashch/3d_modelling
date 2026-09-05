# Shader Programming in Three.js

Three.js provides a bunch of powerful open-source tools for 3D modelling. Most work exceptionally well out of the box and acn be used for most general tasks. However, to truly unlock the power of the GPU, we must move down a level into the heart of the GPU- Shaders.

Shaders are commands that run native on GPU hardware. They are optimized to work especially well with parallelized operations, capable of running multiple million operations at once, and every frame. Typically, Shaders are written in C++ and require advanced compilers to view and create. This is the heart of heavy-duty game development, and is still how hardware-centric games are programmed today.

We won't be going down to that level rather, running these Shaders natively within three.js and exploring their capabilities.

## Introduction to Shaders

As mentioned above, a Shader is program that runs natively on the GPU. There are many different types of Shaders, each with their own unique functionality. For the purpose of introduction, we shall be focusing on 2- the Vertex Shader and the Fragment Shader.



Its important to note that these names may be different based on the language and framework used, but ultimately the functionality will be the same. We will be programming our Shaders using [OpenGL programming API](https://www.opengl.org/). This API is built using a C++ based language known as [GLSL](https://wikis.khronos.org/opengl/OpenGL_Shading_Language), or OpenGL Shader Language.

### The Vertex Shader

As mentioned earlier, Shaders are programmed to conduct multiple parallelized operations. The Vertex Shader is responsible for managing the positions of every vertex in the scene, and how they translate from world-space to view-space. This means keeping track of each individual vertex coordinate, the position of the camera, and the size of the window. Each of these factors will affect how our scene looks on the screen.



Here is a very simple example of a Vertex Shader in action.

```cpp
void main() {
    gl_Position = vec4(pos, 1.0);
}
```

The code above looks daunting. Let's break it down.

All the code is doing above is creating a vector from our supplied vertices (`pos`) and assigning it to the variable `gl_Position`. GLSL provides a standard list of predefined variables that enable parallelized operations- `gl_Position` is one of them.

In standard C++ terminology, a function is defined by stating what type of value it returns, and the name of the function. In the example above, we return `void`, implying that our function named `main` is not returning anything- only setting an internal variable.

If we had a test function that did some operation and returned an integer, this is how we would define it -->

```cpp
int testFunction() {
    
    // Function code 
    
    return ;
}
```

`vec4` in the code above is a standard C++ object, a vector that contains 4 values. I like to think of a vector as a table, where each row corresponds to a unique object, and columns reference its data. In the case of our supplied vertices, each vertex will have an X coordinate, a Y coordinate and a Z coordinate. Hence, we will need a `vec3`, or vector with 3 dimentions to store this data. So why are we defining this data with a `vec4`? This boils down to the matrix math required to move an object on the screen, and is quite in depth. For now, just note that we need our vertex data to contain 3 columns (X, Y, Z) and a fourth column that will always be equal to 1.

Hence, we build our `vec4` object by passing `pos`, a 3 dimensional vector (or table) of vertex data and appending another column of 1's at the end of it.


### The Fragment Shader

A lot of GPU optimization techniques focus on streamlining data going into the Vertex Shader (reducing geometry LOD, draw calls etc.). However, the Fragment Shader is equally influential in the final scene. The Fragment Shader is responsible for adding color to the scene, and is run once for every pixel on the screen. A traditional 1080p display is 1080 pixels high and 1920 pixels wide. This means is we run our Fragment Shader on every pixel, we're coducting 1920 * 1080 = 2,073,600 calculations every frame. This is where the parallelization capabilities of GPU's *really* shine through.



At a high level, the Fragment Shader is responsible for identifying which pixels on the screen need to be colored, and how. Here is an example of a basic Fragment Shader.

```cpp
void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

This function looks similar to our Vertex Shader with a few key differences. Firstly, we define a new standardized variable here- `gl_FragColor`. This is another GLSL specific variable and defines the color that needs to be applied to our fragment or pixel.

Here, we also have another `vec4` being defined and used. Rather than X, Y, Z coordinates, this `vec4` tracks Red, Green, Blue (RGB) values to identify color. The fourth value here refers to `alpha`, and tracks the transparency of the applied color (0 = fully transparent, 1 = opaque). We observe that every item in the scene is being applied the same value `vec4(1.0, 0.0, 0.0, 1.0)`. This corresponds to Red = 1, Green = 0, Blue = 0, Alpha = 1; a fully red opaque object.



If we instead assign our color to `vec4(0.0, 1.0, 0.0, 1.0)`, this will set our object to the color Red = 0, Green = 1, Blue = 0, Alpha = 1; a fully green opaque object.




Now that we have the basic syntax down, let's expand this knowledge out to three.js.

## Shaders in Three.js

The best part about working with Shader in three.js is the readily available access to experimentation. To work with Shaders in three.js, we only need 3 things-

1) A scene.
2) Some geometry.
3) A `ShaderMaterial`.

We start by creating a basic boilerplate scene with some lights and a camera. To this scene, we add a cube.


Traditionally, to add a cube in three.js we need to create a new `Mesh` object that has geometry and a material. Here is the boilerplate code to add a simple cube to the scene- straight from the [three.js docs](https://threejs.org/docs/?q=mesh#Mesh). 

```js
const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );
```

We create a cube using `BoxGeometry` and `MeshBasicMaterial`, setting the color to yellow. Here is what this basic scene looks like.

![Basic Cube](img/BasicCube.png)

Simple. Now, instead of `MeshBasicMaterial`, let's swap this out for `ShaderMaterial`. As mentioned above, this material requires 2 arguments- the `vertexShader` and the `fragmentShader`.

Unfortunately, since we're in JavaScript land, we cannot compile using C++. Hence, we need to pass the Shader code to this Material as a text string. Its a little janky, but it works. Let's create the vertex and fragment shaders as follows.

```js
const vertexShader = `
    void main() {
        gl_Position = vec4(position, 1.0);
    }
`

const fragmentShader = `
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
`
```

In the code block above, we have essentially created 2 variables `vertexShader` and `fragmentShader`. These are strings, that contain the exact text required to make our vertex and fragment shaders work. In JavaScript, you can create a mulit-line string by wrapping the block within backticks ``.

Now, we pass these 2 variables to our `ShaderMaterial`.

```js
const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader
});
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );
```

Hence, when we pass these 2 variables to our `ShaderMaterial`, this is what we see.

![ShaderCube without Camera Matrix](img/ShaderCube.png)

Looks the same! This is good news, but it begs the question- why? Why not just use `MeshBasicMaterial` and call it a day? Well, we are just scratching the surface here. The true value of shaders comes from the calculations which we run within them.

As we move forth, we will be working with functions in both the Vertex and Fragment Shaders to create stunning visuals, and slight animations. What we have just set up here is a template which will allow us to experiment.

## Basic Functions with Shaders

### View and Projection Matrix

The first thing you might have noticed (or maybe not, that's ok too) in our current scene is that our cube looks like its a different size. This boils down to projection matrices. As mentioned in the Vertex Shader section above, we note that this program is responsible for positioning our vertices on the screen, and needs to account for a host of different factors- camera position, screen size, projection type etc. In our current `vertexShader` implementation, we're only passing in the raw coordinates. Hence, when we move the camera or resize the window, nothing happens.




To address this, we need to add some code to our `vertexShader`. Here is the code, and we shall describe its purpose below.

```js
const vertexShader = `
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`
```

Essentially, we need to multiply the existing `vec4` object by 2 matrices- the `projectionMatrix` and the `modelViewMatrix`. These matrices represent the transformations required to place our object in its final location in the scene.

The `modelViewMatrix` represents the screen size. If we have a smaller window, our object will be a lot smaller on the screen. The `modelViewMatrix` contains this information.

The `projectionMatrix` represents the camera projection and position in the scene. If we move our camera around, we would like the position of our object to change. This information is captured in this matrix.

These matrices are standard values passed from three.js to our vertex shader every frame, and their names must match exactly. With these matrices added to our scene, this is what we observe.

![ShaderCube with Projection and ModelView matrices](img/ShaderCube-projection-modelView.png)

This is what we expected. Now our cube changes dynamically with camera movement, and with window resize.

Cool. But still, not that impressive. Let's step it up.

### Colour Gradients with Uniforms

So far we have been working with solid colours in three.js. Using the Fragment Shader, we can apply a colour gradient to our object- but first we need to introduce a new concept- Uniforms. Uniforms are used to save data on the GPU and can be quickly accessed by both our Shaders. Uniforms are called so because the data saved within them is the same every time the shader is run- i.e. it does not change between frames. This will become apparent when we contrast with 'varyings' a little later.



Let's create our first uniform- `u_Resolution`, which we shall use to track our drawing screen size. This uniform shall be of type `vec2`, and will save information related to the width and height of our screen.

```cpp
uniform vec2 u_Resolution;
```

Since we have declared this uniform at the top, we will also need to pass data into it via three.js `ShaderMaterial`. Hence we need to also add a new argument to the initialization code as follows.

```js
const material = new THREE.ShaderMaterial({
    uniforms: {
        u_Resolution: {
            value: [ window.innerWidth, window.innerHeight ]
        }
    },
    vertexShader,
    fragmentShader
});
```

The uniforms need to be passed to our `ShaderMaterial` as a dictionary object, with the keys named exactly the same. Since we've defined the uniform as a `vec2`, we will need to pass an array of size 2 into it. We pass the values of the window `innerWidth` and `innerHeight` to this object.

Let's work with this uniform data in our Fragment Shader. To start with, we need to normalize our screen space such that the values run from 0 to 1. This corresponds nicely with the color scale we're currently using (RGB = 1.0, 0.0, 1.0). To normalize, we need to divide our screen-space coordinates by the input window size. This will give us a `vec2` of values ranging from 0 to 1 where 0 is the absolute left edge of the screen and 1 is the absolute right. We save these values to a variable called `st`.

```cpp
uniform vec2 u_Resolution;

void main() {
    vec2 st = gl_FragCoord.xy / u_Resolution; 
    gl_FragColor = vec4(st.x, st.y, 0.0, 1.0);
}

```

Now, we acn set the colour of our Shader to be the first 2 values returned from our newly created variable `st`. We access these values by calling `st.x` and `st.y`- even though these values do not have anything to do with X or Y. This is just the shorthand notation for accessing values in a vector. As seen in the line above it, we can access the first 2 values of `gl_FragCoord` by calling `gl_FragCoord.xy`. This will now return a `vec2` instead of just a single value.

> Side note, you can access any of the 4 values in a `vec4`, by calling `myTestVec4.x`, `.y`, `.z`, or `.w`, or any combination thereof- regardless of what data is actually being stored.

Back to the code above, now that we have normalized X and Y coordinates for screen space, we can just set these values to be the first 2 values in our `gl_FragColor` variable. Now, since these values vary with position on the screen, we should see different colours show up on our object.

![ShaderCube with Color Gradient](img/ShaderCube-with-color-gradient.png)

Perfect. We do see the colour gradient as expected. Let's work through what we just did. Since we set the first 2 channels of our `gl_FragColor` variable to be the normalized screen width and height, these 2 channels will change with x and y. Essentially, we have mapped our screen's X axis to the Red Channel, and y axis to the Green Channel.



An increase in X results in an increase in Red. An increase in Y results in an increase in Green.



An increase in both results in an increase in both Red and Green, which combined, makes yellow.





An interesting observation we note here is that the color of the cube changes based on where in the screen it is.

![ShaderCube with Color Gradient positioned on the left](img/ShaderCube-with-color-gradient-left.png)

![ShaderCube with Color Gradient positioned on the right](img/ShaderCube-with-color-gradient-right.png)

We observe that as the cube gets positioned further to the left, it tends to contain more green, and on the right it tends to contain more red/yellow. This makes perfect sense since our FragmentShader is normalized to screen coordinates. If we take a look at the code above, we see that we're normalizing the data based on the input screen size. Since our object only occupies a certain portion of this screen size, it will pick up the applied colour that is set for that portion of the screen. This graphic should be explain this concept further.



To absolutely drive this point home, we zoom out to make our object smaller on the screen. Here, since the object is right in the center of our color plane it should only pick up the color in the absolute center of the screen- yellow.

![ShadeCube with Color Gradient zoomed out](img/ShaderCube-with-color-gradient-zoomedpng.png)

### 



## Links

[OpenGL programming language](https://www.khronos.org/opengl/)

[GLSL](https://wikis.khronos.org/opengl/OpenGL_Shading_Language)