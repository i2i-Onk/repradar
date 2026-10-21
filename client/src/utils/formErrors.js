// Turns the API's validation list [{ field, message }] into
// { fieldName: message } so each input can show its own error.
// Keeps the first message if a field has more than one.
export function toFieldErrors(details = []) {
  const errors = {};
  for (const { field, message } of details) {
    if (!errors[field]) {
      errors[field] = message;
    }
  }
  return errors;
}
