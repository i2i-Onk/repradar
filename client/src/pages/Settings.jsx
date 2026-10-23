import { useState } from 'react';
import FormField from '../components/FormField';
import { EQUIPMENT, GOALS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { toFieldErrors } from '../utils/formErrors';

// Builds the form's starting values from the saved user
function formFromUser(user) {
  return {
    goal: user.goal,
    equipment: user.equipment,
    weeklyGoal: String(user.weeklyGoal),
    lat: user.gymLocation?.lat?.toString() ?? '',
    lng: user.gymLocation?.lng?.toString() ?? '',
  };
}

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState(() => formFromUser(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function toggleEquipment(value) {
    const equipment = form.equipment.includes(value)
      ? form.equipment.filter((item) => item !== value)
      : [...form.equipment, value];
    setForm({ ...form, equipment });
  }

  // Location is read only when the user clicks this button, never in the background
  function fillCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Your browser does not support location.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        }));
      },
      () => setMessage({ type: 'error', text: 'Could not get your location.' }),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setMessage({ type: '', text: '' });

    const changes = {
      goal: form.goal,
      equipment: form.equipment,
      weeklyGoal: Number(form.weeklyGoal),
    };
    // Only send a gym location if the user entered one
    if (form.lat !== '' || form.lng !== '') {
      changes.gymLocation = { lat: form.lat, lng: form.lng };
    }

    try {
      await updateProfile(changes);
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (error) {
      if (error.details) {
        setFieldErrors(toFieldErrors(error.details));
      } else {
        setMessage({ type: 'error', text: error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  const locationError = fieldErrors.gymLocation || fieldErrors['gymLocation.lat'];

  return (
    <main className="page">
      <h1>Settings</h1>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {message.text && (
          <p className={message.type === 'error' ? 'form-error' : 'form-success'} role="status">
            {message.text}
          </p>
        )}

        <div className="field">
          <label htmlFor="goal">Training goal</label>
          <select id="goal" name="goal" value={form.goal} onChange={handleChange}>
            {GOALS.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
          {fieldErrors.goal && <p className="field-error">{fieldErrors.goal}</p>}
        </div>

        <fieldset className="field">
          <legend>Equipment I have access to</legend>
          {EQUIPMENT.map((item) => (
            <label key={item.value} className="checkbox">
              <input
                type="checkbox"
                checked={form.equipment.includes(item.value)}
                onChange={() => toggleEquipment(item.value)}
              />
              {item.label}
            </label>
          ))}
          {fieldErrors.equipment && <p className="field-error">{fieldErrors.equipment}</p>}
        </fieldset>

        <FormField
          label="Weekly goal (gym days per week)"
          name="weeklyGoal"
          type="number"
          min="1"
          max="7"
          value={form.weeklyGoal}
          onChange={handleChange}
          error={fieldErrors.weeklyGoal}
        />

        <fieldset className="field">
          <legend>Gym location (used to verify check-ins)</legend>
          <FormField
            label="Latitude"
            name="lat"
            type="number"
            step="any"
            value={form.lat}
            onChange={handleChange}
            error={locationError}
          />
          <FormField
            label="Longitude"
            name="lng"
            type="number"
            step="any"
            value={form.lng}
            onChange={handleChange}
            error={fieldErrors['gymLocation.lng']}
          />
          <button type="button" onClick={fillCurrentLocation}>
            Use my current location
          </button>
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </main>
  );
}
