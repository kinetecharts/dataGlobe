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
  this.show_info = options.showInfo || false;
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

  init();
  createGraph();
  animate();

  function init() {
    // Three.js initialization
    renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setSize( window.innerWidth, window.innerHeight );

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 100000);
    camera.position.z = 10000;

    scene = new THREE.Scene();

    //add sphere geometry from google globe JHE
    var geometry = new THREE.SphereGeometry(sphere_radius, 40, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = THREE.ImageUtils.loadTexture('./world.jpg');

    material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);
    // end sphere geom JHE

    // Create node geometry (will be used in drawNode())
    geometry = new THREE.SphereGeometry( 50, 25, 0 );

    // Create node selection, if set
    if(that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
      });
    }

    document.body.appendChild( renderer.domElement );

    // Stats.js
    if(that.show_stats) {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      document.body.appendChild( stats.domElement );
    }
  }

  function createGraph() {
    /*
    This is where we create nodes, add them to the graph,
    create edges, and call drawNode and drawEdge accordingly
    */

    /*
    This is the force-directed layout for the graph
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


  /**
   *  Create a node object and add it to the scene.
   */
  function drawNode(node) {
    var draw_object = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( {  color: Math.random() * 0xffffff } ) );

    var area = 2000;
    draw_object.position.x = Math.floor(Math.random() * (area + area + 1) - area);
    draw_object.position.y = Math.floor(Math.random() * (area + area + 1) - area);

    node.position.x = Math.floor(Math.random() * (area + area + 1) - area);
    node.position.y = Math.floor(Math.random() * (area + area + 1) - area);

    draw_object.id = node.id;
    node.data.draw_object = draw_object;
    node.layout = {}
    node.layout.max_X = 90;
    node.layout.min_X = -90;
    node.layout.max_Y = 180;
    node.layout.min_Y = -180;

    // node.position = draw_object.position;
    scene.add( node.data.draw_object );
  }


  /**
   *  Create an edge object (line) and add it to the scene.
   */
  function drawEdge(source, target) {
    material = new THREE.LineBasicMaterial( { color: 0xCCCCCC, opacity: 0.5, linewidth: 1 } );
    var tmp_geo = new THREE.Geometry();

    tmp_geo.vertices.push(source.data.draw_object.position);
    tmp_geo.vertices.push(target.data.draw_object.position);

    line = new THREE.Line( tmp_geo, material, THREE.LinePieces );
    line.scale.x = line.scale.y = line.scale.z = 1;
    line.originalScale = 1;

    geometries.push(tmp_geo);

    scene.add( line );
  }


  function animate() {
    requestAnimationFrame( animate );
    //update camera-view here
    render();
    if(that.show_info) {
      printInfo();
    }
  }


  function render() {
    // Generate layout if not finished

    // Update position of lines (edges)
    for(var i=0; i<geometries.length; i++) {
      geometries[i].verticesNeedUpdate = true;
    }

    // set lookat of nodes to camera
    for(var i=0; i<graph.nodes.length; i++) {
      graph.nodes[i].data.draw_object.lookAt(camera.position);
    }

    // render selection
    if(that.selection) {
      object_selection.render(scene, camera);
    }

    // update stats
    if(that.show_stats) {
      stats.update();
    }

    // render scene
    renderer.render( scene, camera );
  }

  // Generate random number
  function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }
}
