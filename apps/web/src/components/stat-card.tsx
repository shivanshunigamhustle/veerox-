interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

export default function StatCard({
  label,
  value,
  sublabel,
  accent = "from-indigo-500 to-violet-500",
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 group">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent} opacity-80 group-hover:opacity-100 transition-opacity`} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">{value}</p>
      {sublabel && <p className="mt-2 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
