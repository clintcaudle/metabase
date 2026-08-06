import "leaflet";

declare module "leaflet" {
  namespace Control {
    interface GroupedLayersOptions {
      collapsed?: boolean;
      position?: ControlPosition;
      exclusiveGroups?: string[];
      groupCheckboxes?: boolean;
    }

    class GroupedLayers extends Control {
      constructor(
        baseLayers?: Record<string, Layer> | null,
        groupedOverlays?: Record<string, Record<string, Layer>>,
        options?: GroupedLayersOptions,
      );
      addOverlay(layer: Layer, name: string, group?: string): this;
      removeLayer(layer: Layer): this;
    }
  }

  namespace control {
    function groupedLayers(
      baseLayers?: Record<string, Layer> | null,
      groupedOverlays?: Record<string, Record<string, Layer>>,
      options?: Control.GroupedLayersOptions,
    ): Control.GroupedLayers;
  }
}

declare module "leaflet-groupedlayercontrol" {}
