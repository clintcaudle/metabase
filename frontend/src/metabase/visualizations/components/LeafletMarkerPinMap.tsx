import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-groupedlayercontrol";
import "leaflet-groupedlayercontrol/dist/leaflet.groupedlayercontrol.min.css";
import "./CarinaLayerControl.css";

import L from "leaflet";
import _ from "underscore";

import { color } from "metabase/ui/colors";
import { getSubpathSafeUrl } from "metabase/urls";
import type { HoveredObject } from "metabase/visualizations/types";
import type { ClickObject } from "metabase-lib";
import { isPK } from "metabase-lib/v1/types/utils/isa";
import type { RowValue } from "metabase-types/api";

import { markerIcons } from "./CarinaIcons";
import {
  ICON_COLUMN_NAME,
  ICON_INDICES,
  buildGroupedOverlays,
  hasIconColumn,
} from "./CarinaLayerConfig";
import {
  LeafletMap,
  type LeafletMapPoint,
  type LeafletMapProps,
} from "./LeafletMap";
import { initLayerControlUi } from "./layerControlUi";
import {
  findTheGeomColumnIndex,
  geometryToGeoJsonFeature,
  parseTheGeom,
} from "./parseTheGeom";

type IndexedPoint = LeafletMapPoint<[number]>;

const DEPTH_COLUMN_NAME = "Map Plotting__depth";
const RANGE_COLUMN_NAME = "Map Plotting__range";

const GEOMETRY_STYLE: L.PathOptions = {
  color: color("brand"),
  weight: 2,
  fillColor: color("brand"),
  fillOpacity: 0.15,
};

interface LeafletMarkerPinMapProps extends LeafletMapProps<IndexedPoint> {
  onHoverChange?: (hoverObject?: HoveredObject | null) => void;
  onVisualizationClick?: (clickObject: ClickObject | null) => void;
}

export class LeafletMarkerPinMap extends LeafletMap<LeafletMarkerPinMapProps> {
  pinMarkerLayer: L.LayerGroup | null = null;
  pinMarkerIcon: L.Icon | null = null;
  rangeCircleLayer: L.LayerGroup | null = null;
  geometryLayer: L.LayerGroup | null = null;
  clusterLayers: Record<number, L.MarkerClusterGroup> | null = null;
  layerControl: L.Control.GroupedLayers | null = null;
  useLayerControl: boolean | null = null;

  componentDidMount() {
    super.componentDidMount();

    if (!this.map) {
      return;
    }

    this.rangeCircleLayer = L.layerGroup([]).addTo(this.map);
    this.geometryLayer = L.layerGroup([]).addTo(this.map);
    this.pinMarkerIcon = L.icon({
      iconUrl: getSubpathSafeUrl("app/assets/img/pin.png"),
      iconSize: [28, 32],
      iconAnchor: [15, 24],
      popupAnchor: [0, -13],
    });

    this.syncMarkerLayer();
  }

  componentDidUpdate(prevProps: LeafletMarkerPinMapProps) {
    super.componentDidUpdate(prevProps);
    this.syncMarkerLayer();
  }

  private syncMarkerLayer() {
    try {
      this._syncLayerMode();
      if (this.useLayerControl) {
        this._updateClusteredMarkers();
      } else {
        this._createMarkers(this.props.points);
      }
      this._updateGeometryAndRangeLayers();
    } catch (err) {
      console.error(err);
      this.props.onRenderError(
        err instanceof Error ? err.message : (err ?? undefined),
      );
    }
  }

  private _shouldUseLayerControl(): boolean {
    const {
      settings,
      series: [
        {
          data: { cols },
        },
      ],
    } = this.props;
    return settings["map.show_layer_control"] ?? hasIconColumn(cols);
  }

  private _syncLayerMode() {
    if (!this.map) {
      return;
    }

    const useLayerControl = this._shouldUseLayerControl();
    const initialized =
      this.pinMarkerLayer != null || this.clusterLayers != null;
    if (initialized && useLayerControl === this.useLayerControl) {
      return;
    }

    this.useLayerControl = useLayerControl;
    this._teardownMarkerLayers();

    if (useLayerControl) {
      this._initClusterLayers();
    } else {
      this.pinMarkerLayer = L.layerGroup([]).addTo(this.map);
    }
  }

