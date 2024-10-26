const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

const mongoose = require("mongoose");
const config = require("./config.json");
const Ship = require("./models/ship");

const ports = require("./ports.json");
const chokepoints = require("./chokepoints.json");
const chokepointsSecondary = require("./chokepointsSecondary.json");

const WebSocket = require("ws");

mongoose.connect(config.dbURI).then(() => console.log("connected to db!"));

async function updatePosition(mmsi, time, message) {
  const ships = await Ship.find({ mmsi: mmsi }); // avoid duplicates

  if (ships.length > 0) {
    ships.forEach((ship) => {
      ship.position.longitude = message.Longitude;
      ship.position.latitude = message.Latitude;
      ship.time = time.slice(0, 19) + time.slice(-10); // avoid display of milliseconds
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
      time: time.slice(0, 19) + time.slice(-10), // avoid display of milliseconds
    });
  }
}

async function updateShipData(mmsi, time, message) {
  const ships = await Ship.find({ mmsi: mmsi }); // avoid duplicates

  if (ships.length > 0) {
    ships.forEach((ship) => {
      ship.name = message.Name;
      ship.callSign = message.CallSign;
      ship.destination = message.Destination;
      ship.time = time.slice(0, 19) + time.slice(-10); // avoid display of milliseconds
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
      time: time.slice(0, 19) + time.slice(-10), // avoid display of milliseconds
    });
  }
}

function connectWebSocket() {
  // function needed to reconnect after 5 minute socket timeout
  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  socket.addEventListener("open", () => {
    console.log("connected to aisstream socket!");

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
        updatePosition(
          message.MetaData.MMSI,
          message.MetaData.time_utc,
          message.Message.PositionReport,
        );
        break;
      case "ShipStaticData":
        updateShipData(
          message.MetaData.MMSI,
          message.MetaData.time_utc,
          message.Message.ShipStaticData,
        );
        break;
    }
  });

  socket.addEventListener("close", () => {
    console.log("socket closed, reconnecting...");
    setTimeout(connectWebSocket, 1000); // reconnect after 1 second
  });
}

app.get("/ships", async (req, res) => {
  const ships = await Ship.find();
  res.json(ships);
});

app.get("/ports", (req, res) => {
  res.json(ports);
});

app.get("/chokepoints", (req, res) => {
  res.json(chokepoints);
});

app.get("/chokepointsSecondary", (req, res) => {
  res.json(chokepointsSecondary);
});

app.listen(5000); // port 5000
connectWebSocket();
