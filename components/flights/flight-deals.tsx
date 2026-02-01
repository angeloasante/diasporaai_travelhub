const deals = [
  {
    route: "LHR → ACC",
    airline: "British Airways",
    price: 389,
    discount: 22,
    departure: "Mar 15",
  },
  {
    route: "LHR → LOS",
    airline: "Virgin Atlantic",
    price: 445,
    discount: 18,
    departure: "Mar 20",
  },
  {
    route: "JFK → NBO",
    airline: "Kenya Airways",
    price: 680,
    discount: 15,
    departure: "Apr 02",
  },
];

export function FlightDeals() {
  return (
    <div className="rounded-[32px] bg-[#0f0f11] border border-white/5 p-6 md:p-8 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Hot Deals</h2>
        <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          Limited Time
        </span>
      </div>

      <div className="space-y-4">
        {deals.map((deal, index) => (
          <div
            key={`${deal.route}-${index}`}
            className="group p-4 rounded-2xl bg-zinc-800/30 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {deal.route}
                </h3>
                <p className="text-xs text-zinc-500">{deal.airline}</p>
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                -{deal.discount}%
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div className="text-xs text-zinc-500">
                Departs {deal.departure}
              </div>
              <div className="text-xl font-bold text-white">
                ${deal.price}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full mt-6 py-3 rounded-xl border border-white/10 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
      >
        View All Deals
      </button>
    </div>
  );
}
