"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VisaSearchProps {
  passportCountry: string;
  setPassportCountry: (country: string) => void;
  destinationCountry: string;
  setDestinationCountry: (country: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const countries = [
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", flag: "🇰🇷" },
  { name: "China", code: "CN", flag: "🇨🇳" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "Thailand", code: "TH", flag: "🇹🇭" },
  { name: "UAE", code: "AE", flag: "🇦🇪" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Turkey", code: "TR", flag: "🇹🇷" },
  { name: "Russia", code: "RU", flag: "🇷🇺" },
  { name: "Poland", code: "PL", flag: "🇵🇱" },
  { name: "Argentina", code: "AR", flag: "🇦🇷" },
  { name: "Colombia", code: "CO", flag: "🇨🇴" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  { name: "Philippines", code: "PH", flag: "🇵🇭" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { name: "Ireland", code: "IE", flag: "🇮🇪" },
  { name: "Portugal", code: "PT", flag: "🇵🇹" },
  { name: "Sweden", code: "SE", flag: "🇸🇪" },
  { name: "Norway", code: "NO", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", flag: "🇩🇰" },
  { name: "Finland", code: "FI", flag: "🇫🇮" },
  { name: "Austria", code: "AT", flag: "🇦🇹" },
  { name: "Belgium", code: "BE", flag: "🇧🇪" },
  { name: "Greece", code: "GR", flag: "🇬🇷" },
  { name: "Czech Republic", code: "CZ", flag: "🇨🇿" },
  { name: "Israel", code: "IL", flag: "🇮🇱" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", flag: "🇶🇦" },
  { name: "Pakistan", code: "PK", flag: "🇵🇰" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "Morocco", code: "MA", flag: "🇲🇦" },
];

const PassportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M3 10h3M18 10h3M3 14h3M18 14h3" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg className={`ml-auto w-5 h-5 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function VisaSearch({ passportCountry, setPassportCountry, destinationCountry, setDestinationCountry, onSearch, isLoading }: VisaSearchProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4">
        <CountrySelect label="Your Passport" value={passportCountry} onChange={setPassportCountry} placeholder="Select your passport country" icon={<PassportIcon />} />
        <CountrySelect label="Destination" value={destinationCountry} onChange={setDestinationCountry} placeholder="Where do you want to go?" icon={<GlobeIcon />} optional />
        <button type="button" onClick={onSearch} disabled={!passportCountry || isLoading} className="h-[58px] px-8 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 self-end">
          {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><SearchIcon /> Check Requirements</>}
        </button>
      </div>
      <p className="mt-4 text-sm text-zinc-500">💡 Tip: Leave destination empty to see visa requirements for popular countries</p>
    </motion.div>
  );
}

interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  optional?: boolean;
}

function CountrySelect({ label, value, onChange, placeholder, icon, optional }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase()) || country.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCountry = countries.find((c) => c.name === value);

  return (
    <div ref={ref} className="relative">
      <span className="block text-sm text-zinc-400 mb-2">{label} {optional && <span className="text-zinc-600">(optional)</span>}</span>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full h-[58px] px-4 rounded-2xl bg-white/5 border border-white/10 text-left flex items-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all">
        <span className="text-zinc-500">{icon}</span>
        {selectedCountry ? (
          <span className="flex items-center gap-2 text-white"><span>{selectedCountry.flag}</span><span>{selectedCountry.name}</span></span>
        ) : (
          <span className="text-zinc-500">{placeholder}</span>
        )}
        <ChevronIcon isOpen={isOpen} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search countries..." className="w-full px-3 py-2 bg-white/5 rounded-xl text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {optional && (
                <button type="button" onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }} className="w-full px-4 py-3 text-left text-zinc-400 hover:bg-white/5 transition-colors flex items-center gap-3">
                  <span>🌍</span><span>All Countries</span>
                </button>
              )}
              {filteredCountries.map((country) => (
                <button type="button" key={country.code} onClick={() => { onChange(country.name); setIsOpen(false); setSearch(""); }} className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${value === country.name ? "bg-blue-500/20 text-blue-400" : "text-white"}`}>
                  <span>{country.flag}</span><span>{country.name}</span><span className="ml-auto text-xs text-zinc-500">{country.code}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && <div className="px-4 py-8 text-center text-zinc-500">No countries found</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
