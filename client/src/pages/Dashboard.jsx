import { useAuth } from '../hooks/useAuth';

// Placeholder until the muscle recovery dashboard is built (build order step 5)
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <main className="page">
      <h1>Welcome, {user.name}</h1>
      <p>Your muscle recovery dashboard will appear here.</p>
    </main>
  );
}
