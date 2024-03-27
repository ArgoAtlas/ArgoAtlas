const express = require("express");
const app = express();
const mongoose = require("mongoose");
const config = require("../config.json");
const Ship = require("./Ship");

const WebSocket = require("ws");
const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

mongoose.connect(config.dbURI).then(() => console.log("connected to db!"));

async function update(mmsi, message) {
  const ships = await Ship.find({ mmsi: mmsi });

  if (ships.length > 0) {
    ships.forEach((ship) => {
      ship.longitude = message.Longitude;
      ship.latitude = message.Latitude;
      ship.save();
    });
  } else {
    await Ship.create({
      mmsi: mmsi,
      longitude: message.Longitude,
      latitude: message.Latitude,
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

  if (message.MessageType === "PositionReport") {
    update(message.MetaData.MMSI, message.Message.PositionReport);
  }
});

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(5000);
