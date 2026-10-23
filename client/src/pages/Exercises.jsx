import { useEffect, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { listExercises } from '../services/exerciseService';

const labelFor = (options, value) => options.find((option) => option.value === value)?.label;

export default function Exercises() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  // Results remember which filters they belong to. While they don't match
  // the current filters, a request is in flight, so we show "Loading...".
  const filtersKey = JSON.stringify([debouncedSearch, muscle, equipment]);
  const [result, setResult] = useState({ key: null, exercises: [], total: 0, error: '' });
  const loading = result.key !== filtersKey;

  useEffect(() => {
    // If the filters change before this request finishes, ignore its answer,
    // so a slow old response can't replace newer results
    let ignore = false;

    listExercises(token, { search: debouncedSearch, muscle, equipment })
      .then(({ exercises, total }) => {
        if (!ignore) setResult({ key: filtersKey, exercises, total, error: '' });
      })
      .catch((error) => {
        if (!ignore) setResult({ key: filtersKey, exercises: [], total: 0, error: error.message });
      });

    return () => {
      ignore = true;
    };
  }, [token, debouncedSearch, muscle, equipment, filtersKey]);

  return (
    <main className="page">
      <h1>Exercise library</h1>

      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            placeholder="e.g. bench press"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="muscle">Muscle group</label>
          <select id="muscle" value={muscle} onChange={(event) => setMuscle(event.target.value)}>
            <option value="">All muscle groups</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="equipment">Equipment</label>
          <select
            id="equipment"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
          >
            <option value="">All equipment</option>
            {EQUIPMENT.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* aria-live announces result changes to screen reader users */}
      <div aria-live="polite">
        {loading && <p>Loading...</p>}
        {!loading && result.error && <p className="form-error">{result.error}</p>}
        {!loading && !result.error && result.total === 0 && (
          <p>No exercises match. Try a different search or filter.</p>
        )}
        {!loading && result.total > result.exercises.length && (
          <p>
            Showing {result.exercises.length} of {result.total}. Narrow your search to see more.
          </p>
        )}
      </div>

      {!loading && (
        <ul className="exercise-list">
          {result.exercises.map((exercise) => (
            <li key={exercise._id} className="exercise-card">
              <h2>{exercise.name}</h2>
              <p className="exercise-tags">
                {exercise.muscleGroups.map((group) => (
                  <span key={group} className="tag">
                    {labelFor(MUSCLE_GROUPS, group)}
                  </span>
                ))}
                <span className="tag tag-equipment">{labelFor(EQUIPMENT, exercise.equipment)}</span>
              </p>
              {exercise.description && (
                <details>
                  <summary>How to do it</summary>
                  <p>{exercise.description}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
