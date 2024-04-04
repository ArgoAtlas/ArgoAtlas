const serverAddress = "http://localhost:5000";

d3.select("#map").style("position", "relative");
const canvas = d3.select("#map").append("canvas").node();
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", canvas.width)
  .attr("height", canvas.height)
  .style("position", "absolute")
  .style("top", "0px")
  .style("left", "0px");

d3.queue()
  .defer(d3.json, "../dist/world.topojson") // data for countries
  .await(ready);

var projection = d3
  .geoMercator()
  .translate([canvas.width / 2, canvas.height / 2]) // centering
  .scale(110);

var path = d3.geoPath().projection(projection); // create path with projection -> aus Punkten Pfade machen und ausfüllen

var g = svg.append("g"); // ============================================================================================================================================================================================================== mui importante

function ready(error, data) {
  console.log(data);
  var countries = topojson.feature(data, data.objects.countries).features;

  console.log(countries);

  g.selectAll(".country") // Länder
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .append("title")
    .text((d) => d.properties.name);

  svg.call(
    d3.zoom().on("zoom", () => {
      // pan & zoom functionality
      g.attr("transform", d3.event.transform);
    }),
  );
}

async function drawCanvas() {
  const response = await fetch(`${serverAddress}/ships`);
  const ships = await response.json();

  ships.forEach((ship) => {
    const coords = projection([ship.longitude, ship.latitude]);

    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(coords[0], coords[1], 0.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
  });

  console.log("updated");
}

d3.timer(drawCanvas, 1000);
