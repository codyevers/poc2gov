---
toc: false
---

```js
//import {fisheyeForce, walleyeForce} from "./components/aux_functions.js"
const orgnet = FileAttachment("data/orgnet.json").json();
```

```js
let edge_data = orgnet.edges.map((d) => {
  const source = d.source,
    target = d.target;
  return { source, target };
})

let node_data = orgnet.vertices.map((d) => {
  const id = d.id,
    x = d.x,
    y = d.y,
    r = d.r,
    g = d.group;
  return { id, x, y, r, g };
})
```

```js
let force_param = ({
  kf: 150, // ticks to simulate
  link_dist: 10, // length of edges (unclear how this works)
  strength: -50, // larger negative values repel nodes more
  fisheye_strength: 0.01, // fisheye effect strength
  fisheye_radius: 60, // radius of circle within which to apply fisheye effect
  max_radius: 270 // maximum distance from center
})

let chart_param = ({
  edge_color: "white",
  select_color: "white",
  width: 600,
  height: 600,
  margin: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    center: 150
  }
})
```

```js
let selected_nodes = [];
let selected_node = null;
let selected_turf = [];

const draw_nodes = (svg, node_data, edge_data, w_r, w_l, sim, tooltip) => {
  const colorMap = {
    "federal": "#2ca02c", // green
    "state": "#1f77b4", // blue
    "local": "#FF0FF5", // pink
    "fire district": "#d62728", // red
    "ngo": "#9467bd", // purple
    "other": "#8c564b" // brown
  };

  // Object to store the counts of each group
  const group_counts = {
    "federal": 0,
    "state": 0,
    "local": 0,
    "fire district": 0,
    "ngo": 0,
    "other": 0
  };

  let edge = null;

  // Plot edges
  if (edge_data) {
    edge = svg
      .selectAll(".edge")
      .data(edge_data)
      .enter()
      .append("line")
      .classed("edge", true)
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .style("stroke", w_l ? "#bbb" : "none")
      .style("stroke-width", 0.1);
  }

  // Plot nodes
  const node = svg
    .selectAll(".node")
    .data(node_data)
    .enter()
    .append("circle")
    .classed("node", true)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => (w_r ? d.r + 2 : 8))
    .style("fill", (d) => colorMap[d.g] || "#7f7f7f")
    .on("mouseover", (event, d) => {
      const prototypeData = Object.getPrototypeOf(d);
      selected_node = prototypeData.id;
      selected_turf = filterLookupTable(prototypeData.id);
      console.log(prototypeData.id);
      leafletMap(turf, selected_turf); // Update the Leaflet map
      //updateMapBasedOnSelection(prototypeData.id, 600);
      highlight_node_and_edges(event, d);
      tooltip.style("visibility", "visible").html(`
          ${d.id}<br>
          ${d.g}<br>
          ${d.r}`);
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      reset_selection();
    });

  // Function to highlight the hovered node and its connected nodes and edges
  function highlight_node_and_edges(event, d) {

    // Reset any previous selection
    reset_selection();

    // Highlight the hovered node by adding a black border
    d3.select(event.currentTarget)
      .style("stroke", "white")
      .style("stroke-width", 2);

    // Create a set to hold the hovered node and its connected neighbors
    const connected_nodes = new Set([d]);

    // Reset the group_counts object for each hover event
    const group_counts = {
      "federal": 0,
      "state": 0,
      "local": 0,
      "fire district": 0,
      "ngo": 0,
      "other": 0
    };

    // Find and highlight connected edges and neighbor nodes
    edge
      .filter((e) => e.source === d || e.target === d)
      .style("stroke", "white")
      .style("stroke-width", 1)
      .each((e) => {
        if (e.source && e.source !== d) {
          connected_nodes.add(e.source);
          group_counts[e.source.g] += 1; // Increment count for the source's group
        }
        if (e.target && e.target !== d) {
          connected_nodes.add(e.target);
          group_counts[e.target.g] += 1; // Increment count for the target's group
        }
      });

    // Highlight neighbor nodes by adding a black border
    node
      .filter((n) => connected_nodes.has(n) && n !== d)
      .style("stroke", "white")
      .style("stroke-width", 2);

    // Format the tooltip content to show the group counts
    const tooltip_content = `
      <strong>${d.id}</strong><br>
      Group: ${d.g}<br><br>
      <strong>Connections:</strong><br>
      Federal: ${group_counts.federal}<br>
      State: ${group_counts.state}<br>
      Local: ${group_counts.local}<br>
      Fire District: ${group_counts["fire district"]}<br>
      NGO: ${group_counts.ngo}<br>
      Other: ${group_counts.other}
    `;

    // Update the tooltip with the group counts
    tooltip.style("visibility", "visible").html(tooltip_content);
    selected_nodes = Array.from(connected_nodes);
  }

  // Function to reset all nodes and edges to default styles
  function reset_selection() {
    node
      .style("fill", (d) => colorMap[d.g] || "#7f7f7f") // Reapply color based on group
      .style("stroke", "none") // Remove border
      .attr("r", (d) => (w_r ? d.r + 2 : 8)); // Reset radius
    edge
      .style("stroke", "#bbb")
      .style("stroke-width", 0.1); // Reset edge style
  }

  return [node, edge];
}
```

