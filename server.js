const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

const mongoose = require("mongoose");
const config = require("./config.json");
const Ship = require("./models/ship");

const ports = require("./ports.json");

const WebSocket = require("ws");
const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

mongoose.connect(config.dbURI).then(() => console.log("connected to db!"));

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
      callSign: message.callSign,
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

app.get("/ports", (req, res) => {
  res.json(ports);
});

app.listen(5000);
