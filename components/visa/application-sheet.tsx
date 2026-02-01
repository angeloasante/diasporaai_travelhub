"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SelectField } from "./select-field";

// Icons
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

// Types
export interface ApplicationFormData {
  destinationCountry: string;
  originCountry: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  travelReason: string;
  vfsCheck: boolean;
  vfsEmail: string;
  preferredDateFrom: string;
  preferredDateTo: string;
  referralSource: string;
}

interface ApplicationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => void;
  countries?: { name: string; code: string; flag: string }[];
  travelReasons?: string[];
  referralSources?: string[];
}

// Default data
const defaultCountries = [
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
  { name: "UAE", code: "AE", flag: "🇦🇪" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "China", code: "CN", flag: "🇨🇳" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "Thailand", code: "TH", flag: "🇹🇭" },
];

const defaultTravelReasons = [
  "Tourism / Holiday",
  "Business Meeting",
  "Conference / Event",
  "Study / Education",
  "Medical Treatment",
  "Family Visit",
  "Work / Employment",
  "Transit",
  "Other",
];

const defaultReferralSources = [
  "Google Search",
  "Social Media (Instagram, Twitter, etc.)",
  "Friend or Family Referral",
  "Travel Agent",
  "Online Advertisement",
  "Blog / Article",
  "Other",
];

const initialFormData: ApplicationFormData = {
  destinationCountry: "",
  originCountry: "",
  fullName: "",
  email: "",
  dateOfBirth: "",
  travelReason: "",
  vfsCheck: false,
  vfsEmail: "",
  preferredDateFrom: "",
  preferredDateTo: "",
  referralSource: "",
};

