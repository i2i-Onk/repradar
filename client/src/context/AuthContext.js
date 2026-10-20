import { createContext } from 'react';

// The shared "noticeboard" for auth state. AuthProvider fills it in,
// and useAuth reads from it.
export const AuthContext = createContext(null);