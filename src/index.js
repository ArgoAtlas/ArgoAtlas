import { Deck } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

const serverAddress = "http://localhost:5000";

const INITIAL_VIEW_STATE = {
  latitude: 0,
  longitude: 0,
  zoom: 2,
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
        stroked: false,
        filled: true,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0],
        radiusMinPixels: 2,
        radiusMaxPixels: 3,
      }),
      new GeoJsonLayer({
        id: "map",
        data: `${serverAddress}/countries`,
        filled: true,
        getLineColor: [255, 255, 255],
      }),
    ],
  });

  setTimeout(update, 1000);
}
update();