export function ApplicationSheet({
  isOpen,
  onClose,
  onSubmit,
  countries = defaultCountries,
  travelReasons = defaultTravelReasons,
  referralSources = defaultReferralSources,
}: ApplicationSheetProps) {
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormData, string>>>({});

  const validateForm = () => {
    const newErrors: Partial<Record<keyof ApplicationFormData, string>> = {};

    if (!formData.destinationCountry) newErrors.destinationCountry = "Please select a destination";
    if (!formData.originCountry) newErrors.originCountry = "Please select your country";
    if (!formData.fullName.trim()) newErrors.fullName = "Please enter your full name";
    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Please enter your date of birth";
    if (!formData.travelReason) newErrors.travelReason = "Please select a reason for travel";
    if (formData.vfsCheck && (!formData.preferredDateFrom || !formData.preferredDateTo)) {
      newErrors.preferredDateFrom = "Please select a date range";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      setFormData(initialFormData);
      setErrors({});
    }
  };

  const updateField = <K extends keyof ApplicationFormData>(field: K, value: ApplicationFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    onClose();
    setFormData(initialFormData);
    setErrors({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={handleClose}
            aria-label="Close application sheet"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#0a0a0b] border-l border-white/10 flex flex-col"
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 md:p-8 pb-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">New Application</h2>
                  <p className="text-sm text-zinc-500 mt-1">Fill in your details to get started</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">
              <div className="space-y-6">
                {/* Travel Route Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Travel Route</h3>

                  {/* Origin Country */}
                  <div>
                    <label htmlFor="originCountry" className="block text-sm font-medium text-white mb-2">
                      From (Your Country) <span className="text-red-400">*</span>
                    </label>
                    <SelectField
                      id="originCountry"
                      value={formData.originCountry}
                      onChange={(value) => updateField("originCountry", value)}
                      options={countries.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
                      placeholder="Select your country"
                      error={errors.originCountry}
                    />
                  </div>

                  {/* Destination Country */}
                  <div>
                    <label htmlFor="destinationCountry" className="block text-sm font-medium text-white mb-2">
                      To (Destination) <span className="text-red-400">*</span>
                    </label>
                    <SelectField
                      id="destinationCountry"
                      value={formData.destinationCountry}
                      onChange={(value) => updateField("destinationCountry", value)}
                      options={countries.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
                      placeholder="Select destination country"
                      error={errors.destinationCountry}
                    />
                  </div>
                </div>

                {/* Personal Info Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Personal Information</h3>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                        <UserIcon />
                      </span>
                      <input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        placeholder="Enter your full name as on passport"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border ${
                          errors.fullName ? "border-red-500/50" : "border-white/10"
                        } text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500/50 transition-colors`}
                      />
                    </div>
                    {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="your.email@example.com"
                      className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                        errors.email ? "border-red-500/50" : "border-white/10"
                      } text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500/50 transition-colors`}
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    <p className="text-xs text-zinc-500 mt-1">Used to save and retrieve your applications</p>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-white mb-2">
                      Date of Birth <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                        <CalendarIcon />
                      </span>
                      <input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateField("dateOfBirth", e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border ${
                          errors.dateOfBirth ? "border-red-500/50" : "border-white/10"
                        } text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]`}
                      />
                    </div>
                    {errors.dateOfBirth && <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth}</p>}
                  </div>
                </div>

                {/* Travel Details Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Travel Details</h3>

                  {/* Travel Reason */}
                  <div>
                    <label htmlFor="travelReason" className="block text-sm font-medium text-white mb-2">
                      Reason for Travel <span className="text-red-400">*</span>
                    </label>
                    <SelectField
                      id="travelReason"
                      value={formData.travelReason}
                      onChange={(value) => updateField("travelReason", value)}
                      options={travelReasons.map((r) => ({ value: r, label: r }))}
                      placeholder="Select reason for travel"
                      error={errors.travelReason}
                    />
                  </div>

                  {/* VFS Booking Check */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.vfsCheck}
                        onChange={(e) => updateField("vfsCheck", e.target.checked)}
                        className="sr-only peer"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors peer-focus:ring-2 peer-focus:ring-blue-500/50 ${
                          formData.vfsCheck ? "bg-blue-500 border-blue-500" : "border-2 border-zinc-600"
                        }`}
                      >
                        {formData.vfsCheck && <CheckIcon />}
                      </span>
                      <span>
                        <span className="text-sm font-medium text-white">Check VFS for booking slots</span>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          We&apos;ll monitor VFS and notify you when slots become available
                        </p>
                      </span>
                    </label>

                    {/* Date Range (shown if VFS check is enabled) */}
                    <AnimatePresence>
                      {formData.vfsCheck && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-white/5"
                        >
                          <span className="block text-sm font-medium text-white mb-2">
                            Preferred Date Range <span className="text-red-400">*</span>
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="preferredDateFrom" className="text-xs text-zinc-500 mb-1 block">
                                From
                              </label>
                              <input
                                id="preferredDateFrom"
                                type="date"
                                value={formData.preferredDateFrom}
                                onChange={(e) => updateField("preferredDateFrom", e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg bg-white/5 border ${
                                  errors.preferredDateFrom ? "border-red-500/50" : "border-white/10"
                                } text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]`}
                              />
                            </div>
                            <div>
                              <label htmlFor="preferredDateTo" className="text-xs text-zinc-500 mb-1 block">
                                To
                              </label>
                              <input
                                id="preferredDateTo"
                                type="date"
                                value={formData.preferredDateTo}
                                onChange={(e) => updateField("preferredDateTo", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                              />
                            </div>
                          </div>
                          {errors.preferredDateFrom && (
                            <p className="text-red-400 text-xs mt-1">{errors.preferredDateFrom}</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Optional Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Optional</h3>

                  {/* Referral Source */}
                  <div>
                    <label htmlFor="referralSource" className="block text-sm font-medium text-white mb-2">
                      How did you hear about us?
                    </label>
                    <SelectField
                      id="referralSource"
                      value={formData.referralSource}
                      onChange={(value) => updateField("referralSource", value)}
                      options={referralSources.map((r) => ({ value: r, label: r }))}
                      placeholder="Select an option (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  Create Application
                  <ArrowRightIcon />
                </button>
                <p className="text-xs text-zinc-500 text-center mt-3">
                  By submitting, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
