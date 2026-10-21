import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Any component can call useAuth() to get the user, status, login, signup and logout
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
