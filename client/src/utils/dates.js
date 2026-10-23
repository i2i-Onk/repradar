// A date input gives "YYYY-MM-DD". new Date("2026-10-23") means midnight UTC,
// which is still Oct 22 in North America, so the wrong day would be saved and
// shown. Instead, store the chosen day at 12:00 local time: that stays on the
// same calendar day in every time zone the user is likely to be in.

const pad = (number) => String(number).padStart(2, '0');

// Date object → "YYYY-MM-DD" in local time (for <input type="date">)
export function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM-DD" → ISO string for 12:00 local time on that day
export function fromDateInputValue(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}

// ISO string → e.g. "Fri, Oct 23, 2026"
export function formatWorkoutDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
