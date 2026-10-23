import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EQUIPMENT, GOALS, MUSCLE_GROUPS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { getDashboard } from '../services/dashboardService';

const labelFor = (options, value) => options.find((option) => option.value === value)?.label;

const STATUS_LABELS = { recent: 'Recent', due: 'Due', neglected: 'Neglected' };

function describeDays(daysSince) {
  if (daysSince === null) return 'Not trained yet';
  if (daysSince === 0) return 'Today';
  if (daysSince === 1) return 'Yesterday';
  return `${daysSince} days ago`;
}

// The legend uses the thresholds sent by the API, so the numbers live in one place
// (RECOVERY_THRESHOLDS in server/src/config/constants.js)
function legendItems({ recentMaxDays, dueMaxDays }) {
  return [
    { status: 'recent', text: `0–${recentMaxDays} days` },
    { status: 'due', text: `${recentMaxDays + 1}–${dueMaxDays} days` },
    { status: 'neglected', text: `${dueMaxDays + 1}+ days or never` },
  ];
}

function NoRecommendations({ user }) {
  if (user.equipment.length === 0) {
    return (
      <p>
        Add the equipment you have in <Link to="/settings">Settings</Link> to get suggestions.
      </p>
    );
  }
  return <p>Every muscle group was trained in the last couple of days. Nice work, rest up!</p>;
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let ignore = false;
    getDashboard(token)
      .then((data) => {
        if (!ignore) setState({ loading: false, data, error: '' });
      })
      .catch((error) => {
        if (!ignore) setState({ loading: false, data: null, error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  const { data } = state;

  return (
    <main className="page">
      <div className="page-header">
        <h1>Welcome back, {user.name}</h1>
        <Link to="/workouts/new">+ Log workout</Link>
      </div>

      {state.loading && <p>Loading...</p>}
      {state.error && <p className="form-error">{state.error}</p>}

      {data && (
        <>
          <section aria-labelledby="recovery-heading">
            <h2 id="recovery-heading">Muscle recovery</h2>
            <ul className="recovery-legend">
              {legendItems(data.thresholds).map((item) => (
                <li key={item.status}>
                  <span className={`status-dot status-${item.status}`} aria-hidden="true" />
                  {STATUS_LABELS[item.status]}: {item.text}
                </li>
              ))}
            </ul>

            <ul className="recovery-grid">
              {data.recovery.map((row) => (
                <li key={row.muscleGroup} className={`recovery-tile status-${row.status}`}>
                  <strong>{labelFor(MUSCLE_GROUPS, row.muscleGroup)}</strong>
                  <span>{describeDays(row.daysSince)}</span>
                  <span className="recovery-status">{STATUS_LABELS[row.status]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading">Suggested next</h2>
            {data.recommendations.groups.length === 0 ? (
              <NoRecommendations user={user} />
            ) : (
              <>
                <p>
                  For your goal ({labelFor(GOALS, data.goal)}), aim for{' '}
                  <strong>
                    {data.recommendations.repRange.min}–{data.recommendations.repRange.max} reps
                  </strong>{' '}
                  per set.
                </p>
                <ul className="suggestion-list">
                  {data.recommendations.groups.map((group) => (
                    <li key={group.muscleGroup} className="suggestion-card">
                      <h3>
                        {labelFor(MUSCLE_GROUPS, group.muscleGroup)}
                        <span className="suggestion-days"> · {describeDays(group.daysSince)}</span>
                      </h3>
                      <ul>
                        {group.exercises.map((exercise) => (
                          <li key={exercise._id}>
                            {exercise.name}{' '}
                            <span className="tag tag-equipment">
                              {labelFor(EQUIPMENT, exercise.equipment)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
