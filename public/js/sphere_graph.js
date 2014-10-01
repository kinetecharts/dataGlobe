/**
  @author David Piegza

  Implements a sphere graph drawing with force-directed placement.

  It uses the force-directed-layout implemented in:
  https://github.com/davidpiegza/Graph-Visualization/blob/master/layouts/force-directed-layout.js

  Drawing is done with Three.js: http://github.com/mrdoob/three.js

  To use this drawing, include the graph-min.js file and create a SphereGraph object:

  <!DOCTYPE html>
  <html>
    <head>
      <title>Graph Visualization</title>
      <script type="text/javascript" src="path/to/graph-min.js"></script>
    </head>
    <body onload="new Drawing.SphereGraph({showStats: true, showInfo: true})">
    </bod>
  </html>

  Parameters:
  options = {
    layout: "2d" or "3d"

    showStats: <bool>, displays FPS box
    showInfo: <bool>, displays some info on the graph and layout
              The info box is created as <div id="graph-info">, it must be
              styled and positioned with CSS.


    selection: <bool>, enables selection of nodes on mouse over (it displays some info
               when the showInfo flag is set)


    limit: <int>, maximum number of nodes

    numNodes: <int> - sets the number of nodes to create.
    numEdges: <int> - sets the maximum number of edges for a node. A node will have
              1 to numEdges edges, this is set randomly.
  }


  Feel free to contribute a new drawing!

 */


var Drawing = Drawing || {};

Drawing.SphereGraph = function(options) {
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
    // control = new THREE.OrbitControls(camera);
    control = new THREE.FlyControls(camera, canvas);
    control.dragToLook = false;
    control.autoForward = false;
    control.movementSpeed = 1000;
    control.rollSpeed = 0.5;
    // control.addEventListener( 'change', render );

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

// // stars

// var star_index, star_raid = sphere_radius, starsGeometry = [ new THREE.Geometry(), new THREE.Geometry() ];

// for ( star_index = 0; star_index < 250; star_index ++ ) {

//   var vertex = new THREE.Vector3();
//   vertex.x = Math.random() * 2 - 1;
//   vertex.y = Math.random() * 2 - 1;
//   vertex.z = Math.random() * 2 - 1;
//   vertex.multiplyScalar( star_raid );

//   starsGeometry[ 0 ].vertices.push( vertex );

// }

// for ( star_index = 0; star_index < 1500; star_index ++ ) {

//   var vertex = new THREE.Vector3();
//   vertex.x = Math.random() * 2 - 1;
//   vertex.y = Math.random() * 2 - 1;
//   vertex.z = Math.random() * 2 - 1;
//   vertex.multiplyScalar( star_raid );

//   starsGeometry[ 1 ].vertices.push( vertex );

// }

// var stars;
// var starsMaterials = [
//   new THREE.PointCloudMaterial( { color: 0x555555, size: 2, sizeAttenuation: false } ),
//   new THREE.PointCloudMaterial( { color: 0x555555, size: 1, sizeAttenuation: false } ),
//   new THREE.PointCloudMaterial( { color: 0x333333, size: 2, sizeAttenuation: false } ),
//   new THREE.PointCloudMaterial( { color: 0x3a3a3a, size: 1, sizeAttenuation: false } ),
//   new THREE.PointCloudMaterial( { color: 0x1a1a1a, size: 2, sizeAttenuation: false } ),
//   new THREE.PointCloudMaterial( { color: 0x1a1a1a, size: 1, sizeAttenuation: false } )
// ];

// for ( star_index = 10; star_index < 30; star_index ++ ) {

//   stars = new THREE.PointCloud( starsGeometry[ star_index % 2 ], starsMaterials[ star_index % 6 ] );

//   stars.rotation.x = Math.random() * 6;
//   stars.rotation.y = Math.random() * 6;
//   stars.rotation.z = Math.random() * 6;

//   s = star_index * 10;
//   stars.scale.set( s, s, s );

//   stars.matrixAutoUpdate = false;
//   stars.updateMatrix();
//   scene.add( stars );

// }

/////////////////////////////////////////////////////////////////////////////////
    // shader = Shaders['earth'];
    // uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    // uniforms['texture'].value = THREE.ImageUtils.loadTexture('./img/world.jpg');

    // material = new THREE.ShaderMaterial({

    //       uniforms: uniforms,
    //       vertexShader: shader.vertexShader,
    //       fragmentShader: shader.fragmentShader

    //     });

    globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.rotation.y = Math.PI;
    scene.add(globe);
    scene.add( meshClouds );
    scene.add(sun);
    scene.add(ambientLight);

    // end sphere geom JHE

    // scene.add(new THREE.AxisHelper(9000));

    // Create node geometry (will be used in drawNode())
    geometry = new THREE.SphereGeometry( 50, 25, 0 );

    // Create node selection, if set
    if(that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
        selected: function(obj) {
          console.log(obj);
          if(obj != null && obj.fbId !== undefined) {
            info_text.select = obj.fbId; //get this ID in printInfo to display shiz
          } else {
            delete info_text.select;
          }
        }
      });
    }

    document.body.appendChild( renderer.domElement );

    // Stats.js
    // if(that.show_stats) {
    //   stats = new Stats();
    //   stats.domElement.style.position = 'absolute';
    //   stats.domElement.style.top = '0px';
    //   document.body.appendChild( stats.domElement );
    // }
  }

  this.nodes = [];
  this.userNode;
  this.previousNode;
  this.addEdge = function(from, to, color, fade){
    color = color || 'red';
    fade = fade || false;
    console.log(from);
    console.log(to);
    var fromNode = graph.getNode(from);
    var toNode = graph.getNode(to);
    if(graph.addEdge(fromNode, toNode)){
      drawEdge(fromNode, toNode, 'red', color, fade);
    }
  }
  /*
  goToNode is the function used to "fly to friends"
  */
  this.goToNode = function(id){
    var node = graph.getNode(id);
    var x = node.position.x * 2.2;
    var y = node.position.y * 2.2;
    var z = node.position.z * 2.2;
    createjs.Tween.get(camera.position).to({x: x, y: y, z: z}, 1000, createjs.Ease.sineInOut)
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

/*
getNode allows you to get graph nodes from the client
*/
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
    }
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

