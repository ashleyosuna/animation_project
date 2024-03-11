
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(0.0, 15.0, 10.0, 1.0 );
var lightPosition = vec4(0.0, 5.0, 0.0, 1.0 );

var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
var materialShininess = 200.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var previous_t = Date.now();
var frames = 0;
//var curr_time = 0;

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;
var angle = 90;
var cloud_position = 0;
var clouds_positions = [-10, 10, -10, 10, -10, 10, -10, 10, -10, 10];
var clouds_directions = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
var legs_rotation = 0;
var legs_direction = 0;
var character_position = [0, 0, 0];
var rotations = 0;
var useTextures = 1;

/* making brick texture for the house */
var texSize = 64;
var imageBrickData = new Array();

for (var i =0; i<texSize; i++)
	imageBrickData[i] = new Array();

for (var i =0; i<texSize; i++)
	for ( var j = 0; j < texSize; j++)
		imageBrickData[i][j] = new Float32Array(4);

for (var i = 0; i<texSize; i++)
    for (var j = 0; j<texSize; j++)
        if(j%4 == 0){
            imageBrickData[j][i] = [1, 1, 1, 1];
        }else if(j%8 < 4 && i%4 == 0){
            imageBrickData[j][i] = [1, 1, 1, 1];
        }else if(j%8 >=4 && i%4 == 2){
            imageBrickData[j][i] = [1, 1, 1, 1];
        }else{
            imageBrickData[j][i] = [1, 0, 0, 1];
        }
    
//Convert the image to uint8 rather than float.
var imageBrick = new Uint8Array(4*texSize*texSize);

for (var i = 0; i < texSize; i++)
	for (var j = 0; j < texSize; j++)
	   for(var k =0; k<4; k++)
			imageBrick[4*texSize*i+4*j+k] = 255*imageBrickData[i][j][k];
		
// For this example we are going to store a few different textures here
var textureArray = [] ;

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition2) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
    if (im.complete) {
        console.log("loaded") ;
        return true ;
    }
    else {
        console.log("still not loaded!!!!") ;
        return false ;
    }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename)
{
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(tex); }
}

// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
	
	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually laoded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               wtime = (new Date()).getTime() ;
               if( n != texs.length )
               {
               		console.log(wtime + " not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
					render(0);
               }
		},
	5) ;
}

// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();

	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);

    tex.isTextureReady = true;
}

// This just calls the appropriate texture loads for this example adn puts the textures in an array
function initTexturesForExample() {
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"grass.png") ;
    
    textureArray.push({}) ;
    loadImageTexture(textureArray[textureArray.length-1],imageBrick) ;
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    //
	//gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
	gl.clearColor( 0.447, 0.831, 0.831, 1.0 );
    //gl.clearColor(255.0/256.0, 150.0/256.0, 28.0/256.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition2) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true  ;
            resetTimerFlag = true ;
            window.requestAnimFrame(render);
        }
    };
    
    /*document.getElementById("textureToggleButton").onclick = function() {
        toggleTextures() ;
        window.requestAnimFrame(render);
    };*/

    var controller = new CameraController(canvas);
    controller.onchange = function(xRot,yRot) {
        RX = xRot ;
        RY = yRot ;
        window.requestAnimFrame(render); };
	
	
	// Helper function just for this example to load the set of textures
    initTexturesForExample() ;

    waitForTextures(textureArray);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

function draw_cloud(){
	/*function that draws smoke cloud coming out of the chimney*/
	if(cloud_position > 8){
		/* bring cloud back into screen */
		cloud_position = 0
	}
	/* moving cloud */
	cloud_position = cloud_position + dt;
	gTranslate(0, cloud_position, 0);
	
	gScale(0.15, 0.15, 0.15);
	setColor(vec4(0.5, 0.5, 0.5, 1));

	/* drawing components of the cloud*/
	drawSphere();
	gPush();
	{
		gTranslate(-0.5, 1.25, 0);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(0.35, 2.5, 0);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(-0.25, 3.75, 0);
		drawSphere();
	}
	gPop();
}

function draw_leaves(){
	/* function that draws leaves on trees */
	gTranslate(0, 1, 0);
	setColor(vec4(0.33203125, 0.41796875, 0.18359375, 1));
	gScale(0.5, 0.5, 0.5);

	/* drawing spheres for tree */
	gPush();
	{
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(-0.5, 1, 0.5);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(0.65, 1, 0.5);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(-0.75, 1, -0.5);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(0.75, 1, -0.5);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(0, 2.25, 0);
		drawSphere();
	}
	gPop();
	useTextures = 0;
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}

function draw_tree(){
	gTranslate(0, -1.25, 0);
	gPush();
	{
		gPush();
		{
			/* drawing trunk of the tree */
			gRotate(90, 1, 0, 0);
			gScale(0.4, 0.4, 1.25);
			setColor(vec4(0.68359375, 0.5, 0.30859375, 1));
			drawCylinder();
		}
		gPop();

		gPush();
		{
			draw_leaves();
		}
		gPop();
	}
	gPop();
}

