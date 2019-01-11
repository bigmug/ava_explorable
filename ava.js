(function(){

var world_width = 400,
	world_height = 400,
	controlbox_width = 400,
	controlbox_height = 400,
	controlbox_margin = {top:40,bottom:20,left:20,right:10},
	button_x = 3 * controlbox_width / 4,
	button_y =  7* controlbox_height / 8,
	toggle_x = 300,
	toggle_y = 280,
	button_width = 180,
	slider_width = 180;

// fixed parameters 	
var node_count = 80,
    L = 128, // world size
    peer_sample = 5,
    alpha = 0.5,
    rounds = 1,
    byz_nodes;

// this are the default values for the slider variables
var def_node_count = 80,
    def_L = 128, // world size
    def_peer_sample = 5,
    def_alpha = 0.5,
    def_rounds = 3,
    def_byz_nodes = 0,
    def_latency = 0;

// parameter objects for the sliders
var network_size = {id: "network_size", name: "Network Size", range: [0,200], value: def_node_count};	
var kappa = {id: "kappa", name: "Kappa", range: [0,10], value: def_peer_sample};	
var alpha_ratio = {id: "alpha", name: "Alpha", range: [0,1], value: def_alpha};	
var m_rounds = {id: "rounds", name: "M Rounds", range: [0,10], value: def_rounds};	
var byzantine_nodes = {id: "byz_nodes", name: "Byzantine Nodes", range: [0,200], value: def_byz_nodes};	
var network_latency = {id: "latency", name: "Network Latency", range: [0,1], value: def_latency};	

// action parameters for the buttons
var playpause = { id:"b1", name:"", actions: ["play","pause"], value: 0};
var reload = { id:"b3", name:"", actions: ["reload"], value: 0};

// widget.block helps distributing widgets in neat arrays
var sbl = new widget.block([2,3,1],controlbox_height-controlbox_margin.top-controlbox_margin.bottom,10,"[]");
var bbl = new widget.block([3],button_width,0,"()");

// slider objects
var handleSize = 12, trackSize = 8;

var sliders = [
	       new widget.slider(network_size).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(kappa).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(alpha_ratio).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(m_rounds).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(byzantine_nodes).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(network_latency).width(slider_width).trackSize(trackSize).handleSize(handleSize)
	       ];

// button objects
var buttons = [
	new widget.button(playpause).update(runpause),
	new widget.button(reload).update(resetparameters)
	       ];

// position scales
var X = d3.scaleLinear().domain([0,L]).range([0,world_width]);
var Y = d3.scaleLinear().domain([0,L]).range([world_height,0]);

// helps translate degrees and radian

var g2r = d3.scaleLinear().domain([0,360]).range([0,2*Math.PI]);
var r2g = d3.scaleLinear().range([0,360]).domain([0,2*Math.PI]);

var nodes;

// this is the box for the simulation
var world = d3.selectAll("#ava_display").append("svg")
	.attr("width",world_width)
	.attr("height",world_height)
    .attr("class","explorable_display");

// this is the svg for the widgets
var controls = d3.selectAll("#ava_controls").append("svg")
	.attr("width",controlbox_width)
	.attr("height",controlbox_height)
    .attr("class","explorable_widgets");

var slider = controls.append("g").attr("id","sliders")
    .attr("transform","translate("+controlbox_margin.left+","+ controlbox_margin.top +")");

var button = controls.append("g")
    .attr("transform","translate("+button_x +","+ button_y +")");

// sliders and buttons
slider.selectAll(".slider").data(sliders).enter().append(widget.sliderElement)
	.attr("transform",function(d,i){return "translate(0,"+sbl.x(i)+")"});
	
button.selectAll(".button").data(buttons).enter().append(widget.buttonElement)
	.attr("transform",function(d,i){return "translate("+(bbl.x(i) - button_width / 2)+",0)"});	

/////////////////////////////////////////
var node = world.append("g").attr("class", "node").selectAll("circle");
resetparameters();

// timer variable for the simulation
var t; 

// functions for the action buttons
function runpause(d){ d.value() == 1 ? t = d3.interval(runsim,1500) : t.stop(); }

var initialized = 0;
var init_q;

function resetparameters(){

    world.selectAll("circle").remove();
    
    node_count = Math.ceil(network_size.value);
    peer_sample = Math.ceil(kappa.value);
    alpha = alpha_ratio.value;
    rounds = Math.ceil(m_rounds.value);
    byz_nodes = Math.ceil(byzantine_nodes.value);

    byz_node_count = byz_nodes;
    nodes = d3.range(node_count).map( function(d,i) { 
	    if (byz_nodes) {
		byz_nodes--;
		return {id: i, "x": Math.random() * L, "y": Math.random() * L, "col": "blue" };
	    } else {
		return {id: i, "x": Math.random() * L, "y": Math.random() * L, "col": "#999" };
	    }
	});

    node = node.data(nodes).enter().append("circle")
	.attr("r", 4)
	.attr("cx", function(d) { return X(d.x); })
	.attr("cy", function(d) { return Y(d.y); })
	.attr("id", function(d) { return d.id; })
	.style("fill", function(d) { return d.col; });

    initialized = 0;
    init_q = d3.queue();
}

var source_id = node_count - 1;

function runsim(){
    if (!initialized) {
	let [init_col, query_loop] = checkState(source_id, "red");
	console.log(query_loop);
	if (query_loop) {
	    init_q.defer(query, source_id, init_col);
	    init_q.await(function(error, query_col) { 
		    console.log("test");
		});
	}
	initialized = 1;
    }
}

function checkState(node_id, color) {
    let query_loop = 0;
    if (nodes[node_id].col == "#999") {
	setNodeColor(node_id, color);
	query_loop = 1;
    }
    console.log(query_loop);
    return [nodes[node_id].col, query_loop];
}

function query(node_id, color, callback) {
    var t = d3.timeout(function(elapsed) {
	    for (m = 0; m < rounds; m++) {
		let tmp_col = sampleNodes(node_id, color);
		console.log(m + " : " + tmp_col);
	    }
	    callback( null, nodes[node_id].col );
	}, 1500);    
}

function sampleNodes(node_id, color, callback) {
    // choose a random set of nodes to query
    var peer_node_set = new Set();
    while(peer_node_set.size < peer_sample) {
	peer_node_set.add(getRandomInt(0, node_count - 1));
    }
    var peer_nodes = Array.from(peer_node_set);

    var links = [];
    peer_nodes.forEach( function(d) { 
	    links.push({"source": node_id, "target": d});
	});

    var link = world.append("g").attr("class", "link").selectAll("line");
    
    link = link.data(links).enter().append("line")
	.attr("x1", function(d) { return X(nodes[d.source].x); })
	.attr("y1", function(d) { return Y(nodes[d.source].y); })
	.attr("x2", function(d) { return X(nodes[d.target].x); })
	.attr("y2", function(d) { return Y(nodes[d.target].y); });
    
    var rec_q = d3.queue();

    var colors = {"red": 0, "blue": 0};
    var total = 0;	
    
    peer_nodes.forEach( function(d) { 
	    let [sample_col, q_loop] = checkState(d, color);
	    if (q_loop) {
		rec_q.defer(query, d, sample_col);
	    }
	    colors[sample_col]++;
	    total++;
	});

    Object.keys(colors).forEach(function(c) {
	    if ((colors[c] / total >= alpha * peer_sample) && nodes[node_id].col != c) {
		setNodeColor(node_id, c);
	    }
	});

    rec_q.awaitAll(function(error, query_col) { 
	    if (error) throw error;
	});

    var t2 = d3.timeout(function(elapsed) {
	    world.selectAll("line").remove();
	}, 750);    

    return nodes[node_id].col;
}

function setNodeColor(node_id, color) {
    nodes[node_id].col = color;
    world.selectAll("circle").filter(function(d, i){ return i === node_id; }).style("fill", nodes[node_id].col);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

})()