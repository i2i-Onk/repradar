// Turns exercises from the free wger API (https://wger.de/api/v2/) into
// RepRadar exercises. Pure functions: no database, no network.

const ENGLISH = 2; // wger's language id for English

// wger muscle id → our muscle group (see https://wger.de/api/v2/muscle/)
const MUSCLE_MAP = {
  1: 'biceps', // Biceps brachii
  2: 'shoulders', // Anterior deltoid
  3: 'core', // Serratus anterior
  4: 'chest', // Pectoralis major
  5: 'triceps', // Triceps brachii
  6: 'core', // Rectus abdominis
  7: 'calves', // Gastrocnemius
  8: 'glutes', // Gluteus maximus
  9: 'back', // Trapezius
  10: 'quads', // Quadriceps femoris
  11: 'hamstrings', // Biceps femoris
  12: 'back', // Latissimus dorsi
  13: 'biceps', // Brachialis
  14: 'core', // Obliquus externus abdominis
  15: 'calves', // Soleus
};

// Used only when an exercise lists no primary muscles. "Arms", "Legs" and
// "Cardio" are left out on purpose: they're too vague to guess a group.
const CATEGORY_MAP = {
  Abs: 'core',
  Back: 'back',
  Calves: 'calves',
  Chest: 'chest',
  Shoulders: 'shoulders',
};

// wger equipment id → our equipment (see https://wger.de/api/v2/equipment/).
// Bench (8), incline bench (9) and Swiss ball (5) are accessories, so they're ignored.
const EQUIPMENT_MAP = {
  1: 'barbell', // Barbell
  2: 'barbell', // SZ-Bar (EZ curl bar)
  3: 'dumbbell', // Dumbbell
  4: 'bodyweight', // Gym mat
  6: 'bodyweight', // Pull-up bar
  7: 'bodyweight', // none (bodyweight exercise)
  10: 'kettlebell', // Kettlebell
  11: 'band', // Resistance band
  12: 'cable', // Cable machine
};

// An exercise has one equipment value. If wger lists several, the first match here wins.
const EQUIPMENT_PRIORITY = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'band', 'bodyweight'];

// wger has no "machine" equipment type, so recognise machines by name
const MACHINE_NAME = /machine|smith|leg press/i;

const MAX_DESCRIPTION = 2000;

function toPlainText(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') // last, so "&amp;lt;" doesn't become "<"
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

function mapMuscleGroups(raw) {
  const groups = (raw.muscles || []).map((muscle) => MUSCLE_MAP[muscle.id]).filter(Boolean);

  if (groups.length === 0 && CATEGORY_MAP[raw.category?.name]) {
    groups.push(CATEGORY_MAP[raw.category.name]);
  }

  return [...new Set(groups)];
}

function mapEquipment(raw, name) {
  const mapped = (raw.equipment || []).map((item) => EQUIPMENT_MAP[item.id]);
  const main = EQUIPMENT_PRIORITY.find((equipment) => mapped.includes(equipment));

  if (main) return main;
  if (MACHINE_NAME.test(name)) return 'machine';
  return null;
}

// Returns a RepRadar exercise, or null if this wger exercise can't be used
function mapWgerExercise(raw) {
  const english = (raw.translations || []).find((t) => t.language === ENGLISH);
  const name = english?.name?.trim().slice(0, 100);
  if (!name) return null;

  const muscleGroups = mapMuscleGroups(raw);
  if (muscleGroups.length === 0) return null;

  const equipment = mapEquipment(raw, name);
  if (!equipment) return null;

  return {
    wgerId: raw.id,
    name,
    muscleGroups,
    equipment,
    description: toPlainText(english.description),
  };
}

module.exports = { mapWgerExercise };