  private _teardownMarkerLayers() {
    const { map } = this;
    if (this.pinMarkerLayer) {
      map?.removeLayer(this.pinMarkerLayer);
      this.pinMarkerLayer = null;
    }
    if (this.clusterLayers) {
      Object.values(this.clusterLayers).forEach((cluster) => {
        map?.removeLayer(cluster);
      });
      this.clusterLayers = null;
    }
    if (this.layerControl) {
      this.layerControl.remove();
      this.layerControl = null;
    }
  }

  private _initClusterLayers() {
    const { map } = this;
    if (!map) {
      return;
    }

    const clusterLayers: Record<number, L.MarkerClusterGroup> = {};
    ICON_INDICES.forEach((index) => {
      clusterLayers[index] = L.markerClusterGroup();
    });
    this.clusterLayers = clusterLayers;

    this.layerControl = L.control
      .groupedLayers(null, buildGroupedOverlays(clusterLayers), {
        collapsed: false,
      })
      .addTo(map);

    const formElement = this.layerControl.getContainer()?.querySelector("form");
    if (formElement) {
      initLayerControlUi(formElement, clusterLayers, map);
    }

    Object.values(clusterLayers).forEach((cluster) => {
      map.addLayer(cluster);
    });
  }

  private _updateClusteredMarkers() {
    const {
      points,
      series: [
        {
          data: { cols, rows },
        },
      ],
    } = this.props;
    const { clusterLayers } = this;
    if (!points || !clusterLayers) {
      return;
    }

    Object.values(clusterLayers).forEach((cluster) => {
      cluster.clearLayers();
    });

    const iconColumnIndex = cols.findIndex(
      (col) => col.name === ICON_COLUMN_NAME,
    );
    if (iconColumnIndex < 0) {
      return;
    }

    const rowCount = Math.min(points.length, rows.length);
    for (let i = 0; i < rowCount; i++) {
      const iconValue = rows[i][iconColumnIndex];
      const cluster =
        typeof iconValue === "number" ? clusterLayers[iconValue] : undefined;
      if (!cluster) {
        continue;
      }

      const marker = this._createMarker(i);
      marker.setLatLng([points[i][0], points[i][1]]);

      const icon =
        typeof iconValue === "number" ? markerIcons[iconValue] : undefined;
      if (icon) {
        marker.setIcon(icon);
      }

      cluster.addLayer(marker);
    }
  }

  private _updateGeometryAndRangeLayers() {
    const {
      settings,
      points,
      series: [
        {
          data: { cols, rows },
        },
      ],
    } = this.props;
    const { rangeCircleLayer, geometryLayer } = this;
    if (!points || !rangeCircleLayer || !geometryLayer) {
      return;
    }

    const showNetworkRange = settings["map.show_network_range"] ?? false;
    const plotRangeForDepth = settings["map.plot_range_for_depth"] ?? 0;
    const depthColumnIndex = cols.findIndex(
      (col) => col.name === DEPTH_COLUMN_NAME,
    );
    const rangeColumnIndex = cols.findIndex(
      (col) => col.name === RANGE_COLUMN_NAME,
    );
    const theGeomColumnIndex = findTheGeomColumnIndex(cols);
    const hasRangeColumns = depthColumnIndex >= 0 && rangeColumnIndex >= 0;

    rangeCircleLayer.clearLayers();
    geometryLayer.clearLayers();

    const rowCount = Math.min(points.length, rows.length);
    for (let i = 0; i < rowCount; i++) {
      const row = rows[i];
      const theGeom = theGeomColumnIndex >= 0 ? row[theGeomColumnIndex] : null;

      if (theGeom != null) {
        const geometry = parseTheGeom(theGeom);
        if (geometry && geometry.type !== "Point") {
          geometryLayer.addLayer(
            L.geoJSON(geometryToGeoJsonFeature(geometry), {
              style: () => GEOMETRY_STYLE,
            }),
          );
        }
      }

      // rows with their own geometry get that instead of a range circle
      if (showNetworkRange && hasRangeColumns && theGeom == null) {
        const depth = row[depthColumnIndex];
        const range = row[rangeColumnIndex];
        if (
          typeof depth === "number" &&
          typeof range === "number" &&
          depth <= plotRangeForDepth
        ) {
          rangeCircleLayer.addLayer(
            L.circle([points[i][0], points[i][1]], {
              radius: range,
              color: "black",
              weight: 1,
              fillOpacity: 0.01,
              fillColor: "red",
            }),
          );
        }
      }
    }
  }

