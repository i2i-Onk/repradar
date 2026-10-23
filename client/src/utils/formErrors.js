// Turns the API's validation list [{ field, message }] into
// { fieldName: message } so each input can show its own error.
// Keeps the first message if a field has more than one.
// List items like "equipment[2]" are grouped under "equipment".
export function toFieldErrors(details = []) {
  const errors = {};
  for (const { field, message } of details) {
    const name = field.replace(/\[\d+\]$/, '');
    if (!errors[name]) {
      errors[name] = message;
    }
  }
  return errors;
}
