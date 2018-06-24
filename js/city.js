const Colors = {
	red:0xf25346,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
};
const screen = { width: 1024, height: 768 };
const texturesPath = "textures/";

let skyboxMaterial, skyboxTextures, floorTexture;
let texturesReady = false;
let light_point;

////////////////////////////////////////////////////////////////////////
//// Scene objects definition: cars.

function CarObject(startAt, direction, speed, color){
    return {
        obj: null,
        position: {z : startAt.z, x: startAt.x, y: startAt.y},
        startAt: {z : -startAt.z, x: -startAt.x, y: startAt.y},
        direction : direction,
        speed: speed,
        color : (color) ? color : 0xff9500
    };
}

/**
 * Car specifications: 10 different cars in different positions.
 */
const cars = [  CarObject({ z: 200, x: 80,   y: 150    }, "z", 10, 0xff00e0),
                CarObject({ z: 200, x: 110,  y: 150*1  }, "z", 15, 0x418254),
                CarObject({ z: -180, x: 70,   y: 250    }, "z", 10, 0xff00e0),
                CarObject({ z: -180, x: 140,  y: 100*1  }, "z", 15, 0x418254),
                CarObject({ z: 400, x: 100 , y: 150    }, "z", 35, 0xfff000),
                CarObject({ z: 400, x: 100 , y: 280   }, "z", 15, 0xfff000),
                CarObject({ z: 600, x: 120 , y: 280   }, "z", 25, 0x418254),  
                CarObject({ z: -600, x: 180, y: 250    }, "z", 35, 0x000000),
                CarObject({ z: 350, x: -450 , y: 250   }, "x", 10, 0xb400ff),
                CarObject({ z: 300, x:  450 , y: 250   }, "x", 45, 0x418254),
                CarObject({ z: 300, x: -450 , y: 350   }, "x", 15, 0xfff000)
            ];

////////////////////////////////////////////////////////////////
/// Initialization
function init() {
    console.log("Initialization...");

    console.log("Loading textures...");
    loadTextures();

    console.log("Loading scene...");
    loadScene(window.innerWidth, window.innerHeight);
}


/////////////////////////////////////////////////////////////////
/// Animation
function animate(){
    // animate objects
    console.log("Animate");
    cars.forEach((car,nth) => {
        if (car.obj && car.obj!=null){
          if (car.direction == 'z'){
            car.position.z = (car.position.z < -600 ||car.position.z > 600) ? -car.startAt.z : car.position.z - car.speed;
          }else {
            car.position.x = (car.position.x < -700 ||car.position.x > 700) ? car.startAt.x : car.position.x + car.speed;
          }
          car.obj.position.z = car.position.z;
          car.obj.position.x = car.position.x;
          car.obj.position.y = car.position.y;
        }
    });
}

/////////////////////////////////////////////////////////////////
/// Textures
function loadTextures()
{
    // skybox textures
    const skyboxPlanes = ["posx.jpg", "negx.jpg", "posy.jpg", "negy.jpg", "posz.jpg", "negz.jpg"];
    const buildings = ["build1.jpg", "build2.jpg", "build3.jpg"];
    const buildingsNormals = ["map1.jpg", "map2.jpg", "map3.jpg"];
    skyboxTextures   = THREE.ImageUtils.loadTextureCube(skyboxPlanes.map( x => texturesPath + "skybox/" + x));
    floorTexture     = THREE.ImageUtils.loadTexture(texturesPath + "skybox/"+ "floor2.jpg");

    // buildings textures
    buildingTextures = buildings.map( x => THREE.ImageUtils.loadTexture(texturesPath + "buildings/" + x));
    buildingNormals = buildingsNormals.map( x => THREE.ImageUtils.loadTexture(texturesPath + "buildings/" + x));
    texturesReady = true;
}

let now = 0, msecs = 0;

/////////////////////////////////////////////////////////////////
/// Controls definition
function displayControls(controls){

    var gui = new dat.GUI();
    var f1 = gui.addFolder('Camera');
    var controlx = f1.add(controls, 'camerax', -900,900).onChange(controls.updateCamx);
    var controly = f1.add(controls, 'cameray', -900,900).onChange(controls.updateCamy);
    var controlz = f1.add(controls, 'cameraz', -900,900).onChange(controls.updateCamz);
    f1.add(controls, 'cualcamera', {Perspective: 0, Ortographic: 1});
    
    var f2 = gui.addFolder('Colors');
    f2.addColor(controls, 'colormesh').onChange(controls.updateMat);
    f2.addColor(controls, 'colorlight').onChange(controls.updateLight);;
    
    var f3 = gui.addFolder('Point Light position');
    f3.add(controls, 'poslight_x', -900,900);
    f3.add(controls, 'poslight_y', -900,900);
    f3.add(controls, 'poslight_z', -900,900);
    f1.open();
    f2.open();
    f3.open();
    return {
      x: controlx,
      y: controly, 
      z: controlz
    };
}


