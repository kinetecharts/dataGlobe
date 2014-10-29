// "use strict";

var Drawing = Drawing || {};

Drawing.SphereGraph = function(options) {
  var bLeapOn = false;
  var options = options || {};

  //color fn and shaders from google globe JHE
  var colorFn = function(x) {
    var c = new THREE.Color();
    c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
    return c;
  };

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };
  // end shaders and colors from google globe JHE
  this.layout = options.layout || "2d";
  this.show_stats = options.showStats || false;
  this.show_info = options.showInfo || true;
  this.selection = options.selection || true;
  this.limit = options.limit || 10;

  var camera, controls, scene, renderer, interaction, geometry, object_selection;
  var stats;
  var graph = new Graph();

  var geometries = [];
  var info_text = {};
  var watched = {};
  setInterval(function(){
    watched = {};
  }, 5000)

  var sphere_radius = 4900;
  var max_X = 10000;
  var min_X = 10000;
  var max_Y = 10000;
  var min_Y = 10000;

  var that=this;

  /*
  Run the functions to make the graph and start the animation
  */
  init();
  //createGraph();
  animate();

  /*
  This function renders the globe
  */
  function init() {
    // Three.js initialization
    renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setSize( window.innerWidth, window.innerHeight );

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 100000);
    camera.position.z = 20000;
    canvas = document.body;
    clock = new THREE.Clock();


    control = new THREE.OrbitControls(camera);
    control.addEventListener( 'change', render );

    var controller;
    if(bLeapOn){
      controller = new Leap.Controller();

      controls = new THREE.LeapTrackballControls( camera , controller );
      //controls.addEventListener( 'drop', render );
      controls.rotationSpeed            = 1;
      controls.rotationDampening        = 2;
      controls.zoom                     = 40;
      controls.zoomDampening            = .6;
      controls.zoomCutoff               = .9;
      controls.zoomEnabled              = true;

      controls.minZoom                  = 20;
      controls.maxZoom                  = 80;

      control = new THREE.FlyControls(camera, canvas);
      control.dragToLook = false;
      control.autoForward = false;
      control.movementSpeed = 1000;
      control.rollSpeed = 0.5;
    }

    scene = new THREE.Scene();


/////////////////////////////////////////////////////////////////////////////////
    // a sun like light source and ambient light so all parts of globe are visible
    // adding a specular map turns the globe black without having lighting
    var sun = new THREE.DirectionalLight( 0xffffff , 0.8);
    sun.position.set(0.8, 0.3, -0.3 ).normalize();
    var ambientLight = new THREE.AmbientLight( 0x555555 );
    //add sphere geometry from google globe JHE
    var globeGeometry = new THREE.SphereGeometry(sphere_radius, 200, 100);
    // Adds bumps, shininess
    var globeMaterial  = new THREE.MeshPhongMaterial();
    globeMaterial.map    = THREE.ImageUtils.loadTexture('./img/earth_dark.jpg');
    globeMaterial.normalMap    = THREE.ImageUtils.loadTexture('./img/earth_normal.jpg');
    globeMaterial.bumpScale = 0.05;
    globeMaterial.specularMap = THREE.ImageUtils.loadTexture('./img/earth_specular.jpg');
    globeMaterial.specular = new THREE.Color(0x444444);

    var skyboxGeometry = new THREE.CubeGeometry(50000, 50000, 50000);
    var skyboxMaterial = new THREE.MeshBasicMaterial({
      map: THREE.ImageUtils.loadTexture('./img/bsg-stars.png')
      , side: THREE.BackSide });
    var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);