  _createMarkers = (points?: IndexedPoint[] | null) => {
    const { pinMarkerLayer } = this;
    if (!this.map || !pinMarkerLayer || !points) {
      return;
    }

    const {
      series: [
        {
          data: { cols, rows },
        },
      ],
    } = this.props;
    const iconColumnIndex = cols.findIndex(
      (col) => col.name === ICON_COLUMN_NAME,
    );

    const mapBounds = this.map?.getBounds?.();
    if (!mapBounds) {
      return;
    }
    const mapWest = mapBounds.getWest();
    const mapEast = mapBounds.getEast();

    // if map crosses dateline, we need wrapping
    const crossesLeftDateline = mapWest < -180 && mapEast > -180;
    const crossesRightDateline = mapWest < 180 && mapEast > 180;
    const shouldGetWrappedPoints = crossesLeftDateline || crossesRightDateline;

    const wrappedPoints: IndexedPoint[] = shouldGetWrappedPoints
      ? points.flatMap((point, index) => {
          const [lat, lng] = point;
          // we need to store the data index separately
          // because the same point can have multiple markers
          const wrapped: IndexedPoint[] = [[lat, lng, index]];

          // note: for wide screens, we may need extra copies on both sides
          if (crossesLeftDateline) {
            // copy on the left side
            wrapped.push([lat, lng - 360, index]);
          }

          if (crossesRightDateline) {
            // copy on the right side
            wrapped.push([lat, lng + 360, index]);
          }
          return wrapped;
        })
      : points;

    const markers = pinMarkerLayer
      .getLayers()
      .filter((layer): layer is L.Marker => layer instanceof L.Marker);
    const max = Math.max(wrappedPoints.length, markers.length);
    for (let i = 0; i < max; i++) {
      if (i >= wrappedPoints.length) {
        pinMarkerLayer.removeLayer(markers[i]); // remove excess markers
        continue;
      }

      const index =
        wrappedPoints.length > points.length ? wrappedPoints[i][2] : i;
      if (i >= markers.length) {
        // create new markers for new points
        const marker = this._createMarker(index);
        pinMarkerLayer.addLayer(marker);
        markers.push(marker);
      }

      if (i < wrappedPoints.length) {
        const { lat, lng } = markers[i].getLatLng();
        // if any marker doesn't match the point, update it
        if (lng !== wrappedPoints[i][0] || lat !== wrappedPoints[i][1]) {
          markers[i].setLatLng([wrappedPoints[i][0], wrappedPoints[i][1]]);
          // we need to re-attach the pointer events because the indexes might have changed from zooming
          this._setupMarkerEvents(markers[i], index);
        }

        if (iconColumnIndex >= 0) {
          this._setCarinaIcon(markers[i], rows[index][iconColumnIndex]);
        }
      }
    }
  };

  _setCarinaIcon = (marker: L.Marker, iconValue: RowValue) => {
    const icon =
      typeof iconValue === "number" ? markerIcons[iconValue] : undefined;
    if (icon) {
      marker.setIcon(icon);
    }
  };

  _createMarker = (rowIndex: number) => {
    const marker = L.marker([0, 0], {
      ...(this.pinMarkerIcon ? { icon: this.pinMarkerIcon } : {}),
    });
    return this._setupMarkerEvents(marker, rowIndex);
  };

  _setupMarkerEvents = (marker: L.Marker, rowIndex: number) => {
    marker.off("mousemove");
    marker.off("mouseout");
    marker.off("click");
    marker.on("mousemove", () => {
      const { onHoverChange } = this.props;
      if (!onHoverChange) {
        return;
      }
      const {
        series: [
          {
            data: { cols, rows },
          },
        ],
      } = this.props;
      const hover: HoveredObject = {
        dimensions: cols.map((col, colIndex) => ({
          value: String(rows[rowIndex][colIndex] ?? ""),
          column: col,
        })),
        element: marker.getElement(),
      };
      onHoverChange(hover);
    });

    marker.on("mouseout", () => {
      const { onHoverChange } = this.props;
      onHoverChange?.(null);
    });

    marker.on("click", () => {
      const { onVisualizationClick, settings } = this.props;
      if (!onVisualizationClick) {
        return;
      }
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
        column: hasPk ? cols[pkIndex] : undefined,
        element: marker.getElement(),
        origin: { row: rows[rowIndex], cols },
        settings,
        data,
      });
    });

    return marker;
  };
}
