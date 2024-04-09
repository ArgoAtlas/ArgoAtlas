import { Deck } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

const serverAddress = "http://localhost:5000";

const INITIAL_VIEW_STATE = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
};

const deckInstance = new Deck({
  initialViewState: INITIAL_VIEW_STATE,
  controller: true,
});

function update() {
  deckInstance.setProps({
    layers: [
      new ScatterplotLayer({
        id: "points",
        data: `${serverAddress}/ships`,
        filled: true,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0],
        radiusMinPixels: 2,
        radiusMaxPixels: 3,

        pickable: true,
        onHover: ({ object, x, y }) => {
          const el = document.getElementById("tooltip");
          if (object) {
            const { mmsi } = object;
            el.innerHTML = `<h1>MMSI: ${mmsi}</h1>`;
            el.style.display = "block";
            el.style.opacity = 0.9;
            el.style.left = x + "px";
            el.style.top = y + "px";
          } else {
            el.style.opacity = 0.0;
          }
        },
      }),
      new GeoJsonLayer({
        id: "map",
        data: `${serverAddress}/countries`,
        stroked: true,
        filled: true,
        getFillColor: [185, 117, 29, 101],
        getLineColor: [0, 0, 0],
        lineWidthMinPixels: 0.5,
      }),
    ],
  });

  setTimeout(update, 1000);
}
update();
