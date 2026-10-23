const { checkinRadiusM } = require('../config/checkin');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { calculateStreak, localDateIn, weeklyProgress } = require('../utils/checkinDays');
const { distanceInMetres } = require('../utils/distance');

const ALREADY_CHECKED_IN = "You've already checked in today. See you tomorrow!";

function hasGymLocation(user) {
  return Number.isFinite(user.gymLocation?.lat) && Number.isFinite(user.gymLocation?.lng);
}

async function findUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

// Streak and weekly progress, from this user's verified check-in days only
async function buildSummary(user, timeZone, now) {
  const dates = await CheckIn.distinct('localDate', { user: user._id, verified: true });
  const today = localDateIn(now, timeZone);
  return {
    streak: calculateStreak(dates, today),
    week: weeklyProgress(dates, today, user.weeklyGoal),
    todayCheckedIn: dates.includes(today),
    hasGymLocation: hasGymLocation(user),
    radius: checkinRadiusM(),
  };
}

async function getSummary(userId, timeZone, now = new Date()) {
  const user = await findUser(userId);
  return buildSummary(user, timeZone, now);
}

// The server decides whether a check-in is verified, from the coordinates
// and the saved gym. Nothing the client says about "verified" is used.
async function createCheckIn(userId, { lat, lng, timeZone }, now = new Date()) {
  const user = await findUser(userId);
  if (!hasGymLocation(user)) {
    throw new AppError(400, 'Save your gym location in Settings before checking in');
  }

  const radius = checkinRadiusM();
  const gym = { lat: user.gymLocation.lat, lng: user.gymLocation.lng };
  const distance = Math.round(distanceInMetres({ lat, lng }, gym));
  const verified = distance <= radius;
  const localDate = localDateIn(now, timeZone);

  if (verified && (await CheckIn.exists({ user: userId, localDate, verified: true }))) {
    throw new AppError(409, ALREADY_CHECKED_IN);
  }

  let checkIn;
  try {
    checkIn = await CheckIn.create({
      user: userId,
      timestamp: now,
      coordinates: { lat, lng },
      distance,
      verified,
      localDate,
      timeZone,
    });
  } catch (error) {
    // Two requests at the same moment: the unique index lets only one through
    if (error.code === 11000) throw new AppError(409, ALREADY_CHECKED_IN);
    throw error;
  }

  return { checkIn, radius, summary: await buildSummary(user, timeZone, now) };
}

module.exports = { createCheckIn, getSummary };
