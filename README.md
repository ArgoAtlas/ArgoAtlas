# ArgoAtlas

Real-time global maritime traffic visualization: live ship positions, world ports, chokepoints, and aggregated shipping flows on an interactive map.

<img width="1919" height="989" alt="ArgoAtlas world view" src="https://github.com/user-attachments/assets/783bfaab-b6d4-46fb-83d1-f0e486bc4967" />

## Overview

ArgoAtlas subscribes to a global AIS stream over WebSocket and persists ship positions and
tracks into MongoDB. A background job bins those tracks into [Uber H3](https://h3geo.org/)
cells to derive aggregated traffic flows, and an Express API serves everything to a
deck.gl + MapLibre GL frontend that renders it as a live world map.

## Features

- **Live ship positions** from a global AIS feed, refreshed on the map every 5 seconds
- **Historical tracks** per vessel, retained for 7 days with teleport/noise filtering
- **1081 world ports** (Natural Earth `ne_10m_ports`) with hover details
- **12 maritime chokepoints** (Hormuz, Malacca, Suez, Panama, Bab el-Mandeb and others), annotated with width and strategic significance
- **Destination routing**: ships broadcasting a recognized destination port get a computed sea route via `searoute-js`
- **Zoom-adaptive flow arcs**: H3 aggregation at three resolutions, preloaded and swapped as you zoom
- **Per-layer toggles** for ports, routes, ships, flows, and chokepoints
- **Automatic light/dark basemap** following your OS color scheme

## Architecture

```
aisstream.io --ws--> server.js --> MongoDB --> H3 flow aggregation
                        |                            |
                        +-------- REST (:5000) ------+
                                     |
                                     v
                     deck.gl + MapLibre GL frontend
```

The server ingests AIS messages continuously, re-runs flow aggregation every 5 minutes, and
prunes stale tracks daily. The frontend is a static bundle that polls the REST API.

| Path                       | Role                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `server.js`                | AIS ingest, MongoDB writes, route matching, Express API         |
| `src/h3FlowAggregation.js` | Bins ship tracks into H3 cells and aggregates flow counts       |
| `src/index.js`             | Frontend: MapLibre map, deck.gl layers, tooltips, layer toggles |
| `src/flowCli.js`           | CLI for aggregating, inspecting, and clearing flow data         |
| `models/`                  | Mongoose schemas: `ship.js`, `path.js`, `flowCell.js`           |
| `ports.json`               | GeoJSON of world ports                                          |
| `chokepoints.json`         | GeoJSON of maritime chokepoints                                 |
| `dist/`                    | Static frontend (`index.html`, `styles.css`, bundled `main.js`) |

## Getting Started

### Prerequisites

- Node.js
- A MongoDB instance (local or hosted)
- A free API key from [aisstream.io](https://aisstream.io/)

If you use Nix, `nix develop` (or `direnv allow`, via the included `.envrc`) gives you a
shell with Node.js already available.

### Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Create your config**

   ```sh
   cp config.json.example config.json
   ```

   Fill in both fields. `config.json` is gitignored, so your key stays local:

   ```json
   {
     "aisKey": "your-aisstream-api-key",
     "dbURI": "mongodb://localhost:27017/argoatlas"
   }
   ```

3. **Start the backend** (port 5000)

   ```sh
   npm run devStart
   ```

4. **Start the frontend** in a second terminal

   ```sh
   npm start
   ```

The map opens empty and fills in as AIS messages arrive. A track only gains a point once a
ship has moved at least 100 m and 5 minutes have passed, so flow arcs take a while to build
up. Flow aggregation runs automatically every 5 minutes; to force a pass early, run
`npm run flows:aggregate`.

## Configuration

`config.json`:

| Field    | Description               |
| -------- | ------------------------- |
| `aisKey` | aisstream.io API key      |
| `dbURI`  | MongoDB connection string |

Two addresses are currently hardcoded and need editing if you deploy elsewhere:

- The backend listens on port `5000` (`server.js`)
- The frontend targets `http://localhost:5000` (`src/index.js:11`)

Ingest behavior is tuned by constants at the top of `server.js`:

| Constant                       | Default | Effect                                            |
| ------------------------------ | ------- | ------------------------------------------------- |
| `MIN_DISTANCE_METERS`          | 100     | Minimum movement before a track point is recorded |
| `MIN_TIME_INTERVAL_MS`         | 5 min   | Minimum time between track points                 |
| `MAX_PATH_POINTS`              | 1000    | Points retained per vessel track                  |
| `PATH_RETENTION_DAYS`          | 7       | Age at which tracks are deleted                   |
| `MAX_TELEPORT_DISTANCE_METERS` | 500 km  | Jump size treated as bad data; restarts the track |

## API Reference

| Route                        | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `GET /ships`                 | All tracked ships (MMSI, name, call sign, destination, position) |
| `GET /paths`                 | Historical ship tracks                                           |
| `GET /flows?zoom=&minCount=` | Aggregated H3 flows; H3 resolution is derived from `zoom`        |
| `GET /ports`                 | Port GeoJSON                                                     |
| `GET /chokepoints`           | Chokepoint GeoJSON                                               |
| `GET /routes`                | Computed sea routes for ships with a matched destination port    |
| `GET /health`                | Database and AIS connection status, reconnect count, uptime      |

Flow resolution scales with zoom: H3 resolution 3 at zoom 4 and below, resolution 4 at
zoom 5-7, and resolution 5 at zoom 8 and above. Responses are capped at the 10,000 busiest
flows.

## Flow CLI

| Command                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `npm run flows:aggregate` | Re-run flow aggregation across all stored tracks       |
| `npm run flows:stats`     | Print track count and the busiest flows per resolution |
| `npm run flows:cleanup`   | Delete low-traffic flows older than 7 days             |
| `npm run flows:clear`     | Delete all flow data                                   |

To use a different cleanup window, call the script directly:
`node src/flowCli.js cleanup 30`.

## Development

```sh
npm run build    # bundle the frontend into dist/
npm run watch    # rebuild on change
```

The project uses ESLint (flat config) with Prettier. A husky `pre-commit` hook runs
`lint-staged`, which formats staged files with Prettier automatically.

## Data Sources

- AIS positions: [aisstream.io](https://aisstream.io/)
- Ports: [Natural Earth](https://www.naturalearthdata.com/) `ne_10m_ports`
- Chokepoints: hand-curated (`chokepoints.json`)
- Basemaps: [CARTO](https://carto.com/basemaps/) Dark Matter / Positron

## Screenshots

<img width="1919" height="988" alt="image" src="https://github.com/user-attachments/assets/e66359ee-8fe5-4e5f-ace2-ec9572616d93" />
<img width="1919" height="997" alt="Screenshot 2025-02-09 192520" src="https://github.com/user-attachments/assets/4eb76d4a-67a7-4073-bc16-4081fcdb718d" />
<img width="1919" height="990" alt="Screenshot 2025-02-09 192713" src="https://github.com/user-attachments/assets/0ef4a526-fd8e-4e8b-8c8c-df20dceab1e6" />
<img width="1919" height="986" alt="image" src="https://github.com/user-attachments/assets/6a5e1f9c-2549-44b6-8ea9-ed6000a62e0d" />
<img width="1919" height="989" alt="Screenshot 2025-02-09 193437" src="https://github.com/user-attachments/assets/078331c6-f6b4-4c27-af76-685a9ab60791" />

## License

GPL-3.0
