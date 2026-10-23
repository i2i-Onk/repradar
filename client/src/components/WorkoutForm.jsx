import { useState } from 'react';
import { fromDateInputValue, toDateInputValue } from '../utils/dates';
import { toFieldErrors } from '../utils/formErrors';
import ExercisePicker from './ExercisePicker';

const emptySet = { reps: '', weight: '' };

// Form state keeps inputs as strings (what <input> gives us).
// Each entry gets a `key` so React can track it when entries are removed.
let nextKey = 1;
const newKey = () => nextKey++;

function formFromWorkout(workout) {
  if (!workout) {
    return { date: toDateInputValue(new Date()), entries: [] };
  }
  return {
    date: toDateInputValue(workout.date),
    entries: workout.entries.map((entry) => ({
      key: newKey(),
      exercise: entry.exercise, // null if the exercise was removed from the library
      sets: entry.sets.map((set) => ({ reps: String(set.reps), weight: String(set.weight) })),
    })),
  };
}

// What the API expects: exercise ids and numbers. An empty weight means
// bodyweight (0); an empty reps value is sent as-is so the API reports it.
function toPayload(form) {
  return {
    date: fromDateInputValue(form.date),
    entries: form.entries.map((entry) => ({
      exercise: entry.exercise?._id,
      sets: entry.sets.map((set) => ({
        reps: set.reps === '' ? '' : Number(set.reps),
        weight: set.weight === '' ? 0 : Number(set.weight),
      })),
    })),
  };
}

// Used by both Log Workout and Edit Workout. onSubmit(payload) should return a promise.
export default function WorkoutForm({ initialWorkout, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => formFromWorkout(initialWorkout));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Returns a copy of the entries with one entry changed
  function updateEntry(entryIndex, change) {
    return form.entries.map((entry, i) => (i === entryIndex ? change(entry) : entry));
  }

  // Adding or removing rows moves the positions that error messages point at,
  // so old errors are cleared when the shape of the form changes
  function changeShape(entries) {
    setForm({ ...form, entries });
    setFieldErrors({});
  }

  function addExercise(exercise) {
    changeShape([...form.entries, { key: newKey(), exercise, sets: [{ ...emptySet }] }]);
  }

  function removeExercise(entryIndex) {
    changeShape(form.entries.filter((_, i) => i !== entryIndex));
  }

  // A new set starts as a copy of the previous one, since sets are often repeated
  function addSet(entryIndex) {
    changeShape(
      updateEntry(entryIndex, (entry) => ({
        ...entry,
        sets: [...entry.sets, { ...(entry.sets.at(-1) ?? emptySet) }],
      })),
    );
  }

  function removeSet(entryIndex, setIndex) {
    changeShape(
      updateEntry(entryIndex, (entry) => ({
        ...entry,
        sets: entry.sets.filter((_, i) => i !== setIndex),
      })),
    );
  }

  function changeSet(entryIndex, setIndex, field, value) {
    const entries = updateEntry(entryIndex, (entry) => ({
      ...entry,
      sets: entry.sets.map((set, i) => (i === setIndex ? { ...set, [field]: value } : set)),
    }));
    setForm({ ...form, entries });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError('');

    try {
      // On success the page navigates away, so there's nothing to reset here
      await onSubmit(toPayload(form));
    } catch (error) {
      if (error.details) {
        setFieldErrors(toFieldErrors(error.details));
      } else {
        setFormError(error.message);
      }
      setSaving(false);
    }
  }

  return (
    <form className="form workout-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="field">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={form.date}
          max={toDateInputValue(new Date())}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
        {fieldErrors.date && <p className="field-error">{fieldErrors.date}</p>}
      </div>

      {form.entries.length === 0 && <p>No exercises yet. Search below to add one.</p>}
      {fieldErrors.entries && <p className="field-error">{fieldErrors.entries}</p>}

      {form.entries.map((entry, entryIndex) => {
        const path = `entries[${entryIndex}]`;
        const name = entry.exercise?.name ?? 'Exercise no longer in the library';

        return (
          <fieldset key={entry.key} className="entry-card">
            <legend>{name}</legend>
            {fieldErrors[`${path}.exercise`] && (
              <p className="field-error">{fieldErrors[`${path}.exercise`]}</p>
            )}

            <div className="set-row set-header" aria-hidden="true">
              <span>Set</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span />
            </div>

            {entry.sets.map((set, setIndex) => {
              const setPath = `${path}.sets[${setIndex}]`;
              const setError = fieldErrors[`${setPath}.reps`] || fieldErrors[`${setPath}.weight`];
              const label = `${name}, set ${setIndex + 1}`;

              return (
                <div key={setIndex}>
                  <div className="set-row">
                    <span>{setIndex + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      aria-label={`${label} reps`}
                      aria-invalid={Boolean(fieldErrors[`${setPath}.reps`])}
                      value={set.reps}
                      onChange={(event) =>
                        changeSet(entryIndex, setIndex, 'reps', event.target.value)
                      }
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="0"
                      aria-label={`${label} weight in kg`}
                      aria-invalid={Boolean(fieldErrors[`${setPath}.weight`])}
                      value={set.weight}
                      onChange={(event) =>
                        changeSet(entryIndex, setIndex, 'weight', event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${label}`}
                      onClick={() => removeSet(entryIndex, setIndex)}
                    >
                      ×
                    </button>
                  </div>
                  {setError && <p className="field-error">{setError}</p>}
                </div>
              );
            })}

            {fieldErrors[`${path}.sets`] && (
              <p className="field-error">{fieldErrors[`${path}.sets`]}</p>
            )}

            <div className="entry-actions">
              <button type="button" onClick={() => addSet(entryIndex)}>
                + Add set
              </button>
              <button type="button" onClick={() => removeExercise(entryIndex)}>
                Remove exercise
              </button>
            </div>
          </fieldset>
        );
      })}

      <ExercisePicker onPick={addExercise} />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
