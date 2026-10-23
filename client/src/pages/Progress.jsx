import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import {
  getCheckinWeeks,
  getExerciseProgress,
  listLoggedExercises,
} from '../services/progressService';
import { formatShortDate, formatShortDay, formatWorkoutDate } from '../utils/dates';

// Chart colours (see the "Progress charts" note in ARCHITECTURE.md). One series
// per chart, so one colour: validated for 3:1+ contrast on the white page.
const SERIES_COLOR = '#2a78d6';
const GOAL_COLOR = '#52514e'; // neutral, so the goal line doesn't read as a second series
const GRID_COLOR = '#e5e5e5';
const AXIS = { fontSize: 12, fill: '#52514e' };

// Line charts show change, so the weight axis fits the data instead of starting
// at 0, which would flatten real progress. (Bar charts are different: bars must
// start at 0, and the check-in chart does.) Ticks are worked out here, in even
// steps of 5, 10 or 25 kg, because Recharts' own picks can be uneven (45, 52, 59...).
function weightAxis(points) {
  const weights = points.map((point) => point.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const spread = max - min;
  const step = spread <= 20 ? 5 : spread <= 50 ? 10 : 25;
  const low = Math.max(0, Math.floor((min - step / 2) / step) * step);
  const high = Math.ceil((max + step / 2) / step) * step;
  const ticks = [];
  for (let tick = low; tick <= high; tick += step) ticks.push(tick);
  return { domain: [low, high], ticks };
}

// Loads data for one section; `key` says which request the data belongs to
function useLoad(load, key) {
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  useEffect(() => {
    if (key === null) return;
    let ignore = false;
    load()
      .then((data) => !ignore && setResult({ key, data, error: '' }))
      .catch((error) => !ignore && setResult({ key, data: null, error: error.message }));
    return () => {
      ignore = true;
    };
    // `load` changes every render; `key` captures everything it depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { ...result, loading: key !== null && result.key !== key };
}

function ChartTooltip({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">{render(payload[0].payload)}</div>;
}

function WeightChart({ token, exercises }) {
  // Default to the exercise logged most often
  const mostLogged = [...exercises].sort((a, b) => b.sessions - a.sessions)[0];
  const [chosenId, setChosenId] = useState('');
  const exerciseId = chosenId || mostLogged._id;
  const progress = useLoad(() => getExerciseProgress(token, exerciseId), exerciseId);

  // `time` puts sessions on a real time axis, so a two-week break looks like one
  const points = (progress.data?.points ?? []).map((point) => ({
    ...point,
    time: new Date(point.date).getTime(),
  }));
  const allBodyweight = points.length > 0 && points.every((point) => point.weight === 0);
  const axis = points.length > 0 ? weightAxis(points) : null;

  return (
    <section className="chart-card" aria-labelledby="weight-heading">
      <h2 id="weight-heading">Heaviest set per session</h2>
      <div className="field">
        <label htmlFor="exercise-choice">Exercise</label>
        <select
          id="exercise-choice"
          value={exerciseId}
          onChange={(event) => setChosenId(event.target.value)}
        >
          {exercises.map((exercise) => (
            <option key={exercise._id} value={exercise._id}>
              {exercise.name} ({exercise.sessions}{' '}
              {exercise.sessions === 1 ? 'session' : 'sessions'})
            </option>
          ))}
        </select>
      </div>

      {progress.loading && <p>Loading...</p>}
      {progress.error && <p className="form-error">{progress.error}</p>}

      {!progress.loading && allBodyweight && (
        <p className="chart-empty">
          You've logged this exercise without weight (bodyweight), so there's nothing to chart here
          yet. Pick an exercise you do with weight.
        </p>
      )}

      {!progress.loading && points.length > 0 && !allBodyweight && (
        <>
          <figure className="chart" aria-label={`Heaviest weight per session, in kilograms`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatShortDate}
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  minTickGap={16}
                />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  unit=" kg"
                  width={64}
                  domain={axis.domain}
                  ticks={axis.ticks}
                />
                <Tooltip
                  cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
                  content={
                    <ChartTooltip
                      render={(point) => (
                        <>
                          <strong>{formatWorkoutDate(point.date)}</strong>
                          <span>
                            {point.weight} kg × {point.reps}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Line
                  type="linear"
                  dataKey="weight"
                  stroke={SERIES_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, fill: SERIES_COLOR, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: SERIES_COLOR, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </figure>
          {points.length === 1 && (
            <p className="field-hint">One session so far. Log it again to see a trend.</p>
          )}
          <details>
            <summary>Show as a table</summary>
            <table className="chart-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Heaviest set</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.workoutId}>
                    <td>{formatWorkoutDate(point.date)}</td>
                    <td>
                      {point.weight} kg × {point.reps}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

function CheckinChart({ token }) {
  const checkins = useLoad(() => getCheckinWeeks(token), 'checkins');
  const weeks = (checkins.data?.weeks ?? []).map((week) => ({
    ...week,
    label: formatShortDay(week.weekStart),
  }));
  const goal = checkins.data?.weeklyGoal;
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const top = Math.max(goal ?? 0, ...weeks.map((week) => week.count));

  return (
    <section className="chart-card" aria-labelledby="checkins-heading">
      <h2 id="checkins-heading">Gym check-ins per week</h2>
      <p className="field-hint">Last 8 weeks, Monday to Sunday. The dashed line is your goal.</p>

      {checkins.loading && <p>Loading...</p>}
      {checkins.error && <p className="form-error">{checkins.error}</p>}

      {!checkins.loading && checkins.data && total === 0 && (
        <p className="chart-empty">
          No verified check-ins in the last 8 weeks yet. <Link to="/checkin">Check in</Link> at the
          gym to start filling this chart.
        </p>
      )}

      {!checkins.loading && total > 0 && (
        <>
          <figure
            className="chart"
            aria-label={`Verified check-ins per week for the last 8 weeks, goal ${goal} per week`}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeks} margin={{ top: 16, right: 52, bottom: 4, left: -20 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  minTickGap={8}
                />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={[0, top + 1]}
                  ticks={Array.from({ length: top + 2 }, (_, i) => i)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                  content={
                    <ChartTooltip
                      render={(week) => (
                        <>
                          <strong>Week of {week.label}</strong>
                          <span>
                            {week.count} of {goal} check-ins
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill={SERIES_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  y={goal}
                  stroke={GOAL_COLOR}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  // In the right margin, so a tall bar can never cover it
                  label={{ value: `Goal ${goal}`, position: 'right', ...AXIS }}
                />
              </BarChart>
            </ResponsiveContainer>
          </figure>
          <details>
            <summary>Show as a table</summary>
            <table className="chart-table">
              <thead>
                <tr>
                  <th scope="col">Week of</th>
                  <th scope="col">Check-ins (goal {goal})</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.weekStart}>
                    <td>{week.label}</td>
                    <td>{week.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

export default function Progress() {
  const { token } = useAuth();
  const exercises = useLoad(() => listLoggedExercises(token), 'exercises');
  const list = exercises.data?.exercises ?? [];

  return (
    <main className="page">
      <h1>Progress</h1>

      {exercises.loading && <p>Loading...</p>}
      {exercises.error && <p className="form-error">{exercises.error}</p>}
      {!exercises.loading && exercises.data && list.length === 0 && (
        <section className="chart-card">
          <h2>Heaviest set per session</h2>
          <p className="chart-empty">
            No workouts logged yet. <Link to="/workouts/new">Log a workout</Link> and your lifts
            will show up here.
          </p>
        </section>
      )}
      {list.length > 0 && <WeightChart token={token} exercises={list} />}

      <CheckinChart token={token} />
    </main>
  );
}
