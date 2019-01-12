(function(){

var world_width = 400,
	world_height = 400,
	controlbox_width = 400,
	controlbox_height = 400,
	controlbox_margin = {top:40,bottom:20,left:20,right:10},
	button_x = 3 * controlbox_width / 4,
	button_y =  7* controlbox_height / 8,
	toggle_x = 300,
	toggle_y = 140,
	button_width = 180,
	slider_width = 180,
	node_radius = 4;

// fixed parameters 	
var node_count = 80,
    L = 128, // world size
    peer_sample = 5,
    alpha = 0.5,
    rounds = 5,
    byz_nodes = 8;

// this are the default values for the slider variables
var def_node_count = 80,
    def_peer_sample = 5,
    def_alpha = 0.5,
    def_rounds = 5,
    def_beta = 5,
    def_byz_nodes = 0.1,
    def_latency = 0;

var display_connections = {id:"t1", name: "Display Sampling", value: false}; 
var lock_position = {id:"t3", name: "Lock Node Position", value: false}; 

// parameter objects for the sliders
var network_size = {id: "network_size", name: "Network Size", range: [0,100], value: def_node_count};	
var kappa = {id: "kappa", name: "Kappa", range: [0,10], value: def_peer_sample};	
var alpha_ratio = {id: "alpha", name: "Alpha", range: [0,1], value: def_alpha};	
var m_rounds = {id: "rounds", name: "M Rounds", range: [0,100], value: def_rounds};	
var beta = {id: "beta", name: "Beta", range: [0,100], value: def_beta};	
var byzantine_nodes = {id: "byz_nodes", name: "Byzantine Nodes", range: [0,1], value: def_byz_nodes};	

// action parameters for the buttons
var playpause = { id:"b1", name:"", actions: ["play","pause"], value: 0};
var reload = { id:"b3", name:"", actions: ["reload"], value: 0};

//var consensus_algo = {id: "consensus_ago", name: "Algo", choices: ["Slush", "Snowflake", "Snowball"], value: 0};
var consensus_algo = {id: "consensus_ago", name: "Algo", choices: ["Slush", "Snowflake"], value: 0};
	
// widget.block helps distributing widgets in neat arrays
var sbl = new widget.block([2,3,1],controlbox_height-controlbox_margin.top-controlbox_margin.bottom,10,"[]");
var bbl = new widget.block([3],button_width,0,"()");

// slider objects
var handleSize = 12, trackSize = 8;

var sliders = [
	       new widget.slider(byzantine_nodes).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(kappa).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(alpha_ratio).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       new widget.slider(m_rounds).width(slider_width).trackSize(trackSize).handleSize(handleSize),
	       //	       new widget.slider(beta).width(slider_width).trackSize(trackSize).handleSize(handleSize)
	       ];

// button objects
var buttons = [
	       new widget.button(playpause).update(runpause),
	       new widget.button(reload).update(resetparameters)
	       ];

var toggles = [
	       new widget.toggle(display_connections).update(noop).label("top").size(16),
	       new widget.toggle(lock_position).update(noop).label("top").size(16)
	       ];

var radio_buttons = [
		     new widget.radio(consensus_algo).update(noop).alignment("horizontal")
		     ];

function noop(){

}

// position scales
var X = d3.scaleLinear().domain([0,L]).range([node_radius,world_width - node_radius]);
var Y = d3.scaleLinear().domain([0,L]).range([world_height - node_radius,node_radius]);

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

var toggle = controls.append("g")
    .attr("transform","translate("+toggle_x +","+ toggle_y +")");

var radio = controls.append("g")
    .attr("transform","translate("+60+","+ 290 +")");

// sliders and buttons
slider.selectAll(".slider").data(sliders).enter().append(widget.sliderElement)
	.attr("transform",function(d,i){return "translate(0,"+sbl.x(i)+")"});
	
button.selectAll(".button").data(buttons).enter().append(widget.buttonElement)
	.attr("transform",function(d,i){return "translate("+(bbl.x(i) - button_width / 2)+",0)"});
	
toggle.selectAll(".toggle").data(toggles).enter().append(widget.toggleElement)
    	.attr("transform",function(d,i){return "translate(0,"+sbl.x(i)+")"});

radio.selectAll(".radio").data(radio_buttons).enter().append(widget.radioElement)
    	.attr("transform",function(d,i){return "translate(0,0)"});
/////////////////////////////////////////
var node = world.append("g").attr("class", "node").selectAll("circle");
initialize();

// timer variable for the simulation
var t; 

// functions for the action buttons
function runpause(d){ d.value() == 1 ? t = d3.interval(runsim,1500) : t.stop(); }

var initialized = 0;
var init_q;

function initialize() {

    node_count = Math.ceil(network_size.value);
    peer_sample = Math.ceil(kappa.value);
    alpha = alpha_ratio.value;
    rounds = Math.ceil(m_rounds.value);
    byz_nodes = Math.ceil(byzantine_nodes.value * node_count);

    nodes = d3.range(node_count).map( function(d,i) { 
	    if (byz_nodes) {
		byz_nodes--;
		return {id: i, "x": Math.random() * L, "y": Math.random() * L, "col": "blue", x0: 0, y0: 0, q: 0, cnt: 0 };
	    } else {
		return {id: i, "x": Math.random() * L, "y": Math.random() * L, "col": "#999", x0: 0, y0: 0, q: 0, cnt: 0 };
	    }
	});
    
    node = node.data(nodes).enter().append("circle")
	.attr("r", node_radius)
	.attr("cx", function(d) { return X(d.x); })
	.attr("cy", function(d) { return Y(d.y); })
	.attr("id", function(d) { return d.id; })
	.style("fill", function(d) { return d.col; });
    
    initialized = 0;
    init_q = d3.queue();
}

function resetparameters() {

    if (typeof(t) === "object") {t.stop()};
    
    node_count = Math.ceil(network_size.value);
    peer_sample = Math.ceil(kappa.value);
    alpha = alpha_ratio.value;
    rounds = Math.ceil(m_rounds.value);
    byz_nodes = Math.ceil(byzantine_nodes.value * node_count);

    /*
    if (node_count <= nodes.length) {
	for (node_id = node_count; node_id < nodes.length; node_id++) {
	    world.selectAll("circle").filter(function(d, i){ return d.id === node_id; }).remove();
	}
	nodes.splice(node_count, nodes.length - node_count);
    } else {
	let index = nodes.length;
	for (node_id = nodes.length; node_id < node_count; node_id++) {
	    nodes[node_id] = {id: node_id, "x": Math.random() * L, "y": Math.random() * L, "col": "blue", x0: 0, y0: 0 };
	}
	//	world.append("g").attr("class", "node").selectAll("circle").data(nodes[]);
	}*/

    nodes.forEach( function(d, i) { 
	    d.id = i;
	    d.cnt = 0;
	    if (!lock_position.value) {
		let x = Math.random() * L;
		d.tx = x - d.x;
		d.x = x;
	    
		let y = Math.random() * L;
		d.ty = y - d.y;
		d.y = y;
	    }
	    if (byz_nodes) {
		byz_nodes--;
		d.col = "blue";
	    } else {
		d.col = "#999";
	    }
	});

	world.selectAll("circle").transition()
	    .attr("cx", function(d) { return X(d.x); })
	    .attr("cy", function(d) { return Y(d.y); })
	    .style("fill", function(d) { return d.col; });

    initialized = 0;
    init_q = d3.queue();
}

var source_id = node_count - 1;

function runsim(){
    if (!initialized) {
	let [init_col, query_loop, algo] = checkState(source_id, "red");

	if (query_loop) {
	    init_q.defer(query, source_id, init_col, algo);
	    init_q.await(function(error, query_col) { 
		    if (error) throw error;
		});
	}
	initialized = 1;
    }
}

function checkState(node_id, color) {
    let query_loop = 0;
    if (nodes[node_id].col == "#999") {
	setNodeColor(node_id, color);
	if (nodes[node_id].q === 0) {
	    query_loop = 1;
	}
    }
    return [nodes[node_id].col, query_loop, consensus_algo.choices[consensus_algo.value]];
}

function query(node_id, color, algo, callback) {

    nodes[node_id].q = 1;
    var t = d3.timeout(function(elapsed) {
	    if (algo === "Slush") {
		for (m = 0; m < rounds; m++) {
		    sampleNodes(node_id, color, algo);
		}
	    } else if (algo === "Snowflake") {
		let undecided = 1;
		while(undecided) {
		    undecided = sampleNodes(node_id, color, algo);
		}
	    } else if (algo === "Snowball") {
		console.log(algo);
	    }

	    nodes[node_id].q = 0;

	    callback( null, nodes[node_id].col );
	}, 1500);    
}

function sampleNodes(node_id, color, algo) {
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

    if (display_connections.value) {
	link = link.data(links).enter().append("line")
	    .attr("x1", function(d) { return X(nodes[d.source].x); })
	    .attr("y1", function(d) { return Y(nodes[d.source].y); })
	    .attr("x2", function(d) { return X(nodes[d.target].x); })
	    .attr("y2", function(d) { return Y(nodes[d.target].y); });
    }

    var rec_q = d3.queue();

    var colors = {"red": 0, "blue": 0};
    peer_nodes.forEach( function(d) { 
	    let [sample_col, q_loop, algo] = checkState(d, color);
	    if (q_loop) {
		rec_q.defer(query, d, sample_col, algo);
	    }
	    colors[sample_col]++;
	});

    let not_accepted = 1;
    let use_counter = algo !== "Slush" ? 1 : 0;
    Object.keys(colors).forEach(function(c) {
	    if (colors[c] > alpha * peer_sample) {
		if (nodes[node_id].col != c) {
		    setNodeColor(node_id, c);
		    world.selectAll("circle").filter(function(d, i){ return i === node_id; }).classed('pulse', true);
		    if (use_counter) {
			nodes[node_id].cnt = 0;
		    }
		} else if (use_counter) {
		    nodes[node_id].cnt++;
		    if (nodes[node_id].cnt >= beta.value) {
			not_accepted = 0;
		    }
		}
	    }
	});

    rec_q.awaitAll(function(error, query_col) { 
	    if (error) throw error;
	    //	    let querying = 0;
	    //	    nodes.forEach( function(d) {
	    //		    querying += d.q;
	    //		});
	    //	    if (!querying) {
	    //		buttons[0].click();
	    //	    }
	});

    var t2 = d3.timeout(function(elapsed) {
	    world.selectAll("line").remove();
	}, 700);    

    return not_accepted;
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