/////////////////////////////////////////////////////////////////
/// Loading the main scene
function loadScene(w, h){
    
    let controls = new function(){
        this.camerax = 200;
        this.cameray = 200;
        this.cameraz = 600;
        this.camerax_prev = 200;
        this.cameray_prev = 200;
        this.cameraz_prev = 600;
        this.colormesh = 0xff0000;
        this.colorlight = 0xffffff;
        this.color2 = 0x0000ff;
        this.poslight_x = 0;
        this.poslight_y = 200;
        this.poslight_z = 300;
        this.wireframe = false;
        this.cualcamera = 0;
        
        this.updateMat = function (e){
          skyboxMaterial.color = new THREE.Color(e);
          needsUpdate = true;
        }
        this.updateLight = function (e){
            light_point.color = new THREE.Color(e);			
        }
        this.updateCamx = function (e){
          cameras.forEach(camera => {
            
            camera.position.x = e;  
          });
        }
        this.updateCamy = function (e){
          cameras.forEach(camera => {
            if (e < 287) {
                camera.position.x = e;  
            }
          });
        }
        this.updateCamz = function (e){
          cameras.forEach(camera => {
            camera.position.z = e;  
          });
        }
      };

    /////////////////////////////////////////////////////////////////
    /// Scene renderer
    let renderer = new THREE.WebGLRenderer({ 
        // Allow transparency to show the gradient background
        // we defined in the CSS
        alpha: true, 

        // Activate the anti-aliasing; this is less performant,
        // but, as our project is low-poly based, it should be fine :)
        antialias: true 
    });
    renderer.setSize(screen.width,screen.height); 
    document.body.appendChild(renderer.domElement);
    renderer.setClearColor(0xEEEEEE);

    /////////////////////////////////////////////////////////////////
    /// Scene creation
    let scene = new THREE.Scene();


    /////////////////////////////////////////////////////////////////
    /// Camera / controls   
    ///
    // Create a camera and set it into world space
    // This camera will provide a perspective projectiom
    
    let skyboxCamera = new THREE.PerspectiveCamera(75, w/h, 0.1, 3000); // skybox camera
    skyboxCamera.position.set(controls.camerax, controls.cameray, controls.cameraz);
    let cityCamera   = new THREE.OrthographicCamera(-screen.width/2 , screen.width/2, screen.height/2, -screen.height/2, 0.1, 1200);
    cityCamera.position.set(controls.camerax, controls.cameray, controls.cameraz);

    // Create the controller to move camera with mouse
    let mouseControls = new THREE.TrackballControls(skyboxCamera, renderer.domElement);
    mouseControls.staticMoving = true;
    mouseControls.dynamicDampingFactor = 0.3; 

    // Controller display
    let control = displayControls(controls);

    // Añadimos los ejes de coordenadas
    //let axes = new THREE.AxisHelper( 500 );
    //scene.add(axes);

    ////////////////////////////////////////////////////////////////////////////////////
    //// Skybox
    ////
    let skyboxShader = THREE.ShaderLib[ "cube" ];
    skyboxShader.uniforms[ "tCube" ].value = skyboxTextures;
    skyboxMaterial = new THREE.ShaderMaterial( {
        fragmentShader: skyboxShader.fragmentShader,
        vertexShader: skyboxShader.vertexShader,
        uniforms: skyboxShader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    let skycube = new THREE.Mesh(new THREE.BoxGeometry( 2048, 2500, 2048 ), skyboxMaterial);
	scene.add(skycube);

    let materialFloor = new THREE.MeshBasicMaterial( { map : floorTexture } );
    let floor = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2048, 2048 ), materialFloor );
    floor.position.y = - 200;
    floor.rotation.x = - Math.PI/2;
    scene.add(floor);
 
    ////////////////////////////////////////////////////////////////////////////////////
    //// Light context
    light_point = new THREE.PointLight(controls.colorlight, 1);
	let sunMaterial = new THREE.MeshBasicMaterial({color: 'yellow'});
    let sunGeometry = new THREE.SphereGeometry(10, 216, 8);
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.add(light_point);
    sun.position.set(controls.poslight_x, controls.poslight_y, controls.poslight_z);
    scene.add(sun);

    // Ambient color
    let ambiColor = "#0c0c0c";
    let ambientLight = new THREE.AmbientLight(ambiColor);
    scene.add(ambientLight);

    // Fog
    scene.fog = new THREE.Fog(0x3a5c66, 710, 1950);
    
    let generateTexture = function() {
        
        let baseTexture = document.createElement('canvas');
        baseTexture.width  = 32;
        baseTexture.height = 64;

        let context = baseTexture.getContext( '2d' );
        context.fillStyle = '#a0523b';
        context.fillRect(0, 0, 32, 64 );

        // draw the window rows - with a small noise to simulate light variations in each room
        for(let y = 2; y < 64; y += 2 ){
            for(let x = 0; x < 32; x += 2 ){
                let value = Math.floor( Math.random() * 55 );
                context.fillStyle = 'rgb(' + [230+value, 225+value, 95+value].join( ',' )  + ')';
                context.fillRect( x, y, 1.5, 1 );
            }
        }
      
        // build a bigger canvas and copy the small one in it
        // This is a trick to upscale the texture without filtering
        let canvasTexture = document.createElement( 'canvas' );
        canvasTexture.width    = 512;
        canvasTexture.height   = 1024;

        context = canvasTexture.getContext( '2d' );
        context.imageSmoothingEnabled        = false; // disable smoothing
        context.webkitImageSmoothingEnabled  = false;
        context.mozImageSmoothingEnabled     = false;

        // then draw the image
        context.drawImage(baseTexture, 0, 0, canvasTexture.width, canvasTexture.height );

        // generate the texture
        let texture = new THREE.Texture(canvasTexture);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
      }

    ////////////////////////////////////////////////////////////////////////////////////
    //// Building layout
    let addBuilding = function(nth, dimension, position){
        let type = (nth % 4) + 1;
        let heigth = dimension.h + Math.ceil(Math.random()* dimension.h * 0.5);
        let box_geo = new THREE.BoxGeometry(dimension.w, heigth, dimension.d);

        let box_mat;
        if (type > 3) {
            box_mat = new THREE.MeshPhongMaterial( { map: generateTexture(), vertexColors: THREE.VertexColors });
        }else{
            box_mat = new THREE.MeshPhongMaterial( { map : buildingTextures[type - 1], normalMap: buildingNormals[type - 1]} );
        }

        // Black roofs
        const BLACK_PIXEL = 0.0;
        box_geo.faceVertexUvs[0][4][0] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        box_geo.faceVertexUvs[0][4][1] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        box_geo.faceVertexUvs[0][4][2] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        box_geo.faceVertexUvs[0][5][0] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        box_geo.faceVertexUvs[0][5][1] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        box_geo.faceVertexUvs[0][5][2] = new THREE.Vector2(BLACK_PIXEL, BLACK_PIXEL);
        
        let mesh =  new THREE.Mesh(box_geo, box_mat);
        mesh.position.x = position.x - dimension.w/2;
        mesh.position.z = position.z - dimension.d/2;
        mesh.position.y = heigth/2 - 210;
        if (dimension.r == true){
            mesh.rotation.x = - Math.PI*2;
        }
        return mesh;
    };

    let type = () => Math.floor(Math.random() * (4 - 1 + 1)) + 1;
    let dimensions = [  { w:100, h: 250, d: 100, r: true},
                        { w: 80, h: 450, d: 80  },
                        { w:100, h: 200, d: 100 },
                        { w: 50, h: 300, d: 50, r: true}];

    for (let i = -8; i < 10; i++){
        for (let j = -8; j < 10; j++) {
            if (j!=1 && j!=2 && i!=4 && i!=-5 && i!=3 && j!=6 && j!=9){
                let n = type() - 1;
                scene.add(addBuilding(n, dimensions[n], {x: j*120, y:0,z:i*120}));
            }
        }
    }

    /////////////////////////////////////////////////////////////////
    /// Setting initial position of objects
    let objectsLoader = new THREE.OBJLoader()
    cars.forEach((car,nth) => {
        objectsLoader.load(
          'objects/car.obj',
          function (mesh) {
            car.obj = mesh;
            let material = new THREE.MeshLambertMaterial({color: car.color}); 
            car.obj.children.forEach(function (child) {
              child.material = material;
              child.geometry.computeFaceNormals();
              child.geometry.computeVertexNormals();
            });
            car.obj.scale.set(0.5,0.2,0.5);
            
            car.obj.position.set(car.position.x,  car.position.z, car.position.y /*215*nth*/);
            if (car.direction == "z") {
              car.obj.rotation.y = Math.PI / 2;
            }
            scene.add(car.obj );
          },
        );
    });


    function render() { 

		mouseControls.update();
        sun.position.set(controls.poslight_x, controls.poslight_y, controls.poslight_z);
        
		// Feedback of GUI with camera position set by TrackballControls
        if (controls.camerax_prev != skyboxCamera.position.x){
            controls.camerax = skyboxCamera.position.x;
            controls.camerax_prev = skyboxCamera.position.x;
            control.x.updateDisplay();
        }
        if (controls.cameray_prev != skyboxCamera.position.y){
            controls.cameray = skyboxCamera.position.y;
            controls.cameray_prev = skyboxCamera.position.y;
            control.y.updateDisplay();
        }
        if (controls.cameraz_prev != skyboxCamera.position.z){
            controls.cameraz = skyboxCamera.position.z;
            controls.cameraz_prev = skyboxCamera.position.z;
            control.z.updateDisplay();
        }
        
        requestAnimationFrame(render);

        if (controls.cualcamera == 0){
            skyboxCamera.lookAt(scene.position);
            if (texturesReady) renderer.render( scene, skyboxCamera );
        }else {
            cityCamera.lookAt(scene.position);
            if (texturesReady) renderer.render( scene, cityCamera );
        }
    
        now = Date.now();
        if (now - msecs > 200) {
            msecs = now;
            if (texturesReady) 
                animate();
        }
    }
    render();
}
