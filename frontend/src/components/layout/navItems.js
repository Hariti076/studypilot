import { CalendarDays, LayoutDashboard, ListChecks, SlidersHorizontal } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', short: 'Dashboard', icon: LayoutDashboard },
  { to: '/planner', label: 'Planner', short: 'Planner', icon: CalendarDays },
  { to: '/progress', label: 'Progress', short: 'Progress', icon: ListChecks },
  { to: '/inputs', label: 'Inputs', short: 'Inputs', icon: SlidersHorizontal },
];
