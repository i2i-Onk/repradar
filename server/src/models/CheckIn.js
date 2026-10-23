const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now },
    // Where the user was when they pressed "Check in" (read once, never tracked)
    coordinates: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    distance: { type: Number, required: true, min: 0 }, // metres from the saved gym
    verified: { type: Boolean, required: true },
    // The user's own calendar day ("YYYY-MM-DD") and the time zone it was worked
    // out in. Streaks and weeks are counted from localDate (see utils/checkinDays.js).
    localDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    timeZone: { type: String, required: true },
  },
  { timestamps: true },
);

// At most one verified check-in per user per day, enforced by the database
// (so two quick taps can't both count). Unverified attempts aren't limited.
checkInSchema.index(
  { user: 1, localDate: 1 },
  { unique: true, partialFilterExpression: { verified: true } },
);

checkInSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('CheckIn', checkInSchema);