/////////////////////////////////////////////////////////////////////////////////
// clouds
    var tilt = 0.41;
    var rotationSpeed = 0.02;
    var cloudsScale = 1.005;

    var cloudTexture = THREE.ImageUtils.loadTexture('./img/clouds.png');
    var cloudGeometry = new THREE.SphereGeometry(sphere_radius+50, 200, 100);
    var materialClouds = new THREE.MeshLambertMaterial( { color: 0xffffff, map: cloudTexture, transparent: true } );

    meshClouds = new THREE.Mesh( cloudGeometry, materialClouds );
    meshClouds.scale.set( cloudsScale, cloudsScale, cloudsScale );
    meshClouds.rotation.z = tilt;
    setInterval(function(){
      meshClouds.rotation.z +=0.0001;
    },16)

    globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.rotation.y = Math.PI;
    scene.add(globe);
    scene.add( meshClouds );
    scene.add(sun);
    scene.add(ambientLight);

    geometry = new THREE.SphereGeometry( 50, 25, 0 );

    // Create node selection, if set
    if(that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
        selected: function(obj) {
          // console.log('selected');
          if(obj !== null && obj.fbId !== undefined) {
            console.log("selected: " + obj.fbId);
            info_text.select = obj.fbId; //get this ID in printInfo for display
          } else {
            delete info_text.select;
          }
        }
      });
    }

    document.body.appendChild( renderer.domElement );

    if(bLeapOn) controller.connect();

  }

  this.nodes = [];
  this.userNode;
  this.previousNode;
  this.addEdge = function(from, to, color, fade, width){
    width = width || 2;
    color = color || 'red';
    fade = fade || false;
    var fromNode;
    if(from === 'user'){
      fromNode = this.userNode;
    } else {
      fromNode = graph.getNode(from);
    }
    var toNode = graph.getNode(to);
    if(toNode === undefined){
      console.log('Node '+to +' not in the graph');
    } else {
      if(graph.addEdge(fromNode, toNode)){
        drawEdge(fromNode, toNode, color, fade, width);
      }
    }
  }
  /*
  goToNode is the function used to "fly to friends"
  */
  this.goToNode = function(id){
    console.log('WENT TO NODE');
    var node = graph.getNode(id);
    var finalX = node.position.x * 2.2;
    var finalY = node.position.y * 2.2;
    var finalZ = node.position.z * 2.2;

    var midX = (camera.position.x + finalX)/2*1.1;
    var midY = (camera.position.y + finalY)/2*1.1;
    var midZ = (camera.position.z + finalZ)/2*1.1;

    var vect1 = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
    var vect2 = new THREE.Vector3(midX, midY, midZ);
    var vect3 = new THREE.Vector3(finalX, finalY, finalZ);

    var curve = new THREE.QuadraticBezierCurve3();
    curve.v0 = vect1;
    curve.v1 = vect2;
    curve.v2 = vect3;

    var flyTo1 = curve.getPointAt(0.25);
    var flyTo2 = curve.getPointAt(0.5);
    var flyTo3 = curve.getPointAt(0.75);

    var tween = new createjs.Tween(camera.position)
    .to({x: flyTo1.x, y: flyTo1.y, z: flyTo1.z}, 300, createjs.Ease.linearInOut)
    .to({x: flyTo2.x, y: flyTo2.y, z: flyTo2.z}, 300, createjs.Ease.linearInOut)
    .to({x: flyTo3.x, y: flyTo3.y, z: flyTo3.z}, 300, createjs.Ease.linearInOut)
    .to({x: finalX, y: finalY, z: finalZ}, 300, createjs.Ease.linearInOut);

    camera.lookAt( scene.position );
    this.connectToUser(node);
    //$('.info-header').text(node.data.name);
  }

  this.connectToUser = function(node){
    if(this.userNode){
      if(graph.addEdge(node, this.userNode)){
        drawEdge(node, this.userNode, 'blue', true);
      }
    }
  }

  this.getCurrent = function(){
    return this.previousNode;
  }


  this.getNode = function(id){
    return graph.getNode(id);
  }

  this.createGraph = function(current, isUser) {
      //only add if lat and lon are not null
    if(current.longitude !== null && current.latitude !== null){
      //make a new node object
      var node = new Node(current.fbId);
      //set position of node object to equal lat/lon of datum
      node.position.x = current.latitude;
      node.position.y = current.longitude;
      node.data.name = current.name;
      if(isUser){
        this.userNode = node;
      }
      //add and render node
      graph.addNode(node);
      drawNode(node);


      this.nodes.push(node);
      return node;
    }
  };

  this.displace=function(pos, R){
    var p = new THREE.Vector3(pos.x, pos.y, pos.z);
    var v = p.clone();
    v.x += R * (Math.random()-0.5);
    v.y += R * (Math.random()-0.5);
    v.z += R * (Math.random()-0.5);
    var scale = p.length()/v.length();
    v.multiplyScalar(scale); // put v to the globe 
    return v;
  };

  this.addPost = function(id, post, context){
    var postData = {story: post.story, message: post.message, picture: post.picture};
    var source = context.getNode(id);
    var node = new Node(post.id);
    // node.position.x = source.position.x * (Math.random()*3);
    // node.position.y = source.position.y * (Math.random()*3);
    // node.position.z = source.position.z * (1 + Math.random());
    var newPos = this.displace(source.position, 3000);
    node.position.x = newPos.x;
    node.position.y = newPos.y;
    node.position.z = newPos.z;

    node.data.post = postData;
    graph.addNode(node);
    drawPost(source, node, context);
    return node;
  }

  this.createLayout = function(){
    var layout_options = {};
    layout_options.width = 2000;
    layout_options.height = 2000;
    layout_options.iterations = 100000;
    layout_options.layout = "3d";
    layout_options.positionUpdated = function(node) {
      max_X = Math.max(max_X, node.position.x);
      min_X = Math.min(min_X, node.position.x);
      max_Y = Math.max(max_Y, node.position.y);
      min_Y = Math.min(min_Y, node.position.y);

      node.data.draw_object.position.x = Math.random() * max_X;
      node.data.draw_object.position.y = Math.random() * max_Y;
      node.data.draw_object.position.z = Math.random() * max_X;
    }

    graph.layout = new Layout.ForceDirected(graph, layout_options);
    graph.layout.init();
    graph.layout.generate();
  }

  this.addUser = function(user, connect){
    connect = connect || false;
    var userNode = new Node(user.fbId);
    //set new position of user node to equal user lon and lat
    userNode.position.x = user.latitude;
    userNode.position.y = user.longitude;
    //add user node to graph
    graph.addNode(userNode);
    //draw user node on globe
    drawNode(userNode);
    //set global "usernode" to equal the rendered user node
    this.userNode = userNode;
    if(connect){
      var currentNode;
      for(var i=0; i<graph.nodes.length; i++){
        currentNode = graph.nodes[i];
        if(graph.addEdge(this.userNode, currentNode)){
          drawEdge(this.userNode, currentNode, 'blue');
        }
      }
    }
  }

  // Create a node object and add it to the scene.

  function drawNode(node) {
    //make a new sphere object

    //convert lat and lon to x/y coordinates on a sphere
    var phi = (90 - node.position.x) * Math.PI / 180;
    var theta = (180 - node.position.y) * Math.PI / 180;
    node.position.x = sphere_radius * Math.sin(phi) * Math.cos(theta);
    node.position.y = sphere_radius * Math.cos(phi);
    node.position.z = sphere_radius * Math.sin(phi) * Math.sin(theta);

    var ball = new THREE.SphereGeometry(10, 10, 10);
    material = new THREE.MeshBasicMaterial({ color: 'red' });
    // material.map = THREE.ImageUtils.loadTexture('./img/person.gif');
    draw_object = new THREE.Mesh(ball, material);
    draw_object.position.set(node.position.x*1.02, node.position.y*1.02,node.position.z*1.02);

    //this code stays the same, I use the fbId to get friend data on mouseover
    draw_object.fbId = node.id;
    draw_object.name = node.data.name

    node.data.draw_object = draw_object;
    node.layout = {}
    node.layout.max_X = 90;
    node.layout.min_X = -90;
    node.layout.max_Y = 180;
    node.layout.min_Y = -180;

    node.data.draw_object.lookAt(scene.position);
    scene.add( node.data.draw_object );
  }

  function drawPost(source, node, context) {

    var ball = new THREE.SphereGeometry(20, 10, 10);
    material = new THREE.MeshBasicMaterial({ color: 'yellow' });
    draw_object = new THREE.Mesh(ball, material);
    draw_object.position.set(source.position.x, source.position.y, source.position.z);
    draw_object.fbId = node.id;
    draw_object.name = node.data.name
    node.data.draw_object = draw_object;
    scene.add( node.data.draw_object );
    node.data.draw_object.lookAt(scene.position);

    var finalX = node.position.x;
    var finalY = node.position.y;
    var finalZ = node.position.z;

    var midX = (node.data.draw_object.position.x + finalX)/2*1.1;
    var midY = (node.data.draw_object.position.y + finalY)/2*1.1;
    var midZ = (node.data.draw_object.position.z + finalZ)/2*1.1;

    var vect1 = new THREE.Vector3(node.data.draw_object.position.x, node.data.draw_object.position.y, node.data.draw_object.position.z);
    var vect2 = new THREE.Vector3(midX, midY, midZ);
    var vect3 = new THREE.Vector3(finalX, finalY, finalZ);

    var curve = new THREE.QuadraticBezierCurve3();
    curve.v0 = vect1;
    curve.v1 = vect2;
    curve.v2 = vect3;

    var flyTo1 = curve.getPointAt(0.25);
    var flyTo2 = curve.getPointAt(0.5);
    var flyTo3 = curve.getPointAt(0.75);

    var tween = new createjs.Tween(node.data.draw_object.position)
    .to({x: flyTo1.x, y: flyTo1.y, z: flyTo1.z}, 300, createjs.Ease.linearInOut)
    .to({x: flyTo2.x, y: flyTo2.y, z: flyTo2.z}, 300, createjs.Ease.linearInOut)
    .to({x: flyTo3.x, y: flyTo3.y, z: flyTo3.z}, 300, createjs.Ease.linearInOut)
    .to({x: finalX, y: finalY, z: finalZ}, 300, createjs.Ease.linearInOut).call(function(){
      context.postPieces(node);
      context.addEdge(source.id, node.id, 'yellow',true, 0.5);
    })

    //this code stays the same, I use the fbId to get friend data on mouseover
    node.layout = {}
    node.layout.max_X = 90;
    node.layout.min_X = -90;
    node.layout.max_Y = 180;
    node.layout.min_Y = -180;

    node.data.draw_object.material.transparent = true;
    createjs.Tween.get(node.data.draw_object.material).wait(5000).to({opacity: 0}, 5000).call(function(){
      scene.remove(node.data.draw_object);
    });
  }

  // this function makes the "pieces" i.e. text or photos of a post fly out of the post sphere
  // when it reaches its resting spot
  this.postPieces = function(node){
    var pos = camera.position;
    var rnd = Math.random;
    var data = node.data.post;
    var onComplete = function(object){
      scene.remove(object);
      renderer.render( scene, camera );
    }
    var text = data.message || data.story;
    if(text !== undefined) {
      var text = text.removeStopWords().split(' ').slice(0, 30); // Weidong: set maximum to 20 pieces
      for(var i = 0; i < text.length; i++){
        if(text[i].toLowerCase() !== 'the'){
          var materialFront = new THREE.MeshBasicMaterial( { color: 'white' } );
          var textGeom = new THREE.TextGeometry( text[i], {
            size: 30, height: 4, curveSegments: 3,
            font: "helvetiker", weight: "bold", style: "normal",
            bevelEnabled: false, material: 0
            });

          var textMesh = new THREE.Mesh(textGeom, materialFront );

          textGeom.computeBoundingBox();
          var textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;

          textMesh.position.set( node.position.x, node.position.y, node.position.z );
          textMesh.lookAt(camera.position);
          textMesh.data = 'TEXT';
          scene.add(textMesh);
          var toPos = this.displace(pos, 3000);
          createjs.Tween.get(textMesh.position)
            .to({x: toPos.x, y: toPos.y, z: toPos.z}, 10000).call(onComplete, [textMesh]);
          // createjs.Tween.get(textMesh.position).to({x: pos.x*(2+rnd()), y: pos.y*(2+rnd()), z: pos.z*(2+rnd())}, 15000).call(onComplete, [textMesh]);
        }
      }
    }
    if(data.picture){
      var texture = new Image();
      texture.crossOrigin = "anonymous";
      texture.onload = function(){
        var material = new THREE.MeshBasicMaterial( { map: new THREE.Texture(texture), side:THREE.DoubleSide, transparent: true } );
        material.opacity = 0.7;
        var imageGeometry = new THREE.PlaneGeometry(texture.width, texture.height, 1, 1);
        var image = new THREE.Mesh(imageGeometry, material);
        image.position.set( node.position.x,node.position.y,node.position.z );

        image.material.map.needsUpdate = true;
        image.lookAt(camera.position);
        scene.add(image);
        createjs.Tween.get(image.position)
        .to({x: pos.x*(1+rnd()), y: pos.y*(1+rnd()), z: pos.z*(1+rnd())}, 8000)
        .call(onComplete, [image]);
      }
      texture.src = data.picture;
    }
  }

  this.displayPhoto = function(data, node){
    var onComplete = function(object){
      scene.remove(object);
      // TODO: Note: check what happens with and without render call
      // renderer.render( scene, camera );
    }
    var pos = camera.position;
    var rnd = Math.random;
    var texture = new Image();
    texture.crossOrigin = "anonymous";
    texture.onload = function(){
      var material = new THREE.MeshBasicMaterial( { map: new THREE.Texture(texture), side:THREE.DoubleSide, transparent: true } );
      material.opacity = 0.7;
      var imageGeometry = new THREE.PlaneGeometry(texture.width, texture.height, 1, 1);
      var image = new THREE.Mesh(imageGeometry, material);
      image.position.set( node.position.x,node.position.y,node.position.z );
      image.material.map.needsUpdate = true;
      image.lookAt(camera.position);
      scene.add(image);
      createjs.Tween.get(image.position)
      .to({x: pos.x*(0.9+(rnd()*0.4)), y: pos.y*(0.9+(rnd()*0.4)), z: pos.z*(0.9+(rnd()*0.4))}, 8000)
      .call(onComplete, [image]); // Tween hijacked .call() -> .call( callback, parameter )
    }
    texture.src = data.picture;
  }

  // Create an edge object (line) and add it to the scene.
  function drawEdge(source, target, color, fade, width) {
    fade = fade || false;
    //var distance = latlonDistance(source.position, target.position);
    var multiplier = 2.0;

    //make a 3js line object
    material = new THREE.LineBasicMaterial( { color: 0xCCCCCC, opacity: 0.5, linewidth: width } );

    //cache the coordinates of the source and target nodes
    var sourceXy = source.position;
    var targetXy = target.position;

    //get averages (mid-point) between coordinates of source and target
    var AvgX = (sourceXy['x'] + targetXy['x'])/2;
    var AvgY = (sourceXy['y'] + targetXy['y'])/2;
    var AvgZ = (sourceXy['z'] + targetXy['z'])/2;
    //get difference between source and target
    var diffX = Math.abs(sourceXy['x'] - targetXy['x']);
    var diffY = Math.abs(sourceXy['y'] - targetXy['y']);
    //set middle point to average(x/y) and average(z + sum of difference(x/y))
    var middle = [ AvgX * multiplier, AvgY * multiplier, AvgZ * multiplier ];

    //make quadratic bezier out of the three points
    var curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sourceXy['x'], sourceXy['y'], sourceXy['z']), new THREE.Vector3(middle[0], middle[1], middle[2]), new THREE.Vector3(targetXy['x'], targetXy['y'], targetXy['z']));

    //make a curve path and add the bezier curve to it
    var path = new THREE.CurvePath();
    path.add(curve);

    //create material for our line
    var curveMaterial = new THREE.LineBasicMaterial({
      color: color, linewidth: 2, transparent: true
    });

    //create curved line and add to scene
    curvedLine = new THREE.Line(path.createPointsGeometry(100), curveMaterial);
    curvedLine.lookAt(scene.position);
    var onComplete = function(curvedLine){
      scene.remove(curvedLine);
      renderer.render( scene, camera );
    }
    if(fade){
      curvedLine.material.transparent = true;
      createjs.Tween.get(curvedLine.material).wait(5000).to({opacity: 0}, 5000).call(onComplete, [curvedLine]);
    }
    scene.add(curvedLine);
  }

  // moves the camera away for post explosion
  this.moveOut = function(){
    // ***** maybe keep a boolean to check if the camera has already moved out
    //var newPos = {x: camera.position.x*1.4, y: camera.position.y*1.25, z: camera.position.z*1.3};
    //createjs.Tween.get(camera.position).to(newPos, 4000);
  }

  function animate() {
    if(bLeapOn){
      controls.update();
      controls.object.matrixAutoUpdate = true;
    }

    var dt = clock.getDelta();
    control.update(dt)

    // console.log(camera.position.x);
    // console.log(camera.position.y);
    // console.log(camera.position.z);

    render();
    if(that.show_info) {
      printInfo();
    }
    requestAnimationFrame( animate );

  }

  function render() {
    // Generate layout if not finished
    if(graph.layout){
      if(!graph.layout.finished) {
        graph.layout.generate();
      }
    }

    // Update position of lines (edges)
    for(var i=0; i<geometries.length; i++) {
      geometries[i].verticesNeedUpdate = true;
    }

    // set lookat of nodes to camera
    for(var i=0; i<graph.nodes.length; i++) {
      // graph.nodes[i].data.draw_object.lookAt(camera.position);
    }

    // render selection
    if(that.selection) {
      object_selection.render(scene, camera);
    }

    // render scene
    renderer.render( scene, camera );
  }

  var bAllowPrintInfo = true;
  var pauseAllowPrintInfo = function(){
    bAllowPrintInfo = false;
    setTimeout(function(){bAllowPrintInfo = true;}, 5000);
  };

  function printInfo(text) {
    // console.log('in printInfo: '+ text);
    var str = '';
    for(var index in info_text) {
      if(str != '' && info_text[index] != '') {
        str += " - ";
      }
      str += info_text[index];
    }
    if(!watched[str]){
      watched[str] = true;
      var fbId = parseInt(str);
      if(bAllowPrintInfo && str !== ""){
          console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
          // getPic(fbId);
          goToRelay(fbId);
          postExplosion(fbId);
          pauseAllowPrintInfo();
        }
      }
    }

  function findElement(tree, str){
    var result = false;
    for(var i = 0; i < tree.length; i++){
      if(tree[i].textContent === str){
        result = true;
      }
    }
    return result;
  }
}
