import type L from "leaflet";

import type { DatasetColumn } from "metabase-types/api";

export const ICON_COLUMN_NAME = "Map Plotting__icon";

// Icon index -> display label, grouped for the layer control. Indexes must
// stay in sync with the data's Map Plotting__icon values and the icons in
// CarinaIcons.ts.
export const LAYER_GROUPS: Record<string, Record<number, string>> = {
  "Communications & Meters": {
    0: "Lora",
    1: "ODL",
    2: "UMD",
    3: "Prepay",
    4: "WH",
    5: "CIU",
  },
  "Capacitors & Sensors": {
    6: "Capacitor 6",
    7: "CPG 7",
    8: "Vaughn",
    9: "WISE3",
  },
  "Protection & Grid Control": {
    10: "Transformer",
    11: "Switch",
    12: "Recloser",
    13: "Sectionalizer",
    14: "Single-Phase Recloser",
    15: "Triple-Phase Recloser",
    16: "Three-Single-Phase Recloser",
    17: "Two-Single-Phase Recloser",
  },
  "Lines & Structures": {
    18: "Light",
    19: "Service Location",
    20: "Down Guy",
    21: "Primary OH Line",
    22: "Secondary OH Line",
    23: "Location",
    24: "Pole",
  },
};

export const ICON_INDICES = Object.values(LAYER_GROUPS).flatMap((layers) =>
  Object.keys(layers).map(Number),
);

export function hasIconColumn(cols: Pick<DatasetColumn, "name">[]): boolean {
  return cols.some((col) => col.name === ICON_COLUMN_NAME);
}

export function buildGroupedOverlays(
  clusterLayers: Record<number, L.Layer>,
): Record<string, Record<string, L.Layer>> {
  const groupedOverlays: Record<string, Record<string, L.Layer>> = {};

  for (const [groupName, layers] of Object.entries(LAYER_GROUPS)) {
    groupedOverlays[groupName] = {};
    for (const [index, label] of Object.entries(layers)) {
      groupedOverlays[groupName][label] = clusterLayers[Number(index)];
    }
  }

  return groupedOverlays;
}
