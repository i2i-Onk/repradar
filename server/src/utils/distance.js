// Straight-line distance over the Earth's surface (the Haversine formula).
// Used to check a gym check-in happened close enough to the saved gym.
// Pure function. Treats the Earth as a sphere, which is accurate to well
// under 1% — far better than phone GPS at check-in distances.

const EARTH_RADIUS_M = 6371000; // mean radius

const toRadians = (degrees) => (degrees * Math.PI) / 180;

function isValidCoordinate(point) {
  return (
    Number.isFinite(point?.lat) &&
    Number.isFinite(point?.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

// a, b: { lat, lng } in degrees. Returns metres.
function distanceInMetres(a, b) {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) {
    throw new TypeError('Invalid coordinates: lat must be -90 to 90 and lng -180 to 180');
  }

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;

  // Math.min guards against h creeping just above 1 from rounding (antipodal points)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

module.exports = { distanceInMetres, EARTH_RADIUS_M };
