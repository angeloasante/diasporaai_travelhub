"use client";

import { useState } from "react";
import { PlaneIcon } from "@/components/icons";

type TripType = "roundtrip" | "oneway" | "multicity";

export function FlightSearchForm() {
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);

  const tripTypes: { value: TripType; label: string }[] = [
    { value: "roundtrip", label: "Round Trip" },
    { value: "oneway", label: "One Way" },
    { value: "multicity", label: "Multi-City" },
  ];

  return (
    <div className="rounded-[32px] bg-[#0f0f11] border border-white/5 p-6 md:p-8">
      {/* Trip Type Selector */}
      <div className="flex gap-2 mb-6">
        {tripTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setTripType(type.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tripType === type.value
                ? "bg-blue-500 text-white"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* From */}
        <div className="relative">
          <label htmlFor="from-input" className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
            From
          </label>
          <input
            id="from-input"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="London (LHR)"
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Swap Button (positioned between from/to on larger screens) */}
        <div className="hidden lg:flex absolute left-[calc(25%-12px)] top-[50%] z-10">
          <button
            type="button"
            aria-label="Swap departure and destination"
            className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-400 transition-colors"
          >
            ⇄
          </button>
        </div>

        {/* To */}
        <div>
          <label htmlFor="to-input" className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
            To
          </label>
          <input
            id="to-input"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Accra (ACC)"
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Depart Date */}
        <div>
          <label htmlFor="depart-input" className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
            Depart
          </label>
          <input
            id="depart-input"
            type="date"
            value={departDate}
            onChange={(e) => setDepartDate(e.target.value)}
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Return Date */}
        <div>
          <label htmlFor="return-input" className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
            Return
          </label>
          <input
            id="return-input"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            disabled={tripType === "oneway"}
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Passengers & Search Button */}
      <div className="flex flex-col md:flex-row gap-4 mt-6 items-end">
        <div className="w-full md:w-auto">
          <label htmlFor="passengers-input" className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
            Passengers
          </label>
          <select
            id="passengers-input"
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="w-full md:w-32 bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? "Adult" : "Adults"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="flex-1 md:flex-none bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          <PlaneIcon className="w-5 h-5" />
          Search Flights
        </button>
      </div>
    </div>
  );
}
