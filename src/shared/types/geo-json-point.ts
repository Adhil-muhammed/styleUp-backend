/**
 * GeoJSON Point as stored in PostGIS `geography(Point, 4326)` columns.
 * Coordinates are `[longitude, latitude]` — never `[latitude, longitude]`.
 */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}