function draw_legs(){
	/* rotating legs around x-axis in real time to simulate walking */
	if(legs_rotation > 60){
		legs_direction = 0;
	}
	if(legs_rotation < -60){
		legs_direction = 1;
	}
	if(legs_direction == 0){
		legs_rotation = legs_rotation - 50*dt;
	}
	if(legs_direction == 1){
		legs_rotation = legs_rotation + 50*dt;
	}
	/* translating to rotate around end of body */
	gTranslate(0, -0.5, 0);
	gPush();
	{
		gRotate(legs_rotation, 1, 0, 0);
		gPush();
		{
			gTranslate(-0.75, -0.5, 0);
			gScale(0.35, 0.5, 0.5);
			drawSphere();
		}
		gPop();
	}
	gPop();
	gPush();
	{
		/* rotate around negative value so legs go in opposite directions */
		gRotate(-legs_rotation, 1, 0, 0);
		gPush();
		{
			gTranslate(0.75, -0.5, 0);
			gScale(0.35, 0.5, 0.5);
			drawSphere();
		}
		gPop();
	}
	gPop();
}

function move_character(){
	/* moves character in a straight line as it exits the house */
	if(character_position[2] < 3){
		character_position[2] = character_position[2] + dt;
	}
	gTranslate(character_position[0], 0, character_position[2]);

	/* character turns to start walking */
	if(character_position[2] >= 3){
		gRotate(90, 0, 1, 0);
	}
}

function draw_character(){
	gTranslate(0, 2.1, 0);
	/* character walks in circles around the house after it has exited the house*/
	if(character_position[2] >= 3){
		rotations = rotations + 15 * dt;
		gRotate(rotations, 0, 1, 0);
	}
	move_character();
	
	/* drawing head */
	gScale(0.3, 0.3, 0.3);
	setColor(vec4(0.68359375, 0.5, 0.30859375, 1));
	drawSphere();
	gPush();
	{
		/* drawing eyes */
		gTranslate(-0.35, 0.35, 0.75);
		gScale(0.15, 0.35, 0.15);
		setColor(vec4(0, 0, 0, 1));
		drawSphere();

		gPush();
		{
			gTranslate(4.5, 0, 0);
			drawSphere();
		}
		gPop();
	}
	gPop();
	gPush();
	{
		/* drawing nose */
		gTranslate(0, -0.25, 0.75);
		gScale(0.5, 0.5, 0.5);
		setColor(vec4(0.68359375, 0.5, 0.30859375, 1));
		drawSphere();
	}
	gPop();
	gPush();
	{
		/* drawing body */
		gTranslate(0, -2.5, 0);
		gScale(1, 1.5, 1);
		drawSphere();
		gPush();
		{
			draw_legs();
		}
		gPop();
	}
	gPop();
	/* drawing ears */
	gPush();
	{
		gTranslate(-0.75, 1, 0);
		gScale(0.5, 0.5, 0.5);
		drawSphere();
	}
	gPop();
	gPush();
	{
		gTranslate(0.75, 1, 0);
		gScale(0.5, 0.5, 0.5);
		drawSphere();
	}
	gPop();
}

function draw_house(){
	gTranslate(0, 3.5, 0);
	gScale(0.25, 2, 0.25);
	
    /* indicating that brick texture should be used */
	useTextures = 1;
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
	drawCube();
	useTextures = 0;

	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
	gPush();
	{
		/* drawing roof of the house */
		gTranslate(0, 1, 0);
		gScale(0.75, 0.75, 0.9999);
		gRotate(45, 0, 0, 1);
		setColor(vec4(92/256, 64/256, 51/256, 1));
		drawCube();
	}
	gPop();
	gPush();
	{
		/* drawing door of the house */
		gTranslate(0, -0.25, 1);
		gScale(0.5, 0.75, 0.1);
		setColor(vec4(92/256, 64/256, 51/256, 1));
		drawCube();
	}
	gPop();
	gPush();
	{
		gTranslate(0.70, 1, 0);
		gPush();
		{
			/* drawing chimney */
			gScale(0.25, 1, 0.25);
			drawCube();
		}
		gPop();
		gPush();
		{
			/* calling function that draws smoke cloud 
			coming out of the chimney */
			draw_cloud();
		}
		gPop();
	}
	gPop();
}