var latlonDistance = function(a, b){
  var lat1 = a.x;
  var lon1 = a.y;
  var lat2 = b.x;
  var lon2 = b.y;
  var R = 4900; // km
  var φ1 = lat1.toRadians();
  var φ2 = lat2.toRadians();
  var Δφ = (lat2-lat1).toRadians();
  var Δλ = (lon2-lon1).toRadians();

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  var d = R * c;
  return Math.round(d);
}

Number.prototype.toRadians = function(){
  return this * Math.PI / 180;
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


  /**
   *  Create a node object and add it to the scene.
   */

  function drawNode(node) {
    //make a new sphere object

    //convert lat and lon to x/y coordinates on a sphere
    var phi = (90 - node.position.x) * Math.PI / 180;
    var theta = (180 - node.position.y) * Math.PI / 180;
    node.position.x = sphere_radius * Math.sin(phi) * Math.cos(theta);
    node.position.y = sphere_radius * Math.cos(phi);
    node.position.z = sphere_radius * Math.sin(phi) * Math.sin(theta);

    //The original lines were made with this code:

    var line = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial({  color: 'white', linewidth: 1 })
    line.vertices.push(new THREE.Vector3(node.position.x*0, node.position.y*0, node.position.z*0));
    line.vertices.push(new THREE.Vector3(node.position.x*1.05, node.position.y*1.05, node.position.z*1.05));
    var draw_object = new THREE.Line( line, material );
    

    //I changed it to this code to make the friends into red spheres:
    // var ball = new THREE.SphereGeometry(20, 10, 10);
    // material = new THREE.MeshBasicMaterial({ color: 'red' });
    // draw_object = new THREE.Mesh(ball, material);
    // draw_object.position.set(node.position.x*1.02, node.position.y*1.02,node.position.z*1.02);

    //this code stays the same, I use the fbId to get friend data on mouseover
    draw_object.fbId = node.id;
    draw_object.name = node.data.name

    node.data.draw_object = draw_object;
    node.layout = {}
    node.layout.max_X = 90;
    node.layout.min_X = -90;
    node.layout.max_Y = 180;
    node.layout.min_Y = -180;

    //set the position of the sphere to equal the previously calculated x/y coordinates
    // node.data.draw_object.position = node.position;
    //render it
    node.data.draw_object.lookAt(scene.position);
    scene.add( node.data.draw_object );
  }

  /**
   *  Create an edge object (line) and add it to the scene.
   */
  function drawEdge(source, target, color, fade) {
    console.log('source', source);
    fade = fade || false;
    //var distance = latlonDistance(source.position, target.position);
    var multiplier = 2.0;

    //make a 3js line object
    material = new THREE.LineBasicMaterial( { color: 0xCCCCCC, opacity: 0.5, linewidth: 1 } );

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
    if(fade){
      curvedLine.material.transparent = true;
      createjs.Tween.get(curvedLine.material).wait(4000).to({opacity: 0}, 5000);
      console.log(curvedLine);
    }
    scene.add(curvedLine);
  }

  function animate() {
    requestAnimationFrame( animate );
    var dt = clock.getDelta();
    control.update(dt)
    // control.update();
    render();
    if(that.show_info) {
      printInfo();
    }
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

    // update stats
    // if(that.show_stats) {
    //   stats.update();
    // }

    // render scene
    renderer.render( scene, camera );
  }

  // Generate random number
  function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }

  function printInfo(text) {
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
      console.log(this);
      // var node = this.getNode(fbId);
      if(window.getProfilePic !== undefined){
        window.getProfilePic(fbId);
      }
      getMutual(fbId, true);
    }
    // var names = document.getElementsByClassName('user-name');
    // if(!findElement(names, str)){
    //   var p = document.createElement('p');
    //   p.className = 'user-name';
    //   p.textContent = str;
    //   var first = document.getElementById("graph-info").firstElementChild;
    //   document.getElementById("graph-info").insertBefore(p, first);
    // }
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