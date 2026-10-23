import { useCallback, useState } from 'react';

// Friendly messages for each way getting a location can fail
const MESSAGES = {
  unsupported:
    "This browser can't share your location. Try a recent version of Chrome, Firefox, Safari or Edge.",
  insecure: 'Location only works over a secure (https) connection.',
  1: "Location access is blocked for RepRadar. Allow location for this site in your browser's settings, then try again.",
  2: "Your device couldn't work out where you are. Check that location services are turned on, then try again.",
  3: 'Finding your location took too long. Try again; moving near a window or outside often helps.',
};

const OPTIONS = {
  enableHighAccuracy: true, // GPS where available, not just Wi-Fi
  timeout: 15000, // give up after 15 seconds
  maximumAge: 0, // always a fresh reading, never a cached one
};

// Reads the user's location ONCE, only when requestLocation() is called
// (e.g. on a button press). Nothing here watches or tracks location.
//
// const { locating, error, requestLocation } = useGeolocation();
// const { lat, lng, accuracy } = await requestLocation(); // throws Error(friendly message)
export function useGeolocation() {
  const [state, setState] = useState({ locating: false, error: '' });

  const requestLocation = useCallback(
    () =>
      new Promise((resolve, reject) => {
        const fail = (message) => {
          setState({ locating: false, error: message });
          reject(new Error(message));
        };

        if (!window.isSecureContext) return fail(MESSAGES.insecure);
        if (!('geolocation' in navigator)) return fail(MESSAGES.unsupported);

        setState({ locating: true, error: '' });
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            setState({ locating: false, error: '' });
            resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
          },
          (error) => fail(MESSAGES[error.code] ?? MESSAGES[2]),
          OPTIONS,
        );
      }),
    [],
  );

  return { ...state, requestLocation };
}
