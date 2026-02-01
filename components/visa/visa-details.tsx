"use client";

import { motion } from "framer-motion";
import type { VisaRequirement } from "./visa-explorer";

interface VisaDetailsProps {
  visa: VisaRequirement;
  passportCountry: string;
  onClose: () => void;
}

const config = {
  "visa-free": { label: "Visa Free", bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  "visa-on-arrival": { label: "Visa on Arrival", bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  "e-visa": { label: "E-Visa Required", bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  "visa-required": { label: "Visa Required", bg: "rgba(244, 63, 94, 0.1)", text: "#f43f5e", border: "rgba(244, 63, 94, 0.3)" },
};

export function VisaDetails({ visa, passportCountry, onClose }: VisaDetailsProps) {
  const c = config[visa.visaType];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{visa.flagEmoji}</span>
              <h2 className="text-xl font-semibold text-white">{visa.country}</h2>
            </div>
            <span className="inline-block text-xs px-3 py-1 rounded-full" style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
              {c.label}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Travel Flow */}
        <div className="flex items-center justify-center gap-4 p-4 mb-6 rounded-xl bg-white/5 border border-white/10">
          <div className="text-center">
            <div className="text-2xl mb-1">🛂</div>
            <div className="text-xs text-zinc-400">From</div>
            <div className="text-sm text-white font-medium">{passportCountry}</div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="mx-2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          <div className="text-center">
            <div className="text-2xl mb-1">{visa.flagEmoji}</div>
            <div className="text-xs text-zinc-400">To</div>
            <div className="text-sm text-white font-medium">{visa.country}</div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {visa.processingTime && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 mb-1">Processing</div>
              <div className="text-sm text-white font-medium">{visa.processingTime}</div>
            </div>
          )}
          {visa.cost && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 mb-1">Cost</div>
              <div className="text-sm text-white font-medium">{visa.cost}</div>
            </div>
          )}
          {visa.maxStay && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 mb-1">Max Stay</div>
              <div className="text-sm text-white font-medium">{visa.maxStay}</div>
            </div>
          )}
        </div>

        {/* Requirements */}
        {visa.requirements && visa.requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Requirements</h3>
            <div className="space-y-2">
              {visa.requirements.map((req) => (
                <div key={req} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="mt-0.5 flex-shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
                  <span className="text-sm text-zinc-300">{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {visa.notes && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <div className="flex items-start gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <p className="text-sm text-amber-200/80">{visa.notes}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {visa.visaType === "e-visa" && (
            <a href="/apply-e-visa" className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium text-center transition-colors">
              Apply for E-Visa
            </a>
          )}
          <a href="/learn-more" className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium text-center transition-colors">
            Learn More
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
