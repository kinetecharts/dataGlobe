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
  this.selection = options.selection || false;
  this.limit = options.limit || 10;

  var camera, controls, scene, renderer, interaction, geometry, object_selection;
  var stats;
  var graph = new Graph();

  var geometries = [];

  var sphere_radius = 4900;
  var max_X = sphere_radius;
  var min_X = -sphere_radius;
  var max_Y = sphere_radius;
  var min_Y = -sphere_radius;

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
    renderer.setSize( window.outerWidth, window.outerHeight );

    camera = new THREE.PerspectiveCamera(35, window.outerWidth / window.outerHeight, 1, 100000);
    camera.position.z = 17000;

    controls = new THREE.OrbitControls(camera);
    controls.addEventListener( 'change', render );

    scene = new THREE.Scene();

    // a sun like light source and ambient light so all parts of globe are visible
    // adding a specular map turns the globe black without having lighting
    var sun = new THREE.DirectionalLight( 0xbbbbbb );
    sun.position.set(10000, 100, 100 );
    var ambientLight = new THREE.AmbientLight( 0xeeeeee );
    //add sphere geometry from google globe JHE
    var globeGeometry = new THREE.SphereGeometry(sphere_radius, 40, 30);
/////////////////////////////////////////////////////////////////////////////////
    // Adds bumps, shininess
    var globeMaterial  = new THREE.MeshPhongMaterial();
    globeMaterial.map    = THREE.ImageUtils.loadTexture('./img/world.jpg');
    globeMaterial.normalMap    = THREE.ImageUtils.loadTexture('./img/earth_normal.jpg');
    globeMaterial.bumpScale = 0.05;
    globeMaterial.specularMap = THREE.ImageUtils.loadTexture('./img/earth_specular.jpg');
    globeMaterial.specular = new THREE.Color(0x444444);

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
    scene.add(sun);
    scene.add(ambientLight);

    // end sphere geom JHE

    // scene.add(new THREE.AxisHelper(9000))

    // Create node geometry (will be used in drawNode())
    geometry = new THREE.SphereGeometry( 50, 25, 0 );

    // Create node selection, if set
    if(that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
        selected: function(obj) {
          // display info
          if(obj != null) {
            info_text.select = "Object " + obj.id;
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
  this.addEdge = function(from, to){
    console.log(from);
    console.log(to);
    var fromNode = graph.getNode(from);
    var toNode = graph.getNode(to);
    if(graph.addEdge(fromNode, toNode)){
      drawEdge(fromNode, toNode, 'red');
    }
  }

  this.goToNode = function(id){
    var node = graph.getNode(id);
    var x = node.position.x * 2.2;
    var y = node.position.y * 2.2;
    var z = node.position.z * 2.2;
    createjs.Tween.get(camera.position).to({x: x, y: y, z: z}, 500)
    camera.lookAt( scene.position );
    $('.info-header').text(node.data.name);
    if(this.previousNode){
      if(graph.addEdge(node, this.previousNode)){
        drawEdge(node, this.previousNode, 'red', true);
      }
    }
    this.previousNode = node;
  }


  this.createGraph = function(current) {
      //only add if lat and lon are not null
      if(current.longitude !== null && current.latitude !== null){
        //make a new node object
        var node = new Node(current.fbId);
        //set position of node object to equal lat/lon of datum
        node.position.x = current.latitude;
        node.position.y = current.longitude;
        node.data.name = current.name;
        //add and render node
        graph.addNode(node);
        drawNode(node);


        this.nodes.push(node);
      }

    /*
    This is the force-directed layout for the graph, currently not set up for use

    graph.layout = new Layout.ForceDirected(graph, {width: 2000, height: 2000, iterations: 1000, positionUpdated: function(node) {
      max_X = Math.max(max_X, node.position.x);
      min_X = Math.min(min_X, node.position.x);
      max_Y = Math.max(max_Y, node.position.y);
      min_Y = Math.min(min_Y, node.position.y);

      var lat, lng;
      if(node.position.x < 0) {
        lat = (-90/min_X) * node.position.x;
      } else {
        lat = (90/max_X) * node.position.x;
      }
      if(node.position.y < 0) {
        lng = (-180/min_Y) * node.position.y;
      } else {
        lng = (180/max_Y) * node.position.y;
      }

      var area = 5000;
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (180 - lng) * Math.PI / 180;
      node.data.draw_object.position.x = area * Math.sin(phi) * Math.cos(theta);
      node.data.draw_object.position.y = area * Math.cos(phi);
      node.data.draw_object.position.z = area * Math.sin(phi) * Math.sin(theta);

    }});
    graph.layout.init();
    */
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

    var line = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial({  color: 'white', linewidth: 1 })
    line.vertices.push(new THREE.Vector3(node.position.x*0, node.position.y*0, node.position.z*0));
    line.vertices.push(new THREE.Vector3(node.position.x*1.2, node.position.y*1.2, node.position.z*1.2));
    //set node.data.draw_object to equal the three.js sphere object

    var draw_object = new THREE.Line( line, material );
    // draw_object.id = node.id;

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
    fade = fade || false;
    var distance = latlonDistance(source.position, target.position);
    var multiplier = 2.0;
    // if(distance < 9000){
    //   multiplier = 1.2;
    // }
    // else if(distance > 9000 && distance < 12000){
    //   multiplier = 1.5;
    // }
    // else if(distance > 12000 && distance < 17000){
    //   multiplier = 2.1;
    // }
    // else if(distance > 17000 && distance < 22000){
    //   multiplier = 2.7;
    // }
    // else if(distance > 22000){
    //   console.log(distance);
    // }
    //make a 3js line object
    material = new THREE.LineBasicMaterial( { color: 0xCCCCCC, opacity: 0.5, linewidth: 1 } );

    //cache the coordinates of the source and target nodes
    var sourceXy = source.position;
    var targetXy = target.position;

    /*
    The following code is broken, it does not produce a nice curved line from the source to the larget
    */

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
      color: color, linewidth: 2
    });

    //create curved line and add to scene
    curvedLine = new THREE.Line(path.createPointsGeometry(100), curveMaterial);
    curvedLine.lookAt(scene.position);
    if(fade){
      curvedLine.material.transparent = true;
      createjs.Tween.get(curvedLine.material).to({opacity: 100}, 3000);
      console.log(curvedLine);
    }
    scene.add(curvedLine);
  }

  function animate() {
    requestAnimationFrame( animate );
    controls.update();
    render();
  }


  function render() {
    // Generate layout if not finished

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
}
