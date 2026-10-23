import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { listExercises } from '../services/exerciseService';

const MIN_SEARCH = 2;
const MAX_RESULTS = 10;

// Search box for the exercise library. Calls onPick(exercise) when one is chosen.
export default function ExercisePicker({ onPick }) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  // Results remember which search they belong to (same pattern as the Exercises page)
  const [result, setResult] = useState({ search: '', exercises: [], error: '' });

  const tooShort = debouncedSearch.length < MIN_SEARCH;
  const loading = !tooShort && result.search !== debouncedSearch;

  useEffect(() => {
    if (debouncedSearch.length < MIN_SEARCH) return;
    let ignore = false;

    listExercises(token, { search: debouncedSearch, limit: MAX_RESULTS })
      .then(({ exercises }) => {
        if (!ignore) setResult({ search: debouncedSearch, exercises, error: '' });
      })
      .catch((error) => {
        if (!ignore) setResult({ search: debouncedSearch, exercises: [], error: error.message });
      });

    return () => {
      ignore = true;
    };
  }, [token, debouncedSearch]);

  function pick(exercise) {
    onPick(exercise);
    setSearch('');
  }

  return (
    <div className="exercise-picker">
      <div className="field">
        <label htmlFor="exercise-search">Add an exercise</label>
        <input
          id="exercise-search"
          type="search"
          placeholder="Search the library, e.g. squat"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div aria-live="polite">
        {loading && <p>Searching...</p>}
        {!tooShort && !loading && result.error && <p className="form-error">{result.error}</p>}
        {!tooShort && !loading && !result.error && result.exercises.length === 0 && (
          <p>No exercises match.</p>
        )}
      </div>

      {!tooShort && !loading && result.exercises.length > 0 && (
        <ul className="picker-results">
          {result.exercises.map((exercise) => (
            <li key={exercise._id}>
              <button type="button" onClick={() => pick(exercise)}>
                + {exercise.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
