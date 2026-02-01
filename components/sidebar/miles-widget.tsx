export function MilesWidget() {
  const milesEarned = 42500;
  const milesGoal = 65000;
  const percentage = (milesEarned / milesGoal) * 100;

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden group bg-[#121214] border border-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-end mb-3 relative z-10">
        <span className="text-xs font-medium text-zinc-500">
          Miles Earned
        </span>
        <span className="text-sm font-bold text-blue-400">
          {milesEarned.toLocaleString()}
        </span>
      </div>
      
      <div className="h-1.5 w-full rounded-full overflow-hidden relative z-10 bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
