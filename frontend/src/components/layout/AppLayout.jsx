import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';
import Navbar from './Navbar';
import { PageFallback } from '../ui/Skeleton';

/** Authenticated shell: top navbar, page outlet, mobile bottom tabs. */
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16 lg:px-8">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}
