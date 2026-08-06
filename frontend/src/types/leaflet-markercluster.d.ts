import "leaflet";

// Minimal typings for leaflet.markercluster against our pinned
// @types/leaflet; @types/leaflet.markercluster augments its own nested
// @types/leaflet copy instead, so the upstream typings don't apply here.
declare module "leaflet" {
  interface MarkerClusterGroupOptions extends LayerOptions {
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    spiderfyOnMaxZoom?: boolean;
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
  }

  class MarkerClusterGroup extends FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
  }

  function markerClusterGroup(
    options?: MarkerClusterGroupOptions,
  ): MarkerClusterGroup;
}

declare module "leaflet.markercluster" {}
