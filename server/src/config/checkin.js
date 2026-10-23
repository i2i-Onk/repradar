// How close (in metres) a user must be to their saved gym for a check-in to count.
// Optional: set CHECKIN_RADIUS_M to change it. Read on each call so tests can change it.
const DEFAULT_CHECKIN_RADIUS_M = 150;

function checkinRadiusM() {
  const value = Number(process.env.CHECKIN_RADIUS_M);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CHECKIN_RADIUS_M;
}

module.exports = { checkinRadiusM, DEFAULT_CHECKIN_RADIUS_M };