function draw_world(){
	/* function that draws a "two-level" world with dirt at bottom and
	   grass on second level */
	gTranslate(0, -2.5, 0);
	gPush();
	gScale(4.5, 0.5, 4.5);
	setColor(vec4(0.68359375, 0.5, 0.30859375, 1));
	drawCube();
	gPush();
	{
		gTranslate(0, 1.25, 0);
		gScale(1, 0.25, 1);
		ambientProduct = mult(vec4(1, 1, 1, 1), vec4(1, 1, 1, 1));
		gl.uniform4fv( gl.getUniformLocation(program,
			"ambientProduct"),flatten(ambientProduct) );
		/* indicating that grass texture should be used */
		useTextures = 2;
		gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
		drawCube();
		useTextures = 0;
		gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
	}
	gPop();
	gPush();
	{
		/* place house onto the world */
		setColor(vec4(1, 1, 1, 1));
		draw_house();
	}
	gPop();
	gPop();
	gPush();
	{
		draw_character();
	}
	gPop();
}

function draw_clouds(){
	/* function that draws clouds onto the sky */
	gPush();
	gTranslate(0, 4, 0);

	/* drawing ten clouds */
	for (let index = 0; index <10 ; index++){
		gPush();
		{
			if(index < 5){ //spreading clouds accross z-values
				gTranslate(0, 0, (-index));
			}if(index >=5){
				gTranslate(0, 0, (index - 5));
			}
			
			if(clouds_positions[index] >= 10){ //changing directions
				clouds_directions[index] = 0;
			}if(clouds_positions[index] <= -10){
				clouds_directions[index] = 1;
			}
			
			if(clouds_directions[index] == 0){ //updating positions
				clouds_positions[index] = clouds_positions[index] - (index%5)*0.5*dt;
			}if(clouds_directions[index] == 1){
				clouds_positions[index] = clouds_positions[index] + (index%5)*0.5*dt;
			}
			gTranslate(clouds_positions[index], 0, 0);
			gPush();
			{
				/*drawing cloud components*/
				gScale(0.35, 0.25, 0.25);
				setColor(vec4(1, 1, 1, 1));
				drawSphere();
				gPush();
				{
					gTranslate(1, 0, 0);
					drawSphere();
				}
				gPop();
				gPush();
				{
					gTranslate(0.5, 0.9, 0);
					drawSphere();
				}
				gPop();
			}
			gPop();
		}
		gPop();
	}
	gPop();
}

function drawBackground(){
	/* function that draws four cubes around the world to use as background */
	useTextures = 3; //indicating that gradient fragment effect should be used
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
	ambientProduct = mult(vec4(1, 1, 1, 1), vec4(1, 1, 1, 1));
		gl.uniform4fv( gl.getUniformLocation(program,
			"ambientProduct"),flatten(ambientProduct) );
	gPush();
	{
		gTranslate(0, -2, -27);
		gScale(100, 18, 1);
		drawCube();
	}
	gPop();
	gPush();
	{
		gRotate(90, 0, 1, 0);
		gTranslate(0, -2, -27);
		gScale(100, 18, 1);
		drawCube();
	}
	gPop();
	gPush();
	{
		gRotate(180, 0, 1, 0);
		gTranslate(0, -2, -27);
		gScale(100, 18, 1);
		drawCube();
	}
	gPop();
	gPush();
	{
		gRotate(270, 0, 1, 0);
		gTranslate(0, -2, -27);
		gScale(100, 18, 1);
		drawCube();
	}
	gPop();
	// resetting useTextures variable
	useTextures = 0;
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}

function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
	// rotating eye position
    angle = angle - 10*dt;
    eye = vec3(25* Math.cos(radians(angle)), 5 ,25 *Math.sin(radians(angle)));

    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
	frames++;
	const time = Date.now();
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	
	/* printing frame rate */
	if(time > previous_t + 2000){
		let fps = ( frames * 1000 ) / (time - previous_t );
		frames = 0; //reset frame count
		console.log(fps);
		previous_t = time;
	}
	
	//activating and binding textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
	gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL);
	gl.uniform1i(gl.getUniformLocation(program, "texture2"), 1);
	
	// calling drawing functions
	gPush();
	{
		drawBackground();
	}
	gPop();
	gPush();
	{
		draw_world();
	}
	gPop();

	gPush();
	{
		gTranslate(-2.1, 0, 0);
		gRotate(45, 0, 1, 0); //rotating around y-axis by arbitrary values
		draw_tree();
	}
	gPop();
	gPush();
	{
		gTranslate(3, 0, -3);
		gRotate(78, 0, 1, 0);//rotating around y-axis by arbitrary values
		draw_tree();
	}
	gPop();
	gPush();
	{
		gTranslate(3.5, 0, 2.5);
		gRotate(35, 0, 1, 0);//rotating around y-axis by arbitrary values
		draw_tree();
	}
	gPop();
	gPush();
	{
		gTranslate(-3.25, 0, 2.5);
		gRotate(25, 0, 1, 0);//rotating around y-axis by arbitrary values
		draw_tree();
	}
	gPop();
	gPush();
	{
		gTranslate(-3.25, 0, -2.5);
		gRotate(25, 0, 1, 0);//rotating around y-axis by arbitrary values
		draw_tree();
	}
	gPop();

	gPush();
	{
		draw_clouds();
	}
	gPop();

    if( animFlag )
        window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}
