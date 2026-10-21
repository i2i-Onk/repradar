import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go to the dashboard</Link>
      </p>
    </main>
  );
}
