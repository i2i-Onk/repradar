const { mapWgerExercise } = require('../src/utils/wgerMapping');

// Builds a wger exercise with sensible defaults; each test overrides what it needs
function wgerExercise(overrides = {}) {
  return {
    id: 101,
    category: { id: 11, name: 'Chest' },
    muscles: [{ id: 4 }],
    equipment: [{ id: 1, name: 'Barbell' }],
    translations: [
      { language: 1, name: 'Bankdrücken', description: '<p>Deutsch</p>' },
      { language: 2, name: 'Bench Press', description: '<p>Lie on the bench.</p>' },
    ],
    ...overrides,
  };
}

describe('mapWgerExercise', () => {
  it('maps a typical exercise to our fields', () => {
    expect(mapWgerExercise(wgerExercise())).toEqual({
      wgerId: 101,
      name: 'Bench Press',
      muscleGroups: ['chest'],
      equipment: 'barbell',
      description: 'Lie on the bench.',
    });
  });

  it('returns null when there is no English translation', () => {
    const raw = wgerExercise({ translations: [{ language: 1, name: 'Bankdrücken' }] });
    expect(mapWgerExercise(raw)).toBeNull();
  });

  it('returns null when the English name is blank', () => {
    const raw = wgerExercise({ translations: [{ language: 2, name: '   ' }] });
    expect(mapWgerExercise(raw)).toBeNull();
  });

  it('maps several wger muscles to our groups without duplicates', () => {
    // Biceps brachii (1) and brachialis (13) are both "biceps"; lats (12) is "back"
    const raw = wgerExercise({ muscles: [{ id: 1 }, { id: 13 }, { id: 12 }] });
    expect(mapWgerExercise(raw).muscleGroups).toEqual(['biceps', 'back']);
  });

  it('falls back to the category when no primary muscles are listed', () => {
    const raw = wgerExercise({ muscles: [], category: { id: 10, name: 'Abs' } });
    expect(mapWgerExercise(raw).muscleGroups).toEqual(['core']);
  });

  it('returns null for an ambiguous category with no muscles', () => {
    const raw = wgerExercise({ muscles: [], category: { id: 8, name: 'Arms' } });
    expect(mapWgerExercise(raw)).toBeNull();
  });

  it('picks the main equipment and ignores accessories like a bench', () => {
    const raw = wgerExercise({ equipment: [{ id: 8 }, { id: 3 }] }); // bench + dumbbell
    expect(mapWgerExercise(raw).equipment).toBe('dumbbell');
  });

  it('treats "none (bodyweight exercise)" as bodyweight', () => {
    const raw = wgerExercise({ equipment: [{ id: 7 }] });
    expect(mapWgerExercise(raw).equipment).toBe('bodyweight');
  });

  it('infers machine from the name when no equipment maps', () => {
    const raw = wgerExercise({
      equipment: [],
      translations: [{ language: 2, name: 'Leg Press', description: '' }],
    });
    expect(mapWgerExercise(raw).equipment).toBe('machine');
  });

  it('returns null when the equipment cannot be worked out', () => {
    const raw = wgerExercise({ equipment: [{ id: 5 }] }); // Swiss ball only
    expect(mapWgerExercise(raw)).toBeNull();
  });

  it('strips HTML and extra whitespace from the description', () => {
    const raw = wgerExercise({
      translations: [
        {
          language: 2,
          name: 'Bench Press',
          description: '<p>Grip the bar&nbsp;tightly.</p>\n<ul><li>Lower &amp; press</li></ul>',
        },
      ],
    });
    expect(mapWgerExercise(raw).description).toBe('Grip the bar tightly. Lower & press');
  });
});
