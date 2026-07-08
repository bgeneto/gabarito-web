interface DashboardTabBarProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (tab: T) => void;
}

export function DashboardTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: DashboardTabBarProps<T>) {
  return (
    <div className="sticky top-0 z-10 glass-panel border border-slate-800 rounded-2xl p-1 flex">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2.5 px-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
            active === tab.id
              ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
