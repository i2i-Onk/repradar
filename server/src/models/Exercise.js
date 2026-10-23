const mongoose = require('mongoose');
const { EQUIPMENT, MUSCLE_GROUPS } = require('../config/constants');

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    muscleGroups: {
      type: [{ type: String, enum: MUSCLE_GROUPS }],
      validate: {
        validator: (groups) => groups.length > 0,
        message: 'An exercise needs at least one muscle group',
      },
      index: true,
    },
    equipment: { type: String, enum: EQUIPMENT, required: true, index: true },
    description: { type: String, default: '', maxlength: 2000 },
    // wger's id for this exercise. The seed script uses it to update an
    // exercise it imported before instead of creating a duplicate.
    // sparse: exercises we add ourselves don't need one.
    wgerId: { type: Number, unique: true, sparse: true },
  },
  { timestamps: true },
);

exerciseSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret.wgerId;
    return ret;
  },
});

module.exports = mongoose.model('Exercise', exerciseSchema);
