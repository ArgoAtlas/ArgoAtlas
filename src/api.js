const { WebSocket, WebSocketServer } = require("ws");
const config = require("../config.json");

const wss = new WebSocketServer({ port: 3000 });
const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

socket.onopen = function (event) {
  let subscriptionMessage = {
    Apikey: config.aisKey,
    BoundingBoxes: [
      [
        [-90, -180],
        [90, 180],
      ],
    ],
  };
  socket.send(JSON.stringify(subscriptionMessage));
};

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  socket.onmessage = function (event) {
    let aisMessage = JSON.parse(event.data);
    ws.send(JSON.stringify(aisMessage));
  };
});