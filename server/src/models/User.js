const mongoose = require('mongoose');
const { GOALS, EQUIPMENT } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false means queries leave this field out unless explicitly asked for it
    passwordHash: { type: String, required: true, select: false },
    goal: { type: String, enum: GOALS, default: 'general' },
    equipment: { type: [{ type: String, enum: EQUIPMENT }], default: ['bodyweight'] },
    gymLocation: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    weeklyGoal: { type: Number, min: 1, max: 7, default: 3 },
  },
  { timestamps: true },
);

// Remove private fields whenever a user is converted to JSON for a response
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);