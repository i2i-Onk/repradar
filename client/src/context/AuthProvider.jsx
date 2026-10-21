import { useEffect, useReducer } from 'react';
import { AuthContext } from './AuthContext';
import * as authService from '../services/authService';

const TOKEN_KEY = 'repradar_token';

// status is 'loading' (checking a saved token), 'authenticated' or 'guest'
const initialState = { user: null, token: null, status: 'loading' };

// Every possible change to auth state, in one place
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.user, token: action.token, status: 'authenticated' };
    case 'LOGOUT':
      return { user: null, token: null, status: 'guest' };
    default:
      throw new Error(`Unknown auth action: ${action.type}`);
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On first load, if a token was saved earlier, ask the API who it belongs to
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      dispatch({ type: 'LOGOUT' });
      return;
    }

    authService
      .getMe(savedToken)
      .then(({ user }) => dispatch({ type: 'LOGIN_SUCCESS', user, token: savedToken }))
      .catch(() => {
        // Token expired or invalid: forget it
        localStorage.removeItem(TOKEN_KEY);
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  async function login(credentials) {
    const { user, token } = await authService.login(credentials);
    localStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: 'LOGIN_SUCCESS', user, token });
  }

  async function signup(details) {
    const { user, token } = await authService.signup(details);
    localStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: 'LOGIN_SUCCESS', user, token });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    dispatch({ type: 'LOGOUT' });
  }

  const value = { ...state, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
