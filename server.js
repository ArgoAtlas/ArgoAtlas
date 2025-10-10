import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import config from "./config.json" with { type: "json" };
import Ship from "./models/ship.js";
import Path from "./models/path.js";
import FlowCell from "./models/flowCell.js";
import H3FlowAggregation from "./src/h3FlowAggregation.js";
import ports from "./ports.json" with { type: "json" };
import chokepoints from "./chokepoints.json" with { type: "json" };
import WebSocket from "ws";
import searoute from "searoute-js";

const app = express();
app.use(cors());

let aisSocket = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
let combinedRoutes = [];
const MAX_RECONNECT_DELAY = 60000;
const INITIAL_RECONNECT_DELAY = 1000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;

const MIN_DISTANCE_METERS = 100;
const MIN_TIME_INTERVAL_MS = 5 * 60 * 1000;
const MAX_PATH_POINTS = 1000;
const PATH_RETENTION_DAYS = 7;
const MAX_TELEPORT_DISTANCE_METERS = 500000;

mongoose.connect(config.dbURI).then(() => {
  console.log("connected to db!");
  aggregateFlows();
  cleanupOldPaths();
  connectAIS();
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function updatePosition(mmsi, message) {
  await Ship.findOneAndUpdate(
    { mmsi: mmsi },
    {
      $set: {
        "position.longitude": message.Longitude,
        "position.latitude": message.Latitude,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function updatePath(mmsi, message) {
  const filter = { mmsi: mmsi };
  const path = await Path.findOne(filter);

  let data = {
    points: [],
    lastPoint: null,
    lastPointTime: null,
  };

  if (path) {
    data.points = path.points || [];
    data.lastPoint = path.lastPoint || null;
    data.lastPointTime = path.lastPointTime || null;
  }

  const currentTime = Date.now();
  let shouldAddPoint = false;

  if (!data.lastPoint) {
    shouldAddPoint = true;
  } else {
    const distance = calculateDistance(
      data.lastPoint[1],
      data.lastPoint[0],
      message.Latitude,
      message.Longitude,
    );
    const timeSinceLastPoint = currentTime - data.lastPointTime;

    if (distance >= MAX_TELEPORT_DISTANCE_METERS) {
      console.log(
        `Teleport detected for MMSI ${mmsi}: ${Math.round(distance / 1000)}km - starting new path`,
      );
      data.points = [];
      shouldAddPoint = true;
    } else if (
      distance >= MIN_DISTANCE_METERS &&
      timeSinceLastPoint >= MIN_TIME_INTERVAL_MS
    ) {
      shouldAddPoint = true;
    }
  }

  if (shouldAddPoint) {
    const newPoint = [message.Longitude, message.Latitude];
    data.points.push(newPoint);

    if (data.points.length > MAX_PATH_POINTS) {
      data.points = data.points.slice(-MAX_PATH_POINTS);
    }

    data.lastPoint = newPoint;
    data.lastPointTime = currentTime;
  }

  await Path.updateOne(filter, data, { upsert: true });
}

async function updateRoutes() {
  const shipsResponse = await fetch(`http://localhost:5000/ships`);
  const portsResponse = await fetch(`http://localhost:5000/ports`);

  const ships = await shipsResponse.json();
  const ports = await portsResponse.json();

  combinedRoutes = [];

  ships.forEach((ship) => {
    let shipDestination =
      typeof ship.destination === "string"
        ? ship.destination.trim().toLowerCase()
        : ""; // Check if ship has destination data
    if (shipDestination.includes(">")) {
      // Extract the part of the destination that matches the port name
      shipDestination = shipDestination.split(">")[1].trim(); // Extract part after '>'
    }

    if (
      typeof ship.position.longitude !== "number" ||
      typeof ship.position.latitude !== "number"
    ) {
      // make sure coordinates are valid
      return;
    }

    const shipCoords = [ship.position.longitude, ship.position.latitude];

    // Iterate over all ports to find matching destination port
    for (const port of ports.features) {
      const portName = port.properties.name.trim().toLowerCase();
      const portCoords = [
        port.geometry.coordinates[0],
        port.geometry.coordinates[1],
      ];

      if (shipDestination === portName) {
        // Check if the port matches the ship's destination
        try {
          // Create GeoJSON objects for origin (ship) and destination (port)
          const origin = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: shipCoords,
            },
          };

          const destination = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: portCoords,
            },
          };

          const route = searoute(origin, destination); // Calculate route using searoute-js
          if (
            route &&
            route.geometry &&
            route.geometry.coordinates &&
            route.geometry.coordinates.length > 1
          ) {
            // Check if the route contains valid data
            let detailedPath = route.geometry.coordinates;

            if (
              detailedPath[0][0] !== shipCoords[0] ||
              detailedPath[0][1] !== shipCoords[1]
            ) {
              detailedPath = [shipCoords, ...detailedPath];
            }

            // Ensure the last coordinate matches the destination port's coordinates
            if (
              detailedPath[detailedPath.length - 1][0] !== portCoords[0] ||
              detailedPath[detailedPath.length - 1][1] !== portCoords[1]
            ) {
              detailedPath = [...detailedPath, portCoords];
            }

            const matchedData = {
              time: ship.time,
              ship: ship.name.trim(),
              port: port.properties.name,
              path: detailedPath,
            };

            combinedRoutes.push(matchedData);
          }
        } catch (error) {}
        break; // Stop after finding the first matching port
      }
    }
  });
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

async function aggregateFlows() {
  try {
    await H3FlowAggregation.aggregateAllFlows();
  } catch (error) {
    console.error("Flow aggregation error:", error.message);
  }

  setTimeout(aggregateFlows, 5 * 60 * 1000);
}

async function cleanupOldPaths() {
  try {
    const cutoffTime = Date.now() - PATH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const result = await Path.deleteMany({
      lastPointTime: { $lt: cutoffTime },
    });
    if (result.deletedCount > 0) {
      console.log(`Deleted ${result.deletedCount} old paths`);
    }
  } catch (error) {
    console.error("Path cleanup error:", error.message);
  }

  setTimeout(cleanupOldPaths, 24 * 60 * 60 * 1000); // Run daily
}

function connectAIS() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  console.log("Connecting to AIS stream...");
  aisSocket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  aisSocket.addEventListener("open", () => {
    console.log("✓ Connected to AIS stream");
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection

    const subscriptionMessage = {
      Apikey: config.aisKey,
      BoundingBoxes: [
        [
          [-90, -180],
          [90, 180],
        ],
      ],
    };

    try {
      aisSocket.send(JSON.stringify(subscriptionMessage));
      console.log("✓ Subscribed to global AIS data");
    } catch (error) {
      console.error("Failed to send subscription message:", error.message);
    }
  });

  aisSocket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.MessageType) {
        case "PositionReport":
          if (message.Message.PositionReport.PositionAccuracy) {
            updatePosition(
              message.MetaData.MMSI,
              message.Message.PositionReport,
            );
            updatePath(message.MetaData.MMSI, message.Message.PositionReport);
          }
          break;
        case "ShipStaticData":
          updateShipData(message.MetaData.MMSI, message.Message.ShipStaticData);
          break;
      }
    } catch (error) {
      console.error("Error processing AIS message:", error.message);
    }
  });

  aisSocket.addEventListener("error", (error) => {
    console.error("AIS WebSocket error:", error.message || "Unknown error");
  });

  aisSocket.addEventListener("close", (event) => {
    console.log(
      `✗ AIS connection closed. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}`,
    );

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY *
        Math.pow(RECONNECT_BACKOFF_MULTIPLIER, reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );

    reconnectAttempts++;

    console.log(
      `⟳ Reconnecting to AIS stream in ${delay / 1000}s (attempt ${reconnectAttempts})...`,
    );

    reconnectTimeout = setTimeout(() => {
      connectAIS();
    }, delay);
  });

  let heartbeatInterval = setInterval(() => {
    if (aisSocket && aisSocket.readyState === WebSocket.OPEN) {
      console.log("AIS connection alive");
    } else if (aisSocket && aisSocket.readyState === WebSocket.CONNECTING) {
      console.log("AIS connection still establishing...");
    } else {
      console.log("AIS connection appears dead, clearing heartbeat");
      clearInterval(heartbeatInterval);
    }
  }, 30000);
  aisSocket.addEventListener("close", () => {
    clearInterval(heartbeatInterval);
  });
}

