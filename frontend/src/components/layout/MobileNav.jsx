import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** Bottom tab bar, visible below the md breakpoint. */
export default function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-[#f3efe6]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#070b14]/90 md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ to, short, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
