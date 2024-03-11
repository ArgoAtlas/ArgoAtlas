import * as d3 from "d3";

const socket = new WebSocket("ws://localhost:3000");

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
const projection = d3.geoEquirectangular();
const geoGenerator = d3.geoPath().projection(projection);

function updateMap(json) {
  projection.fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    json,
  );

  svg
    .append("path")
    .datum({
      type: "FeatureCollection",
      features: json.features,
    })
    .attr("d", geoGenerator)
    .attr("fill", "#f8fafc")
    .attr("stroke", "#020617");

  const zoom = d3
    .zoom()
    .scaleExtent([1, 5])
    .on("zoom", (event) => {
      const { transform } = event;
      svg.selectAll("path").attr("transform", transform);
      svg.selectAll("circle").attr("transform", transform);
    });
  svg.call(zoom);
}

d3.json("countries.json").then((data) => updateMap(data));

// socket.onopen = function (event) {
//   console.log("socket is open", event);
//   const subscriptionMessage = {
//     Apikey: config.aisKey,
//     BoundingBoxes: [
//       [-180, -90],
//       [180, 90],
//     ],
//   };
//   socket.send(JSON.stringify(subscriptionMessage));
// };

socket.onmessage = function (event) {
  const message = JSON.parse(event.data);

  if (message.MessageType === "PositionReport") {
    const coords = projection([
      message.MetaData.longitude,
      message.MetaData.latitude,
    ]);
    svg
      .append("circle")
      .attr("cx", coords[0])
      .attr("cy", coords[1])
      .attr("r", 1)
      .style("fill", "red")
      .append("title")
      .text(message.MetaData.ShipName);
  }
};
