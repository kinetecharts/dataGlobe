"use strict";
/**
  @Weidong Yang 2014-08-15
  Adopted from David Piegza's implementation

  Needs the graph data structure Graph.js:
  https://github.com/davidpiegza/Graph-Visualization/blob/master/Graph.js

  Parameters:
  graph - data structure
  options = {
    layout: "2d" or "3d"
    attraction: <float>, attraction value for force-directed layout
    repulsion: <float>, repulsion value for force-directed layout
    iterations: <int>, maximum number of iterations
    width: <int>, width of the viewport
    height: <int>, height of the viewport

    positionUpdated: <function>, called when the position of the node has been updated
  }

  Examples:

  create:
  layout = new Layout.ForceDirected(graph, {width: 2000, height: 2000, iterations: 1000, layout: "3d"});

  call init when graph is loaded (and for reset or when new nodes has been added to the graph):
  layout.init();

  call generate in a render method, returns true if it's still calculating and false if it's finished
  layout.generate();
   */

var Layout = Layout || {};

Layout.ForceDirected = function(graph, options) {
  var options = options || {};

  // this.layout = options.layout || "2d";
  this.layout = "3d"; //force 3D for now
  this.attraction_multiplier = options.attraction || 5; // r^2 smaller the stronger
  this.repulsion_multiplier = options.repulsion || 0.75;  // 1/r larger the stronger
  this.max_iterations = options.iterations || 1000;
  this.graph = graph;
  this.width = options.width || 200;
  this.height = options.height || 200;
  this.finished = false;

  this.fix_z = options.fix_z==undefined ? false : options.fix_z;

  var _scaleDown = options.scaleDown || 10; //was originally 10, reduce movement by a factor of 10.


  this.gravity = options.gravity || 0.05;
  this.speedUpFactor = options.speedUpFactor || 2; //skip some repulsion calculations to speed up the calculation

  this.defaultGravity = this.gravity;

  this.momentum_factor = 0.95;
  this.new_factor = 0.1;


  this.use_weight = options.use_weight || true;
  var weights=[1,2,4,8,16,32,64,128,256,512,1024];

  var num_random = 10000;
  var randoms = [];
  for(var i=0; i< num_random+10; i++) randoms[i] = Math.random();
  var random_cnt = 0;

  var callback_positionUpdated = options.positionUpdated;

  var EPSILON = 0.000001;
  var attraction_constant;
  var repulsion_constant;
  var forceConstant;
  var layout_iterations = 0;
  var _temperature, defaultTemperature;
  var nodes_length;
  var edges_length;
  var that = this;

  var momentum = true;

  // each black hole is an attraction center
  var black_holes=[];
  var num_black_hole = 10;
  var black_hole_void = 100; // let attraction go if particle is closer than this
  for(var i=0; i<num_black_hole; i++){
    black_holes.push({gravity:0, position: new THREE.Vector3(0,0,0)});
  }

  var influence_temperature = 10;
  var influence_radius = 200;
  var influence_center=[];
  for(var i=0; i<4; i++){
    influence_center.push({
      position: new THREE.Vector3(0,0,0),
      temperature: 0
    });
  }

  var drift = new THREE.Vector3(0,0,0);
  var torc = new THREE.Vector3(0,0,0);

  // performance test
  var mean_time = 0;
  var repulsion_time = 0;
  var attraction_time = 0;
  var move_time = 0;

  var vec3length = function(x,y,z){
    return Math.sqrt(x*x + y*y + z*z);
  }

  var vec2length = function(x,y){
    return Math.sqrt(x*x + y*y);
  }

  var getSet=function(param){
    return function(_){
      if(_==null){
        return eval(param);
      }else{
        eval(param +"= _");
      }
    };
  };

  /**
   * Initialize parameters used by the algorithm.
   */
  this.init = function() {
    // console.log(this.layout);

    this.finished = false;
    _temperature = this.width * 0.1; //used to be divided by 10, increast by 100 to make far nodes travel faster
    defaultTemperature = _temperature;
    nodes_length = this.graph.nodes.length;
    edges_length = this.graph.edges.length;
    forceConstant = Math.sqrt(this.height * this.width / nodes_length);
    attraction_constant = this.attraction_multiplier * forceConstant;
    repulsion_constant = this.repulsion_multiplier * forceConstant;

    mean_time = 0;
    attraction_time = 0;
    repulsion_time = 0;
    move_time = 0;

    //place holder for repulsion memory
    // graph.nodes.forEach(function(n){
    //   n.layout = n.layout || {};
    //   n.layout.repulsions=[];
    //   n.layout.repulsion_changes = [];
    //   for(var i=0; i<nodes_length; i++){
    //     n.layout.repulsions[i] = 0;
    //     n.layout.repulsion_changes[i] = 100;
    //   }
    // })

    // console.log("speed up factor: " + this.speedUpFactor);

  };

  /**
   * Generates the force-directed layout.
   *
   * It finishes when the number of max_iterations has been reached or when
   * the temperature is nearly zero.
   */
  this.generate = function() {
    if(layout_iterations < this.max_iterations && _temperature > 0.000001) {
      // console.log(temperature);
      // console.log(this.speedUpFactor);
      attraction_constant = this.attraction_multiplier * forceConstant;
      repulsion_constant = this.repulsion_multiplier * forceConstant;

      var start = new Date().getTime();

      for(var i=0; i<num_black_hole; i++){
        black_holes[i].gravity *=0.5;
      }

      influence_center.forEach(function(infl){
        infl.temperature *=0.5; //takes about 6 iterations to cool down from 100 to 1
      });

      //drifts and torc for excitement
      drift.multiplyScalar(0.9);
      torc.multiplyScalar(0.9);

      //initialize
      graph.nodes.forEach(function(n){
        n.layout = n.layout || {};
        n.layout.force = 0;
        n.layout.offset_x = 0;
        n.layout.offset_y = 0;
        n.layout.offset_z = 0;

        n.layout.v_x = n.layout.v_x || 0;
        n.layout.v_y = n.layout.v_y || 0;
        n.layout.v_z = n.layout.v_z || 0;

        // n.layout.tmp_pos_x = n.layout.tmp_pos_x || n.position.x;
        // n.layout.tmp_pos_y = n.layout.tmp_pos_y || n.position.y;
        // n.layout.tmp_pos_z = n.layout.tmp_pos_z || n.position.z;

        n.layout.tmp_pos_x = n.position.x;
        n.layout.tmp_pos_y = n.position.y;
        n.layout.tmp_pos_z = n.position.z;

        n.layout.temperature = n.layout.temperature || 0;
        n.layout.temperature *=0.1;
      });

      // calculate repulsion
      var threshold = 1-1/this.speedUpFactor;
      var effective_repulsion = (repulsion_constant * repulsion_constant) * this.speedUpFactor;
      // console.log(" "+this.speedUpFactor + " " + threshold);
      for(var i=0; i < nodes_length; i++) {
        var node_v = graph.nodes[i];
        for(var j=i+1; j < nodes_length; j++) {
          random_cnt = random_cnt > num_random ? 0 : random_cnt+1;
          if(randoms[random_cnt]>threshold){

      // var effective_repulsion = (repulsion_constant * repulsion_constant);
      // for(var i=0; i < nodes_length; i++) {
      //   var node_v = graph.nodes[i];
      //   for(var j=i+1; j < nodes_length; j++) {
      //     if(node_v.layout.repulsion_changes[j]>0.1){


            var node_u = graph.nodes[j];
            var delta_x = node_v.layout.tmp_pos_x - node_u.layout.tmp_pos_x;
            var delta_y = node_v.layout.tmp_pos_y - node_u.layout.tmp_pos_y;
            var delta_z = node_v.layout.tmp_pos_z - node_u.layout.tmp_pos_z;

            var delta_length;
            delta_length = Math.max(EPSILON, vec3length(delta_x, delta_y, delta_z));

            //repulsion is 1/r
            var force = effective_repulsion / delta_length;

            // node_v.layout.force += force;
            // node_u.layout.force += force;

            var tempf = force / delta_length;
            var dx = delta_x * tempf;
            var dy = delta_y * tempf;
            var dz = delta_z * tempf;

            node_v.layout.offset_x += dx;
            node_v.layout.offset_y += dy;
            node_v.layout.offset_z += dz;

            node_u.layout.offset_x -= dx;
            node_u.layout.offset_y -= dy;
            node_u.layout.offset_z -= dz;
          }
        }
      }

      var repulsion_end = new Date().getTime();
      repulsion_time += (repulsion_end - start);


      // calculate gravity
      // var sum_dist = 0;
      var has_drift = (drift.length() > 0.1);
      var has_torc = (torc.length()>0.1);

      for(var i=0; i < nodes_length; i++) {
        var node_v = graph.nodes[i];
        var dist = node_v.position.length();
        var sqrtdist = Math.sqrt(dist);
        // sum_dist += dist;
        //add a sqrt of distance to origin, so the pull gets extra stronger when far
        node_v.layout.offset_x -= node_v.position.x * sqrtdist * this.gravity;
        node_v.layout.offset_y -= node_v.position.y * sqrtdist * this.gravity;
        node_v.layout.offset_z -= node_v.position.z * sqrtdist * this.gravity;
        // node_v.layout.offset_x -= node_v.position.x  * this.gravity;
        // node_v.layout.offset_y -= node_v.position.y  * this.gravity;
        // node_v.layout.offset_z -= node_v.position.z  * this.gravity;

        //adding drift
        // node.position.add(drift);
        if(has_drift){
          node_v.layout.offset_x += drift.x;
          node_v.layout.offset_y += drift.y;
          node_v.layout.offset_z += drift.z;
        }

        //adding torc
        if(has_torc){
          var trocDrift = torc.clone().cross(node_v.position);//Math.sqrt(node_v.position.length()+10);
          // node.position.add(drift);
          node_v.layout.offset_x += trocDrift.x;
          node_v.layout.offset_y += trocDrift.y;
          node_v.layout.offset_z += trocDrift.z;
        }

        // node_v.layout.offset_z *=0.1;
      }

      //black holes
      for(var bh_id = 0; bh_id<num_black_hole; bh_id++){
        if(black_holes[bh_id].gravity > 0.1){
          var pos = black_holes[bh_id].position;
          var gravity = black_holes[bh_id].gravity;
          // console.log(gravity);

          for(var i=0; i < nodes_length; i++) {
            var node_v = graph.nodes[i];

            var delta_x = node_v.layout.tmp_pos_x - pos.x;
            var delta_y = node_v.layout.tmp_pos_y - pos.y;
            var delta_z = node_v.layout.tmp_pos_z - pos.z;

            var delta_length;
            delta_length = Math.max(EPSILON, vec3length(delta_x, delta_y, delta_z));
            if(delta_length>black_hole_void){
              node_v.layout.offset_x -= 1/delta_length * delta_x / delta_length * gravity;
              node_v.layout.offset_y -= 1/delta_length * delta_y / delta_length * gravity;
              node_v.layout.offset_z -= 1/delta_length * delta_z / delta_length * gravity;
            }
          }
        }
      }

      //influence
      influence_center.forEach(function(infl){
        if(infl.temperature>1){
          var affected = 0;
          var pos = infl.position;
          for(var i=0; i < nodes_length; i++) {
            var node_v = graph.nodes[i];

            var delta_x = node_v.layout.tmp_pos_x - pos.x;
            var delta_y = node_v.layout.tmp_pos_y - pos.y;
            var delta_z = node_v.layout.tmp_pos_z - pos.z;

            var delta_length;
            delta_length = Math.max(EPSILON, vec3length(delta_x, delta_y, delta_z/1000)); //make z less
            if(delta_length<influence_radius){
              node_v.layout.temperature = influence_temperature;
              affected+=1;
            }
          }
          console.log("influenced "+affected);
        }
      });


      // calculate attraction
      for(var i=0; i < edges_length; i++) {
        var edge = graph.edges[i];
        var delta_x = edge.source.layout.tmp_pos_x - edge.target.layout.tmp_pos_x;
        var delta_y = edge.source.layout.tmp_pos_y - edge.target.layout.tmp_pos_y;
        var delta_z = edge.source.layout.tmp_pos_z - edge.target.layout.tmp_pos_z;

        var delta_length;
        delta_length = Math.max(EPSILON, vec3length(delta_x, delta_y, delta_z));

        //attraction is r^2
        var force = (delta_length * delta_length) / attraction_constant;
        if(this.use_weight){
          force *= weights[edge.log_weight];
        }

        edge.source.layout.force -= force;
        edge.target.layout.force += force;

        edge.source.layout.offset_x -= (delta_x / delta_length) * force;
        edge.source.layout.offset_y -= (delta_y / delta_length) * force;
        edge.source.layout.offset_z -= (delta_z / delta_length) * force;

        edge.target.layout.offset_x += (delta_x / delta_length) * force;
        edge.target.layout.offset_y += (delta_y / delta_length) * force;
        edge.target.layout.offset_z += (delta_z / delta_length) * force;
      }

      var attraction_end = new Date().getTime();
      attraction_time += (attraction_end - repulsion_end)

      // var dummy = 0;
      // for(var i=0; i<nodes_length; i++){
      //   for(var j=0; j<nodes_length; j++){
      //     dummy += i*j;
      //   }
      // }

      // calculate positions
      for(var i=0; i < nodes_length; i++) {
        var node = graph.nodes[i];

        var delta_length;
          delta_length = Math.max(EPSILON, vec3length(node.layout.offset_x, node.layout.offset_y, node.layout.offset_z));

        //scale down with temperature, here temperature determines the fastest a node can travel
        node.layout.tmp_pos_x += (node.layout.offset_x / delta_length) * Math.min(delta_length, _temperature);
        node.layout.tmp_pos_y += (node.layout.offset_y / delta_length) * Math.min(delta_length, _temperature);
        node.layout.tmp_pos_z += (node.layout.offset_z / delta_length) * Math.min(delta_length, _temperature);

        var updated = true;
        //scale down by factor of 10 to reduce oscillation? this is not necessary as it effectively reduces the force constant
        // var scaleDown = 10; //was originally 10
        var xshift = -(node.position.x-node.layout.tmp_pos_x)/_scaleDown;
        var yshift = -(node.position.y-node.layout.tmp_pos_y)/_scaleDown;
        var zshift = that.fix_z ? 0 : -(node.position.z-node.layout.tmp_pos_z)/_scaleDown; //fix_z true => try to maintain 2D flat look

        xshift *= (node.layout.temperature+1);
        yshift *= (node.layout.temperature+1);
        zshift *= (node.layout.temperature+1);

        if(momentum){
          node.layout.v_x = node.layout.v_x * this.momentum_factor + xshift * this.new_factor;
          node.layout.v_y = node.layout.v_y * this.momentum_factor + yshift * this.new_factor;
          node.layout.v_z = node.layout.v_z * this.momentum_factor + zshift * this.new_factor;

          node.position.x +=  node.layout.v_x;
          node.position.y +=  node.layout.v_y;
          node.position.z +=  node.layout.v_z;
        }else{
          node.lastXshift = node.lastXshift || xshift;
          node.lastYshift = node.lastYshift || yshift;
          node.lastZshift = node.lastZshift || zshift;
          node.slowDown = node.slowDown || 0;
          //prevent oscillation
          if(node.lastXshift * xshift + node.lastYshift * yshift + node.lastZshift * zshift < -10){
            node.slowDown = 10;
          }else{
            node.slowDown = node.slowDown > 0 ? node.slowDown-1 : 0;
          }
          if(node.slowDown>1){
            xshift /= node.slowDown;
            yshift /= node.slowDown;
            zshift /= node.slowDown;
          }
          node.position.x +=  xshift;
          node.position.y +=  yshift;
          node.position.z +=  zshift;
        }

        // execute callback function if positions has been updated
        if(updated && typeof callback_positionUpdated === 'function') {
          callback_positionUpdated(node);
        }
      }
      _temperature *= (1 - (layout_iterations / this.max_iterations));
      layout_iterations++;

      var end = new Date().getTime();
      move_time += (end - attraction_end);
      mean_time += end - start;
    } else {
      if(!this.finished) {
        console.log("Average time: " + (mean_time/layout_iterations) + " ms", " repulsion: " + (repulsion_time/layout_iterations) +
          " attraction: " + (attraction_time/layout_iterations) + " move: "+ (move_time/layout_iterations));
      }
      this.finished = true;
      return false;
    }
    return true;
  };

  this.addDrift=function(_){
    drift.add(_);
  }

  this.addTorc=function(_){
    torc.add(_);
  }

  this.setBlackHole=function(id, gravity, position){
    // black_holes[id].gravity = black_holes[id].gravity * 0.9 + gravity * 0.1;
    black_holes[id].gravity = gravity;
    black_holes[id].position.copy(position);
  }

  this.setInfluence=function(id, position){
    influence_center[id].position.copy(position);
    influence_center[id].temperature = 100;

    // console.log(""+influence_center[id].temperature+" "+
    //   influence_center[id].position.x +" "+
    //   influence_center[id].position.y+" "+influence_center[id].position.z);
  }

  this.influence_temperature = getSet('influence_temperature');

  this.influence_radius = getSet('influence_radius');

  this.resetTemperature = function(t){
    _temperature = t || defaultTemperature;
    layout_iterations = 0;
  }

  /**
   * Stops the calculation by setting the current_iterations to max_iterations.
   */
  this.stop_calculating = function() {
    layout_iterations = this.max_iterations;
  }
  this.start_calculating = function() {
    layout_iterations = 0;
    this.init();
  }

  this.temperature=getSet('_temperature');

  this.scaleDown=getSet('_scaleDown');

  this.black_hole_void=getSet('black_hole_void');
};
