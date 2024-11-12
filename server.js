import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import config from "./config.json" with { type: "json" };
import Ship from "./models/ship.js";
import Path from "./models/path.js";
import Graph from "./models/graph.js";
import Bundle from "./models/bundle.js";
import ProximityGraph from "./models/proximityGraph.js";
import GraphHelper from "./src/graphHelper.js";
import EdgeBundling from "./src/edgeBundling.js";
import ports from "./ports.json" with { type: "json" };
import WebSocket from "ws";
import { k } from "./src/edgeBundling.js";

const app = express();
app.use(cors());

const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

const decisionInterval = 1;
const referenceValue = decisionInterval / 2;
const maximumEntries = 5;

mongoose.connect(config.dbURI).then(() => console.log("connected to db!"));

// compute cumulative sum, used to detect deviations
function calculateCusum(prevPositive, prevNegative, target, sample) {
  const positiveSum = Math.max(
    0,
    prevPositive + sample - target - referenceValue,
  );
  const negativeSum = Math.max(
    0,
    prevNegative - sample + target - referenceValue,
  );

  return [positiveSum, negativeSum];
}

function checkCusumThreshold(result) {
  return result[0] > decisionInterval || result[1] > decisionInterval;
}

function calculateAverage(values) {
  const total = values.reduce((a, b) => a + b, 0);

  return total / values.length || 0;
}

async function updatePosition(mmsi, message) {
  const ships = await Ship.find({ mmsi: mmsi });

  if (ships.length > 0) {
    ships.forEach((ship) => {
      ship.position.longitude = message.Longitude;
      ship.position.latitude = message.Latitude;
      ship.save();
    });
  } else {
    await Ship.create({
      mmsi: mmsi,
      name: "UNKNOWN",
      callSign: "UNKNOWN",
      destination: "UNKNOWN",
      position: {
        longitude: message.Longitude,
        latitude: message.Latitude,
      },
    });
  }
}

async function updatePath(mmsi, message) {
  const filter = { mmsi: mmsi };
  const path = await Path.findOne(filter);

  let data = {
    points: [],
    latitude: {
      deltas: [],
      previous: [],
      controlPositive: 0,
      controlNegative: 0,
    },
    longitude: {
      deltas: [],
      previous: [],
      controlPositive: 0,
      controlNegative: 0,
    },
    cog: {
      deltas: [],
      previous: [],
      controlPositive: 0,
      controlNegative: 0,
    },
    sog: {
      deltas: [],
      previous: [],
      controlPositive: 0,
      controlNegative: 0,
    },
    turnRate: {
      deltas: [],
      previous: [],
      controlPositive: 0,
      controlNegative: 0,
    },
  };

  if (path) {
    data = {
      points: path.points,
      latitude: path.latitude,
      longitude: path.longitude,
      cog: path.cog,
      sog: path.sog,
      turnRate: path.turnRate,
    };
  }

  // reset path if position data differs strongly
  if (
    Math.abs(
      data.latitude.previous[data.latitude.previous.length - 1] -
        message.Latitude,
    ) > 0.5 ||
    Math.abs(
      data.longitude.previous[data.latitude.previous.length - 1] -
        message.Longitude,
    ) > 0.5
  ) {
    data.points = [];
    data.latitude.previous = [];
    data.latitude.controlPositive = 0;
    data.latitude.controlNegative = 0;
    data.longitude.previous = [];
    data.longitude.controlPositive = 0;
    data.longitude.controlNegative = 0;
  }

  const latitudeCusum = calculateCusum(
    data.latitude.controlPositive,
    data.latitude.controlNegative,
    calculateAverage(data.latitude.previous),
    message.Latitude,
  );
  const longitudeCusum = calculateCusum(
    data.longitude.controlPositive,
    data.longitude.controlNegative,
    calculateAverage(data.longitude.previous),
    message.Longitude,
  );
  const cogCusum = calculateCusum(
    data.cog.controlPositive,
    data.cog.controlNegative,
    calculateAverage(data.cog.previous),
    message.Cog,
  );
  const sogCusum = calculateCusum(
    data.sog.controlPositive,
    data.sog.controlNegative,
    calculateAverage(data.sog.previous),
    message.Sog,
  );
  const turnRateCusum = calculateCusum(
    data.turnRate.controlPositive,
    data.turnRate.controlNegative,
    calculateAverage(data.turnRate.previous),
    message.RateOfTurn,
  );

  if (data.latitude.previous.length >= maximumEntries) {
    data.latitude.previous.shift();
  }

  if (data.longitude.previous.length >= maximumEntries) {
    data.longitude.previous.shift();
  }

  if (data.cog.previous.length >= maximumEntries) {
    data.cog.previous.shift();
  }

  if (data.sog.previous.length >= maximumEntries) {
    data.sog.previous.shift();
  }

  if (data.turnRate.previous.length >= maximumEntries) {
    data.turnRate.previous.shift();
  }

  data.latitude.previous.push(message.Latitude);
  data.longitude.previous.push(message.Longitude);
  data.cog.previous.push(message.Cog);
  data.sog.previous.push(message.Sog);
  data.turnRate.previous.push(message.RateOfTurn);

  if (
    checkCusumThreshold(latitudeCusum) ||
    checkCusumThreshold(longitudeCusum) ||
    checkCusumThreshold(cogCusum) ||
    checkCusumThreshold(sogCusum) ||
    checkCusumThreshold(turnRateCusum)
  ) {
    data.points.push([message.Longitude, message.Latitude]);

    const nearbyPoints = await Graph.find({
      position: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [message.Longitude, message.Latitude],
          },
          $maxDistance: 450,
        },
      },
    });

    if (nearbyPoints.length <= 0) {
      const newVertex = new Graph({
        position: [message.Longitude, message.Latitude],
      });
      newVertex.save();

      const connectionPoints = await Graph.find({
        position: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [message.Longitude, message.Latitude],
            },
            $maxDistance: 500,
          },
        },
      }).limit(k);

      for (const point of connectionPoints) {
        if (newVertex.id !== point.id) {
          await GraphHelper.addEdge(newVertex.id, point.id);
          await GraphHelper.addEdge(point.id, newVertex.id);
        }
      }
    }

    data.latitude.controlPositive = 0;
    data.latitude.controlNegative = 0;
    data.longitude.controlPositive = 0;
    data.longitude.controlNegative = 0;
    data.cog.controlPositive = 0;
    data.cog.controlNegative = 0;
    data.sog.controlPositive = 0;
    data.sog.controlNegative = 0;
    data.turnRate.controlPositive = 0;
    data.turnRate.controlNegative = 0;
  } else {
    data.latitude.controlPositive = latitudeCusum[0];
    data.latitude.controlNegative = latitudeCusum[1];
    data.longitude.controlPositive = longitudeCusum[0];
    data.longitude.controlNegative = longitudeCusum[1];
    data.cog.controlPositive = cogCusum[0];
    data.cog.controlNegative = cogCusum[1];
    data.sog.controlPositive = sogCusum[0];
    data.sog.controlNegative = sogCusum[1];
    data.turnRate.controlPositive = turnRateCusum[0];
    data.turnRate.controlNegative = turnRateCusum[1];
  }

  await Path.updateOne(filter, data, { upsert: true });
}

