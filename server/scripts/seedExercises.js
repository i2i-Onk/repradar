// One-time import of exercises from the free wger API (https://wger.de).
//
//   npm run seed:exercises            dry run: report what would be inserted, updated
//                                     or unchanged in the MONGO_URI database; saves nothing
//   npm run seed:exercises -- --write save to the database in MONGO_URI
//
// Safe to run more than once: exercises are matched by their wger id, so a
// second run updates existing exercises instead of creating duplicates.
// Nothing is ever deleted.

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { mapWgerExercise } = require('../src/utils/wgerMapping');
const { previewUpsertExercises, upsertExercises } = require('../src/services/exerciseService');

const WGER_URL = 'https://wger.de/api/v2/exerciseinfo/?format=json&limit=200';

// wger returns results in pages; follow each page's "next" link until the end
async function fetchAllWgerExercises() {
  const all = [];
  let url = WGER_URL;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`wger request failed: ${response.status} ${response.statusText}`);
    }
    const page = await response.json();
    all.push(...page.results);
    url = page.next;
  }

  return all;
}

// Some wger exercises share an English name; keep the first one of each
function removeDuplicateNames(exercises) {
  const seen = new Set();
  return exercises.filter((exercise) => {
    const key = exercise.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countBy(exercises, field) {
  const counts = {};
  for (const exercise of exercises) {
    for (const value of [].concat(exercise[field])) {
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return counts;
}

async function main() {
  const write = process.argv.includes('--write');

  console.log('Fetching exercises from wger...');
  const raw = await fetchAllWgerExercises();
  const mapped = raw.map(mapWgerExercise).filter(Boolean);
  const exercises = removeDuplicateNames(mapped);

  console.log(`Fetched ${raw.length}, usable ${exercises.length}`);
  console.log(`Skipped ${raw.length - mapped.length} (no English name, muscle or equipment)`);
  console.log(`Skipped ${mapped.length - exercises.length} duplicate names`);
  console.log('By muscle group:', countBy(exercises, 'muscleGroups'));
  console.log('By equipment:', countBy(exercises, 'equipment'));

  await connectDB();
  const database = mongoose.connection.name;

  if (!write) {
    // Reads only: compares with what's saved, writes nothing
    const preview = await previewUpsertExercises(exercises);
    console.log(`\nDry run against database "${database}". Would do:`, preview);
    console.log('Nothing was saved. Add --write to save.');
    return;
  }

  console.log(`\nWriting to database "${database}"...`);
  const result = await upsertExercises(exercises);
  console.log('Done:', result);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
