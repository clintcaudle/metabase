import type { Geometry } from "geojson";

import {
  findTheGeomColumnIndex,
  geometryToGeoJsonFeature,
  parseTheGeom,
} from "./parseTheGeom";

describe("parseTheGeom", () => {
  it("returns null for empty values", () => {
    expect(parseTheGeom(null)).toBeNull();
    expect(parseTheGeom("")).toBeNull();
  });

  it("parses WKT POINT", () => {
    const geometry = parseTheGeom("POINT(-122.4 37.8)");
    expect(geometry?.type).toBe("Point");
    expect(
      geometry && "coordinates" in geometry && geometry.coordinates,
    ).toEqual([-122.4, 37.8]);
  });

  it("parses WKT LINESTRING", () => {
    const geometry = parseTheGeom("LINESTRING(-122.4 37.8, -122.5 37.9)");
    expect(geometry?.type).toBe("LineString");
    expect(
      geometry && "coordinates" in geometry && geometry.coordinates,
    ).toHaveLength(2);
  });

  it("parses hex WKB POINT", () => {
    const geometry = parseTheGeom("0101000000000000000000f03f0000000000000040");
    expect(geometry?.type).toBe("Point");
    if (geometry?.type !== "Point") {
      throw new Error("expected a Point geometry");
    }
    expect(geometry.coordinates[0]).toBeCloseTo(1);
    expect(geometry.coordinates[1]).toBeCloseTo(2);
  });

  it("passes through GeoJSON geometry objects", () => {
    const geometry = { type: "Point", coordinates: [1, 2] };
    expect(parseTheGeom(geometry)).toBe(geometry);
  });

  it("returns null for unparseable values", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseTheGeom("not a geometry")).toBeNull();
    jest.restoreAllMocks();
  });

  it("finds the_geom column index", () => {
    const cols = [{ name: "id" }, { name: "the_geom" }];
    expect(findTheGeomColumnIndex(cols)).toBe(1);
  });

  it("wraps geometry as GeoJSON Feature", () => {
    const geometry: Geometry = { type: "Point", coordinates: [1, 2] };
    expect(geometryToGeoJsonFeature(geometry)).toEqual({
      type: "Feature",
      geometry,
      properties: {},
    });
  });
});
