"use client";

import { motion } from "framer-motion";
import type { VisaRequirement } from "./visa-explorer";

interface VisaResultsProps {
  results: VisaRequirement[];
  onSelect: (visa: VisaRequirement) => void;
  selectedId?: string;
}

const colorMap = {
  "visa-free": { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", text: "#10b981", label: "Visa Free" },
  "visa-on-arrival": { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)", text: "#3b82f6", label: "Visa on Arrival" },
  "e-visa": { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b", label: "E-Visa Required" },
  "visa-required": { bg: "rgba(244, 63, 94, 0.1)", border: "rgba(244, 63, 94, 0.3)", text: "#f43f5e", label: "Visa Required" },
};

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

function VisaCard({ visa, onClick }: { visa: VisaRequirement; onClick: () => void }) {
  const colors = colorMap[visa.visaType];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="w-full text-left p-4 rounded-xl border transition-all"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{visa.flagEmoji}</span>
          <span className="font-medium text-white">{visa.country}</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
          {colors.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        {visa.maxStay && <span>Max stay: {visa.maxStay}</span>}
        {visa.processingTime && <span>Processing: {visa.processingTime}</span>}
      </div>
    </motion.button>
  );
}

export function VisaResults({ results, onSelect }: VisaResultsProps) {
  const grouped = results.reduce((acc, visa) => {
    if (!acc[visa.visaType]) acc[visa.visaType] = [];
    acc[visa.visaType].push(visa);
    return acc;
  }, {} as Record<string, VisaRequirement[]>);

  const order: Array<keyof typeof colorMap> = ["visa-free", "visa-on-arrival", "e-visa", "visa-required"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-zinc-400">
        <GlobeIcon />
        <span className="text-sm">Found {results.length} destinations</span>
      </div>

      {order.map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        const colors = colorMap[type];

        return (
          <motion.div key={type} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: colors.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.text }} />
              {colors.label} ({items.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((visa) => (
                <VisaCard key={visa.country} visa={visa} onClick={() => onSelect(visa)} />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
