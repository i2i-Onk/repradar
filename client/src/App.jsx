import { useAuth } from './hooks/useAuth';

export default function App() {
  const { status, user } = useAuth();

  return (
    <p>
      Auth status: {status}
      {user && ` (logged in as ${user.name})`}
    </p>
  );
}