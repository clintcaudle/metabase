import L from "leaflet";
import _ from "underscore";

import { getSubpathSafeUrl } from "metabase/lib/urls";
import { isPK } from "metabase-lib/v1/types/utils/isa";

import { markerIcons } from "./CarinaIcons";
import LeafletMap from "./LeafletMap";

export default class LeafletMarkerPinMap extends LeafletMap {
  componentDidMount() {
    super.componentDidMount();

    this.pinMarkerLayer = L.layerGroup([]).addTo(this.map);
    this.pinMarkerIcon = L.icon({
      iconUrl: getSubpathSafeUrl("app/assets/img/pin.png"),
      iconSize: [28, 32],
      iconAnchor: [15, 24],
      popupAnchor: [0, -13],
    });

    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps, prevState) {
    super.componentDidUpdate(prevProps, prevState);

    try {
      const plotRangeForDepth = 0;
      const { pinMarkerLayer } = this;
      const { points } = this.props;

      const markers = pinMarkerLayer.getLayers();
      const max = Math.max(points.length, markers.length);
      const depthColumnIndex = _.findIndex(
        this.props.data.cols,
        col => col.name === "Map Plotting__depth",
      );

      const rangeColumnIndex = _.findIndex(
        this.props.data.cols,
        col => col.name === "Map Plotting__range",
      );

      const iconColumnIndex = _.findIndex(
        this.props.data.cols,
        col => col.name === "Map Plotting__icon",
      );

      for (let i = 0; i < max; i++) {
        if (i >= points.length) {
          pinMarkerLayer.removeLayer(markers[i]);
        }

        if (i >= markers.length) {
          const marker = this._createMarker(i);
          pinMarkerLayer.addLayer(marker);
          markers.push(marker);
        }

        if (
          depthColumnIndex !== undefined &&
          rangeColumnIndex !== undefined &&
          iconColumnIndex !== undefined
        ) {
          const range = this.props.data.rows[i][rangeColumnIndex];
          const depth = this.props.data.rows[i][depthColumnIndex];
          if (i < points.length) {
            const { lat, lng } = markers[i].getLatLng();
            if (lng !== points[i][0] || lat !== points[i][1]) {
              const pinVal = this.props.data.rows[i][iconColumnIndex];
              const pin = markerIcons[pinVal];

              if (pin !== undefined) {
                markers[i].setIcon(pin);
              }
              markers[i].setLatLng(points[i]);
            }
          }
          if (depth <= plotRangeForDepth) {
            const { lat, lng } = markers[i].getLatLng();
            const polyLayer = L.layerGroup();
            const circle = L.circle([lat, lng], {
              radius: range,
              color: "black",
              weight: 1,
              fillOpacity: 0.01,
              fillColor: "red",
            });
            polyLayer.addLayer(circle).addTo(this.map);
          }
        }
      }

      // let polyArray = [];
      // polyArray = this._getEncompassingPolygon(points);
      // if (polyArray.length > 2) {
      //   const polyLayer = L.layerGroup();
      //   const polygon = L.polygon([polyArray], {
      //     fillOpacity: 0.05,
      //     fillColor: "blue",
      //   });
      //   // const markerPolygonLayer = new L.FeatureGroup();
      //   polyLayer.addLayer(polygon).addTo(this.map);
      // }
    } catch (err) {
      console.error(err);
      this.props.onRenderError(err.message || err);
    }
  }

  _createMarker = (rowIndex) => {
    const marker = L.marker([0, 0], { icon: this.pinMarkerIcon });
    const { onHoverChange, onVisualizationClick, settings } = this.props;
    if (onHoverChange) {
      marker.on("mousemove", (e) => {
        const {
          series: [
            {
              data: { cols, rows },
            },
          ],
        } = this.props;
        const hover = {
          dimensions: cols.map((col, colIndex) => ({
            value: rows[rowIndex][colIndex],
            column: col,
          })),
          element: marker._icon,
        };
        onHoverChange(hover);
      });
      marker.on("mouseout", () => {
        onHoverChange(null);
      });
    }
    if (onVisualizationClick) {
      marker.on("click", () => {
        const {
          series: [
            {
              data: { cols, rows },
            },
          ],
        } = this.props;
        // if there is a primary key then associate a pin with it
        const pkIndex = _.findIndex(cols, isPK);
        const hasPk = pkIndex >= 0;

        const data = cols.map((col, index) => ({
          col,
          value: rows[rowIndex][index],
        }));

        onVisualizationClick({
          value: hasPk ? rows[rowIndex][pkIndex] : null,
          column: hasPk ? cols[pkIndex] : null,
          element: marker._icon,
          origin: { row: rows[rowIndex], cols },
          settings,
          data,
        });
      });
    }
    return marker;
  };

  // get orientation
  _orientation(p, q, r) {
    const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);

    if (val === 0) {
      return 0;
    } // collinear
    return val > 0 ? 1 : 2; // clock or counterclock wise
  }

  // get convex hull of a set of n points to create a polygon.
  _getEncompassingPolygon(points) {
    const n = points.length;
    // There must be at least 3 points
    if (n < 3) {
      return vertices;
    }

    // Initialize Result
    const vertices = [];

    // Find the leftmost point
    let l = 0;
    for (let i = 1; i < n; i++) {
      if (points[i][0] < points[l][0]) {
        l = i;
      }
    }
    // Start from leftmost point, keep moving counterclockwise until reach the start point gain. This loop runs O(h) times where h is
    // number of points in result or output.

    let p = l,
      q;

    do {
      // Add current point to result
      vertices.push([points[p][0], points[p][1]]);

      // Search for a point 'q' such that rientation(p, q, x) is counterclockwise
      // for all points 'x'. The idea is to keep track of last visited most counterclock-wise point in q. If any point 'i' is more
      // counterclock-wise than q, then update q.

      q = (p + 1) % n;

      for (let i = 0; i < n; i++) {
        // If i is more counterclockwise than urrent q, then update q
        if (this._orientation(points[p], points[i], points[q]) === 2) {
          q = i;
        }
      }

      // Now q is the most counterclockwise with respect to p. Set p as q for next iteration, so that q is added to result 'hull'
      p = q;
    } while (p !== l); // While we don't come to first point

    return vertices;
  }
}
