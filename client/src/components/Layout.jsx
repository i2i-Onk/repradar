import { Outlet } from 'react-router';
import Navbar from './Navbar';

// The frame around every logged-in page: navbar on top, page underneath
export default function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
