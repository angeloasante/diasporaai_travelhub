"use client";

interface PriceBar {
  month: string;
  height: number;
  price?: number;
  highlighted?: boolean;
}

interface PriceTrendsChartProps {
  title: string;
  subtitle: string;
  bars: PriceBar[];
}

export function PriceTrendsChart({ title, subtitle, bars }: PriceTrendsChartProps) {
  return (
    <div className="md:col-span-3 min-h-[360px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 md:p-10 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-500/5 pointer-events-none" />

      <div className="flex justify-between items-start mb-16">
        <div>
          <h3 className="text-xl font-semibold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-blue-400 mt-1">
            {subtitle}{" "}
            <span className="text-zinc-500 font-normal">book now to save</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-amber-400">In Development</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex items-end justify-between h-40 gap-4 w-full px-4">
        {bars.map((bar, index) => (
          <div
            key={`${bar.month}-${index}`}
            className="flex-1 h-full flex flex-col justify-end group/bar cursor-pointer"
          >
            <div
              className={`relative w-full rounded-md transition-all duration-300 ${
                bar.highlighted
                  ? "bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover/bar:bg-blue-400"
                  : "bg-zinc-800/50 group-hover/bar:bg-zinc-700/50"
              }`}
              style={{ height: `${bar.height}%` }}
            >
              {/* Tooltip for highlighted bar */}
              {bar.highlighted && bar.price && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold py-1.5 px-3 rounded-lg shadow-lg">
                  ${bar.price}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                </div>
              )}
            </div>
            {bar.month && (
              <div
                className={`text-center mt-4 text-xs font-medium ${
                  bar.highlighted ? "text-blue-400" : "text-zinc-600"
                }`}
              >
                {bar.month}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
