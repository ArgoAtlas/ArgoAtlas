import Graph from "./graph.js";
import mongoose from "mongoose";
import config from "../config.json" with { type: "json" };
import Path from "../models/path.js";

mongoose.connect(config.dbURI).then(() => console.log("connected!"));

async function createGraph() {
  const paths = await Path.find({});
  const g = new Graph();

  let counter = 0;
  let countAlways = 0;

  paths.forEach((path) => {
    path.points.forEach((point) => {
      console.log(countAlways, counter);
      const longitude = Math.floor(point[0] * 10000) / 10000;
      const latitude = Math.floor(point[1] * 10000) / 10000;

      let overwriteID = -1;

      Object.entries(g.valueList).forEach(([id, position]) => {
        if (
          Math.abs(longitude - position[0]) < 0.005 &&
          Math.abs(latitude - position[1]) < 0.005
        ) {
          overwriteID = id;
          return;
        }
      });

      if (overwriteID >= 0) {
        const oldPos = g.valueList[overwriteID];

        g.valueList[overwriteID] = [
          (oldPos[0] + longitude) / 2,
          (oldPos[1] + latitude) / 2,
        ];
      } else {
        g.addVertex(counter, [longitude, latitude]);
        counter++;
      }
      countAlways++;
    });
  });

  // Object.entries(g.valueList).forEach(([id, position]) => {
  //   if (g.adjacencyList[id]) {
  //     console.log("id:", id);
  //     for (let i = id + 1; i < Object.entries(g.valueList).length; i++) {
  //       console.log("i:", i);
  //       if (g.valueList[i]) {
  //         const vertLong = g.valueList[i][0];
  //         const vertLat = g.valueList[i][1];

  //         if (
  //           position[0] - vertLong <= 0.5 &&
  //           position[0] - vertLong >= -0.5 &&
  //           position[1] - vertLat <= 0.5 &&
  //           position[1] - vertLat >= -0.5
  //         ) {
  //           g.removeVertex(i);
  //           g.valueList[id] = [
  //             (position[0] + vertLong) / 2,
  //             (position[1] + vertLat) / 2,
  //           ];
  //         }
  //       }
  //     }
  //   }
  // });

  return g;
}

const graph = await createGraph();
console.log(graph.valueList);