```js
function networkDiagram(force_param, chart_param, node_data, edge_data, container) {

  const tooltip = d3
    .select(container)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute");

  // Clear the container before appending the new SVG (in case of resizing or rerendering)
  d3.select(container).selectAll("svg").remove();

  // Create an SVG element and append it to the specific container
  const svg = d3.select(container)
    .append("svg")
    .attr("width", chart_param.width)
    .attr("height", chart_param.height);

  const nodes = node_data.map((d) => Object.create(d));
  const edges = edge_data.map((d) => ({...d,
    source: nodes.find((n) => n.id === d.source),
    target: nodes.find((n) => n.id === d.target)
  }));

  // Get the midpoint of the canvas
  const svg_center_x = chart_param.width / 2;
  const svg_center_y = chart_param.height / 2;

  // Define the fisheye force function within this scope
  function fisheyeForce(center_x, center_y, strength = 0.5, radius = 30) {
    return (alpha) => {
      nodes.forEach((node) => {
        const dx = node.x - center_x;
        const dy = node.y - center_y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const effect_radius = Math.max(1, radius - distance); // scaling radius
        const scale_factor = 1 + strength * (effect_radius / radius);
        node.x = center_x + dx * scale_factor;
        node.y = center_y + dy * scale_factor;
      });
    };
  }

  // Define the walleye force function within this scope
  function walleyeForce(center_x, center_y, max_radius) {
    return (alpha) => {
      nodes.forEach((node) => {
        const dx = node.x - center_x;
        const dy = node.y - center_y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > max_radius) {
          const pull_factor = max_radius / distance; // Scale to max radius
          node.x = center_x + dx * pull_factor;
          node.y = center_y + dy * pull_factor;
        }
      });
    };
  }

  const sim = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(edges).distance(force_param.link_dist))
    .force("charge", d3.forceManyBody().strength(force_param.strength))
    .force("center", d3.forceCenter(svg_center_x, svg_center_y))
    .force("collide", d3.forceCollide().radius((d) => d.r + 3))
    //.force("fisheye", fisheyeForce(svg_center_x, svg_center_y, force_param.fisheye_strength, force_param.fisheye_radius))
    .force("walleye", walleyeForce(svg_center_x, svg_center_y, force_param.max_radius))
    .stop()
    .tick(force_param.kf)
    .alphaDecay(0.05);

  // draw nodes and edges
  const [node, edge] = draw_nodes(svg, nodes, edges, true, true, sim, tooltip, chart_param);

  // update node and edge positions upon simulation tick
  sim.on("tick", () => {
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    edge
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
  });
}
```

```js
// Organization types and their associated colors
const org_colors = {
  "Federal": "#2ca02c", // green
  "State": "#1f77b4", // blue
  "Local": "#FF0FF5", // pink
  "Fire district": "#d62728", // red
  "NGO": "#9467bd", // purple
  "Other": "#8c564b" // brown
};

// Select the legend div
const legend_div = document.getElementById("network-legend");

// Clear the legend_div to ensure it's empty
legend_div.innerHTML = "";

// Create a legend item for each organization type
Object.keys(org_colors).forEach(org => {
  const legend_item = document.createElement("div");
  legend_item.style.display = "flex";
  legend_item.style.alignItems = "center";
  legend_item.style.marginBottom = "8px";

  // Create the color box
  const color_box = document.createElement("div");
  color_box.style.width = "20px";
  color_box.style.height = "20px";
  color_box.style.backgroundColor = org_colors[org];
  color_box.style.marginRight = "10px";

  // Create the label
  const label = document.createElement("span");
  label.innerText = org;

  // Append the color box and label to the legend item
  legend_item.appendChild(color_box);
  legend_item.appendChild(label);

  // Append the legend item to the legend div
  legend_div.appendChild(legend_item);
});
```

```js
// Define selected_nodeId globally to track the current selection
let selected_node_id = null;
let subfsIds = [];
```

```js
const lookupTable = await FileAttachment("data/orgturf.csv").csv(); // Load the CSV data
```

```js
const turf = FileAttachment("data/turf.topojson").json();
```

```js
// Function to filter the lookup table and log the filtered results
function filterLookupTable(nodeId) {
  const filtered_data = lookupTable.filter(row => row.organization === nodeId);
  if (filtered_data.length > 0) {
    const subfsIds = filtered_data.map(row => row.subfs_id); // Extract subfs_id
    return subfsIds;
  } else {
    return [];
  }
}
```

