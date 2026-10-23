// Data for the progress charts. Pure functions: they take workouts with
// exercises filled in ({ _id, date, entries: [{ exercise: { _id, name }, sets }] }).

const idOf = (value) => String(value?._id ?? value);

// The exercises a user has logged, for the chart's picker:
// [{ _id, name, sessions }] sorted by name. A session is one workout.
function loggedExercises(workouts) {
  const byId = new Map();
  for (const workout of workouts) {
    const seenInThisWorkout = new Set();
    for (const { exercise } of workout.entries) {
      if (!exercise) continue; // removed from the library since it was logged
      const id = idOf(exercise);
      if (seenInThisWorkout.has(id)) continue;
      seenInThisWorkout.add(id);
      const current = byId.get(id) ?? { _id: id, name: exercise.name, sessions: 0 };
      current.sessions += 1;
      byId.set(id, current);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// For each workout that includes the exercise, its heaviest set (most reps
// breaks a tie): [{ workoutId, date, weight, reps }], oldest first.
function heaviestPerSession(workouts, exerciseId) {
  const target = String(exerciseId);
  const points = [];

  for (const workout of workouts) {
    const sets = workout.entries
      .filter((entry) => entry.exercise && idOf(entry.exercise) === target)
      .flatMap((entry) => entry.sets);
    if (sets.length === 0) continue;

    const best = sets.reduce((top, set) =>
      set.weight > top.weight || (set.weight === top.weight && set.reps > top.reps) ? set : top,
    );
    points.push({
      workoutId: idOf(workout._id),
      date: workout.date,
      weight: best.weight,
      reps: best.reps,
    });
  }

  return points.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = { heaviestPerSession, loggedExercises };
