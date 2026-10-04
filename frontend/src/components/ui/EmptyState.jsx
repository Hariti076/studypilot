export default function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="card animate-fade-up mx-auto max-w-lg py-10 text-center">
      {Icon && (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {text && <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}
