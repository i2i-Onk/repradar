import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { checkIn, getCheckinSummary } from '../services/checkinService';
import { formatDistance } from '../utils/dates';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function Summary({ summary }) {
  const { streak, week } = summary;
  return (
    <section className="checkin-stats" aria-label="Your check-in progress">
      <div className="stat">
        <span className="stat-number">{streak}</span>
        <span>day streak</span>
      </div>
      <div className="stat stat-wide">
        <label htmlFor="week-progress">
          This week: <strong>{week.count}</strong> of {week.goal}
        </label>
        <progress id="week-progress" max={week.goal} value={Math.min(week.count, week.goal)} />
        <span className="field-hint">
          {week.remaining === 0
            ? 'Weekly goal reached. Great work!'
            : `${plural(week.remaining, 'more check-in')} to reach your goal.`}
        </span>
      </div>
    </section>
  );
}

function Result({ result }) {
  const { checkIn: saved, radius } = result;
  if (saved.verified) {
    return (
      <p className="form-success" role="status">
        Checked in! You're {formatDistance(saved.distance)} from your gym.
      </p>
    );
  }
  return (
    <p className="form-error" role="status">
      Not counted: you're {formatDistance(saved.distance)} from your saved gym. Check-ins count
      within {formatDistance(radius)}. If you are at the gym, your saved location may be off: update
      it in <Link to="/settings">Settings</Link>.
    </p>
  );
}

export default function CheckIn() {
  const { token } = useAuth();
  const { locating, requestLocation } = useGeolocation();
  const [state, setState] = useState({ loading: true, summary: null, error: '' });
  const [result, setResult] = useState(null);
  const [checkInError, setCheckInError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let ignore = false;
    getCheckinSummary(token)
      .then((summary) => {
        if (!ignore) setState({ loading: false, summary, error: '' });
      })
      .catch((error) => {
        if (!ignore) setState({ loading: false, summary: null, error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  // Location is read here, when the button is pressed, and nowhere else
  async function handleCheckIn() {
    setResult(null);
    setCheckInError('');
    try {
      const { lat, lng } = await requestLocation();
      setSending(true);
      const response = await checkIn(token, { lat, lng });
      setResult(response);
      setState((current) => ({ ...current, summary: response.summary }));
    } catch (error) {
      setCheckInError(error.message);
    } finally {
      setSending(false);
    }
  }

  const { summary } = state;
  const busy = locating || sending;

  return (
    <main className="page">
      <h1>Gym check-in</h1>

      {state.loading && <p>Loading...</p>}
      {state.error && <p className="form-error">{state.error}</p>}

      {summary && (
        <>
          <Summary summary={summary} />

          {!summary.hasGymLocation ? (
            <p>
              First, save your gym's location in <Link to="/settings">Settings</Link> (stand in the
              gym and press "Use my current location").
            </p>
          ) : summary.todayCheckedIn ? (
            // Already done today: no button. Just after checking in, the result
            // below says so, so this note would only repeat it.
            !result && <p className="form-success">You've checked in today. See you next time!</p>
          ) : (
            <button
              type="button"
              className="checkin-button"
              onClick={handleCheckIn}
              disabled={busy}
            >
              {locating ? 'Finding your location...' : sending ? 'Checking in...' : 'Check in'}
            </button>
          )}

          <div aria-live="polite">
            {result && <Result result={result} />}
            {checkInError && <p className="form-error">{checkInError}</p>}
          </div>

          <p className="field-hint">
            Your location is read only when you press Check in. RepRadar saves that check-in's
            coordinates and distance from your gym, and never tracks you in the background.
          </p>
        </>
      )}
    </main>
  );
}