```js
// Function to convert TopoJSON to GeoJSON and add it to the Leaflet map
function leafletMap(turf, selected_turf_ids = []) {

  // Create a container for the map
  const map_container = document.getElementById("map-container");

  // If there's already a map, remove it to avoid duplications
  if (map_container._leaflet_id) {
    map_container._leaflet_id = null;
  }

  // Initialize the map and set view to Colorado
  const map = L
    .map(map_container, {
        zoomControl: false,     // Disable the zoom control buttons
        scrollWheelZoom: false, // Disable scroll wheel zoom
        dragging: false,        // Disable dragging
        doubleClickZoom: false, // Disable double-click zoom
        boxZoom: false,         // Disable box zoom
        keyboard: false         // Disable keyboard controls
      }
    )
    .setView([39.8, -105.4], 8); // Latitude and longitude for Colorado, zoom level 7

  // Add a tile layer to the map (OpenStreetMap)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Convert TopoJSON to GeoJSON for fireshed polygons
  const turf_features = topojson.feature(turf, turf.objects.fireshed);

  console.log(selected_turf_ids);

  // Filter the GeoJSON based on the selected subfs_ids
  const filtered_turf_features = {
    ...turf_features,
    features: turf_features.features.filter(feature =>
      selected_turf_ids.includes(feature.properties.subfs_id))
  };

  // Clear any existing layers on the map
  map.eachLayer((layer) => {
    if (!!layer.toGeoJSON) {
      map.removeLayer(layer);
    }
  });

  // Add the filtered GeoJSON layer to the map
  const geoJsonLayer = L.geoJSON(filtered_turf_features, {
    style: {
      color: "#3388ff",  // Border color of the polygons
      weight: 2,         // Border width
      opacity: 1,
      fillOpacity: 0.5,  // Fill opacity
      fillColor: "none" // Fill color of the polygons
    }
  }).addTo(map);

  // Fit the map to the bounds of the filtered polygons (if any are selected)
  if (filtered_turf_features.features.length > 0) {
    map.fitBounds(geoJsonLayer.getBounds(), { padding: [5, 5] });
  }
}
```

<div class="hero">
  <h1>Fisheye Diagram</h1>
</div>

This figure below shows organizational connections within the **Colorado Front Range Landscape**.
Organizations are sized based on their number of neighbors and colored by group.
The network layout is controlled using "ball-and-spring forcing" that
repels nodes at the same time that network ties keep connected organizations close.
The layout includes additional two custom effects that push apart tighttly connected
organizations in the core while setting a maximum radius for organizations on the periphery.
Mousing over nodes highlights organizational neighbors and tallies those neighbors by group.

<div class="grid grid-cols-2">
  <div class="card" id="network-card" style="position: relative; padding-left: 50px">
    ${resize((width) => networkDiagram(force_param, chart_param, node_data, edge_data, document.getElementById("network-card")))}
  </div>
  <div class="card" id="map-container" style="height: 600px; width: 100%;">
    ${leafletMap(turf)}
  </div>
</div>
<div class="legend" id="network-legend"></div>


<style>

.hero {
  display: flex;
  flex-direction: column;
  align-items: left;
  font-family: var(--sans-serif);
  margin: 0rem 0 0rem;
  text-wrap: balance;
  text-align: center;
}

.hero h1 {
  margin: 0rem 0;
  padding: 1rem 0;
  max-width: none;
  font-size: 10vw;
  font-weight: 100;
  line-height: 1;
  text-align: left;
  background: linear-gradient(30deg, var(--theme-foreground-focus), currentColor);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero h2 {
  margin: 0;
  max-width: 34em;
  font-size: 20px;
  font-style: initial;
  font-weight: 500;
  line-height: 1.5;
  color: var(--theme-foreground-muted);
}

@media (min-width: 640px) {
  .hero h1 {
    font-size: 90px;
  }
}

.tooltip {
  position: absolute;
  top: 20px;
  left: 0;
  width: 140px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  max-height: 600px;
  overflow-y: auto;
  visibility: hidden;
}

.card {
  position: relative;
  padding-left: 0px;
}

/* Apply the custom font stack */
.legend {
  display: flex;
  flex-direction: row;
  padding: 0px;
  margin-bottom: 20px;
}

/* Style each legend item */
.legend div {
  display: flex;
  align-items: left;
  margin-bottom: 16px;
  padding: 5px;
}

/* Remove the margin for the last item to avoid extra space */
.legend div:last-child {
  margin-bottom: 0;
}

/* Optionally style the labels */
.legend span {
  font-size: 16px;     /* Adjust the font size */
}

/* Ensure color box styling remains intact */
.legend div div {
  width: 10px;
  height: 10px;
  margin-right: 0px;
}

body {
  /*max-width: 800px*/
}
</style>
