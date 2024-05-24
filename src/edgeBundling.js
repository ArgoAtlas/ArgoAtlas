import Graph from "./graph.js";
import mongoose from "mongoose";
import config from "../config.json" with { type: "json" };
import Path from "../models/path.js";

mongoose.connect(config.dbURI).then(() => console.log("connected!"));

async function createGraph() {
  const paths = await Path.find({});
  const g = new Graph();

  paths.forEach((path) => {
    path.points.forEach((point) => {
      g.addVertex(`${path.mmsi}-${point[0]}-${point[1]}`);
    });
  });

  return g;
}

const graph = await createGraph();
console.log(Object.keys(graph.adjacencyList).length);