async function updateShipData(mmsi, message) {
  const ships = await Ship.find({ mmsi: mmsi });

  if (ships.length > 0) {
    ships.forEach((ship) => {
      ship.name = message.Name;
      ship.callSign = message.CallSign;
      ship.destination = message.Destination;
      ship.save();
    });
  } else {
    await Ship.create({
      mmsi: mmsi,
      name: message.Name,
      callSign: message.CallSign,
      destination: message.Destination,
      position: {
        longitude: 0,
        latitude: 0,
      },
    });
  }
}

async function bundling() {
  await EdgeBundling.performEdgeBundling();

  setTimeout(bundling, 10000);
}

socket.addEventListener("open", () => {
  const subscriptionMessage = {
    Apikey: config.aisKey,
    BoundingBoxes: [
      [
        [-90, -180],
        [90, 180],
      ],
    ],
  };
  socket.send(JSON.stringify(subscriptionMessage));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  switch (message.MessageType) {
    case "PositionReport":
      if (message.Message.PositionReport.PositionAccuracy) {
        updatePosition(message.MetaData.MMSI, message.Message.PositionReport);
        updatePath(message.MetaData.MMSI, message.Message.PositionReport);
      }
      break;
    case "ShipStaticData":
      updateShipData(message.MetaData.MMSI, message.Message.ShipStaticData);
      break;
  }
});

app.get("/ships", async (req, res) => {
  const ships = await Ship.find().lean();
  res.send(ships);
});

app.get("/paths", async (req, res) => {
  const paths = await Path.find().lean();
  res.send(paths);
});

app.get("/graph", async (req, res) => {
  const graph = await Graph.find().lean();
  res.send(graph);
});

app.get("/bundle", async (req, res) => {
  const bundle = await Bundle.find().lean();
  res.send(bundle);
});

app.get("/proximityGraph", async (req, res) => {
  const proximityGraph = await ProximityGraph.find().lean();
  res.send(proximityGraph);
});

app.get("/ports", (req, res) => {
  res.send(ports);
});

app.listen(5000);
bundling();
