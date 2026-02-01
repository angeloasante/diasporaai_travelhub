"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisaSearch } from "./visa-search";
import { VisaResults } from "./visa-results";
import { VisaDetails } from "./visa-details";

export interface VisaRequirement {
  id: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  visaType: "visa-free" | "visa-on-arrival" | "e-visa" | "visa-required";
  maxStay: string;
  processingTime?: string;
  cost?: string;
  requirements?: string[];
  notes?: string;
}

export function VisaExplorer() {
  const [passportCountry, setPassportCountry] = useState<string>("");
  const [destinationCountry, setDestinationCountry] = useState<string>("");
  const [searchResults, setSearchResults] = useState<VisaRequirement[]>([]);
  const [selectedVisa, setSelectedVisa] = useState<VisaRequirement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!passportCountry) return;
    setIsLoading(true);
    setHasSearched(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockResults = generateMockVisaResults(passportCountry, destinationCountry);
    setSearchResults(mockResults);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Visa Requirements</h1>
        <p className="text-zinc-400">Check visa requirements for your passport and destination</p>
      </div>

      <VisaSearch
        passportCountry={passportCountry}
        setPassportCountry={setPassportCountry}
        destinationCountry={destinationCountry}
        setDestinationCountry={setDestinationCountry}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400">Checking visa requirements...</p>
            </div>
          </motion.div>
        ) : hasSearched && searchResults.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <VisaResults results={searchResults} onSelect={setSelectedVisa} selectedId={selectedVisa?.id} />
          </motion.div>
        ) : hasSearched ? (
          <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
            <p className="text-zinc-400">No results found. Try a different search.</p>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PopularDestinations onSelect={(country) => setDestinationCountry(country)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVisa && (
          <VisaDetails visa={selectedVisa} passportCountry={passportCountry} onClose={() => setSelectedVisa(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PopularDestinations({ onSelect }: { onSelect: (country: string) => void }) {
  const popular = [
    { name: "United States", code: "US", flag: "🇺🇸" },
    { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
    { name: "Japan", code: "JP", flag: "🇯🇵" },
    { name: "France", code: "FR", flag: "🇫🇷" },
    { name: "Australia", code: "AU", flag: "🇦🇺" },
    { name: "Canada", code: "CA", flag: "🇨🇦" },
    { name: "Germany", code: "DE", flag: "🇩🇪" },
    { name: "Thailand", code: "TH", flag: "🇹🇭" },
    { name: "UAE", code: "AE", flag: "🇦🇪" },
    { name: "Singapore", code: "SG", flag: "🇸🇬" },
    { name: "Italy", code: "IT", flag: "🇮🇹" },
    { name: "Spain", code: "ES", flag: "🇪🇸" },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Popular Destinations</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {popular.map((country) => (
          <button type="button" key={country.code} onClick={() => onSelect(country.name)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group">
            <span className="text-3xl group-hover:scale-110 transition-transform">{country.flag}</span>
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">{country.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function generateMockVisaResults(passport: string, destination?: string): VisaRequirement[] {
  const countries = destination ? [{ name: destination, code: destination.slice(0, 2).toUpperCase(), flag: "🏳️" }] : [
    { name: "United States", code: "US", flag: "🇺🇸" },
    { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
    { name: "Japan", code: "JP", flag: "🇯🇵" },
    { name: "France", code: "FR", flag: "🇫🇷" },
    { name: "Australia", code: "AU", flag: "🇦🇺" },
    { name: "Canada", code: "CA", flag: "🇨🇦" },
    { name: "Germany", code: "DE", flag: "🇩🇪" },
    { name: "Thailand", code: "TH", flag: "🇹🇭" },
    { name: "UAE", code: "AE", flag: "🇦🇪" },
    { name: "Singapore", code: "SG", flag: "🇸🇬" },
    { name: "Brazil", code: "BR", flag: "🇧🇷" },
    { name: "South Korea", code: "KR", flag: "🇰🇷" },
  ];

  const flagMap: Record<string, string> = {
    "US": "🇺🇸", "GB": "🇬🇧", "JP": "🇯🇵", "FR": "🇫🇷", "AU": "🇦🇺", "CA": "🇨🇦",
    "DE": "🇩🇪", "TH": "🇹🇭", "AE": "🇦🇪", "SG": "🇸🇬", "BR": "🇧🇷", "KR": "🇰🇷",
    "IT": "🇮🇹", "ES": "🇪🇸", "NL": "🇳🇱", "CH": "🇨🇭",
  };

  const visaTypes: Array<"visa-free" | "visa-on-arrival" | "e-visa" | "visa-required"> = ["visa-free", "visa-on-arrival", "e-visa", "visa-required"];
  const seed = passport.length;

  return countries.map((country, index) => {
    const visaType = visaTypes[(index + seed) % visaTypes.length];
    return {
      id: `visa-${country.code}-${index}`,
      country: country.name,
      countryCode: country.code,
      flagEmoji: flagMap[country.code] || country.flag || "🏳️",
      visaType,
      maxStay: visaType === "visa-free" ? "90 days" : visaType === "visa-on-arrival" ? "30 days" : "varies",
      processingTime: visaType === "visa-required" ? "5-15 business days" : visaType === "e-visa" ? "24-72 hours" : "N/A",
      cost: visaType === "visa-free" ? "Free" : visaType === "visa-on-arrival" ? "$30-50" : visaType === "e-visa" ? "$20-100" : "$100-200",
      requirements: getRequirements(visaType),
      notes: getNotes(visaType, country.name),
    };
  });
}

function getRequirements(visaType: string): string[] {
  const baseReqs = ["Valid passport (6+ months validity)", "Return/onward ticket"];
  switch (visaType) {
    case "visa-free": return [...baseReqs, "Proof of accommodation", "Sufficient funds"];
    case "visa-on-arrival": return [...baseReqs, "Passport photos", "Cash for visa fee", "Proof of accommodation"];
    case "e-visa": return [...baseReqs, "Digital passport photo", "Credit/debit card", "Email address", "Travel itinerary"];
    case "visa-required": return [...baseReqs, "Completed visa application", "Passport photos", "Bank statements", "Employment letter", "Hotel reservations", "Flight itinerary"];
    default: return baseReqs;
  }
}

function getNotes(visaType: string, country: string): string {
  switch (visaType) {
    case "visa-free": return `${country} allows visa-free entry for tourism purposes. Make sure your passport is valid for at least 6 months beyond your planned stay.`;
    case "visa-on-arrival": return `Visa can be obtained upon arrival at major international airports. Have the exact visa fee ready in USD or local currency.`;
    case "e-visa": return `Apply online before your trip. Processing usually takes 24-72 hours. Print your e-visa confirmation to show at immigration.`;
    case "visa-required": return `You must apply for a visa at the embassy/consulate before traveling. Schedule an appointment well in advance as processing can take several weeks.`;
    default: return "";
  }
}