function shutdown() {
  console.log("\nShutting down gracefully...");

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  if (aisSocket) {
    aisSocket.close(1000, "Server shutting down");
  }

  mongoose.disconnect().then(() => {
    console.log("Disconnected from database");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.get("/ships", async (req, res) => {
  const ships = await Ship.find().lean();
  res.send(ships);
});

app.get("/paths", async (req, res) => {
  const paths = await Path.find().lean();
  res.send(paths);
});

app.get("/flows", async (req, res) => {
  const zoom = parseInt(req.query.zoom) || 2;
  const resolution = H3FlowAggregation.getResolutionForZoom(zoom);

  const minCount = parseInt(req.query.minCount) || 1;

  const flows = await H3FlowAggregation.getFlowsForVisualization(
    resolution,
    minCount,
  );
  res.send(flows);
});

app.get("/ports", (req, res) => {
  res.send(ports);
});

app.get("/chokepoints", (req, res) => {
  res.send(chokepoints);
});

app.get("/routes", async (req, res) => {
  res.json(combinedRoutes);
});

app.get("/health", (req, res) => {
  const aisStatus = aisSocket
    ? {
        connected: aisSocket.readyState === WebSocket.OPEN,
        state: ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][
          aisSocket.readyState
        ],
        reconnectAttempts,
      }
    : {
        connected: false,
        state: "NOT_INITIALIZED",
        reconnectAttempts,
      };

  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ais: aisStatus,
    uptime: process.uptime(),
  });
});

app.listen(5000, () => {
  console.log("Server listening on port 5000");
});

updateRoutes();
