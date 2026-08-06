import { Buffer } from "buffer";

import type { Feature, Geometry } from "geojson";
import { Geometry as WkxGeometry } from "wkx";

import type { DatasetColumn } from "metabase-types/api";

const THE_GEOM_COLUMN_NAME = "the_geom";

const WKT_TYPE_PATTERN =
  /^(SRID=\d+;)?(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(/i;

export function findTheGeomColumnIndex(
  cols: Pick<DatasetColumn, "name">[],
): number {
  return cols.findIndex((col) => col.name === THE_GEOM_COLUMN_NAME);
}

function isWktString(value: string): boolean {
  return WKT_TYPE_PATTERN.test(value.trim());
}

function isHexWkb(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= 8 &&
    trimmed.length % 2 === 0 &&
    /^[0-9A-Fa-f]+$/.test(trimmed)
  );
}

function isGeoJsonGeometry(value: unknown): value is Geometry {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    typeof value.type === "string" &&
    "coordinates" in value &&
    value.coordinates != null
  );
}

// wkx's bundled types declare toGeoJSON() as {}; validate the shape instead
// of casting.
function toGeoJson(geometry: WkxGeometry): Geometry | null {
  const geoJson = geometry.toGeoJSON();
  return isGeoJsonGeometry(geoJson) ? geoJson : null;
}

/**
 * Parse a the_geom cell value (WKT, hex WKB, or GeoJSON geometry) into GeoJSON.
 * Returns null when the value is empty or cannot be parsed.
 */
export function parseTheGeom(theGeom: unknown): Geometry | null {
  if (theGeom == null || theGeom === "") {
    return null;
  }

  try {
    if (isGeoJsonGeometry(theGeom)) {
      return theGeom;
    }

    if (typeof theGeom === "string") {
      const trimmed = theGeom.trim();

      if (isWktString(trimmed) || trimmed.startsWith("SRID=")) {
        return toGeoJson(WkxGeometry.parse(trimmed));
      }

      if (isHexWkb(trimmed)) {
        return toGeoJson(WkxGeometry.parse(Buffer.from(trimmed, "hex")));
      }

      return toGeoJson(WkxGeometry.parse(trimmed));
    }

    return null;
  } catch (err) {
    console.warn("parseTheGeom: unable to parse geometry", err);
    return null;
  }
}

export function geometryToGeoJsonFeature(
  geometry: Geometry,
  properties: Record<string, unknown> = {},
): Feature {
  return {
    type: "Feature",
    geometry,
    properties,
  };
}
