const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

const mongoose = require("mongoose");
const config = require("./config.json");
const Ship = require("./models/ship");
const Path = require("./models/path");

const ports = require("./ports.json");

const WebSocket = require("ws");
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

  if (data.latitude.previous.length >= maximumEntries) {
    data.latitude.previous.shift();
  }

  if (data.longitude.previous.length >= maximumEntries) {
    data.longitude.previous.shift();
  }

  data.latitude.previous.push(message.Latitude);
  data.longitude.previous.push(message.Longitude);

  if (
    checkCusumThreshold(latitudeCusum) ||
    checkCusumThreshold(longitudeCusum)
  ) {
    data.points.push([message.Longitude, message.Latitude]);
    data.latitude.controlPositive = 0;
    data.latitude.controlNegative = 0;
    data.longitude.controlPositive = 0;
    data.longitude.controlNegative = 0;
  } else {
    data.latitude.controlPositive = latitudeCusum[0];
    data.latitude.controlNegative = latitudeCusum[1];
    data.longitude.controlPositive = longitudeCusum[0];
    data.longitude.controlNegative = longitudeCusum[1];
  }

  await Path.updateOne(filter, data, { upsert: true });

  console.log("CUSUM:", latitudeCusum, longitudeCusum);
  console.log("Position:", message.Latitude, message.Longitude);
  console.log("Path:", path);
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
        longitude: -180,
        latitude: -90,
      },
    });
  }
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
      updatePosition(message.MetaData.MMSI, message.Message.PositionReport);
      updatePath(message.MetaData.MMSI, message.Message.PositionReport);
      break;
    case "ShipStaticData":
      updateShipData(message.MetaData.MMSI, message.Message.ShipStaticData);
      break;
  }
});

app.get("/ships", async (req, res) => {
  const ships = await Ship.find();
  res.json(ships);
});

app.get("/paths", async (req, res) => {
  const paths = await Path.find();
  res.json(paths);
});

app.get("/ports", (req, res) => {
  res.json(ports);
});

app.listen(5000);
