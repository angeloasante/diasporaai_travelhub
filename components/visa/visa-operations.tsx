"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";;
import { ApplicationSheet, type ApplicationFormData } from "./application-sheet";
import { SlotFinder } from "./slot-finder";
import { useVisaApplications, type VisaApplication as DBVisaApplication } from "@/hooks/use-visa-applications";

// Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const PassportIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 17h10" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
  </svg>
);

const PlaneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Types
interface VisaApplication {
  id: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  visaType: string;
  applicationNumber: string;
  status: "draft" | "submitted" | "interview" | "processing" | "approved" | "denied";
  requirements: RequirementItem[];
  costs: { label: string; amount: number }[];
  applicantName?: string;
  dateOfBirth?: string;
  originCountry?: string;
  travelReason?: string;
  vfsCheck?: boolean;
  preferredDateRange?: string;
  referralSource?: string;
  // VFS-related fields
  vfsEmail?: string;
  slotFound?: boolean;
  slotDate?: string;
  slotTime?: string;
  slotLocation?: string;
  slotConfirmationCode?: string;
}

interface RequirementItem {
  id: string;
  label: string;
  completed: boolean;
}

// Countries list
const countries = [
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

// Popular destinations for quick start
const popularDestinations = [
  { country: "United States", code: "US", flag: "🇺🇸", visaType: "B1/B2 Tourist" },
  { country: "United Kingdom", code: "GB", flag: "🇬🇧", visaType: "Standard Visitor" },
  { country: "Canada", code: "CA", flag: "🇨🇦", visaType: "Visitor Visa" },
  { country: "Schengen Area", code: "EU", flag: "🇪🇺", visaType: "Schengen Visa" },
  { country: "Australia", code: "AU", flag: "🇦🇺", visaType: "Visitor (600)" },
  { country: "Japan", code: "JP", flag: "🇯🇵", visaType: "Tourist Visa" },
];

const travelReasons = [
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

const referralSources = [
  "Google Search",
  "Social Media (Instagram, Twitter, etc.)",
  "Friend or Family Referral",
  "Travel Agent",
  "Online Advertisement",
  "Blog / Article",
  "Other",
];

export function VisaOperations() {
  // Use the database hook for persistent applications with realtime updates
  const {
    applications: dbApplications,
    loading,
    error,
    createApplication,
    deleteApplication,
    toggleRequirement,
    updateSlotInfo,
  } = useVisaApplications({ enableRealtime: true });

  const [showApplicationSheet, setShowApplicationSheet] = useState(false);

  // Transform database applications to UI format
  const applications: VisaApplication[] = dbApplications.map((app) => ({
    id: app.id,
    country: app.destination_country,
    countryCode: app.destination_country_code || "XX",
    flagEmoji: app.destination_flag || "🏳️",
    visaType: app.visa_type,
    applicationNumber: app.application_number,
    status: app.status,
    applicantName: app.applicant_name,
    dateOfBirth: app.date_of_birth,
    originCountry: app.origin_country,
    travelReason: app.travel_reason,
    vfsCheck: app.vfs_check_enabled,
    preferredDateRange: app.preferred_date_from && app.preferred_date_to 
      ? `${app.preferred_date_from} - ${app.preferred_date_to}` 
      : undefined,
    referralSource: app.referral_source,
    requirements: app.requirements || [],
    costs: app.costs || [],
    // Additional fields for VFS
    vfsEmail: app.vfs_email,
    slotFound: app.slot_found,
    slotDate: app.slot_date,
    slotTime: app.slot_time,
    slotLocation: app.slot_location,
    slotConfirmationCode: app.slot_confirmation_code,
  }));

  const hasApplications = applications.length > 0;

  const handleCreateApplication = async (formData: ApplicationFormData) => {
    const destination = countries.find((c) => c.name === formData.destinationCountry) || { name: formData.destinationCountry, code: "XX", flag: "🏳️" };

    try {
      await createApplication({
        applicant_name: formData.fullName,
        email: formData.email || "user@example.com", // Use email from form or default
        date_of_birth: formData.dateOfBirth,
        origin_country: formData.originCountry,
        origin_country_code: countries.find((c) => c.name === formData.originCountry)?.code,
        destination_country: destination.name,
        destination_country_code: destination.code,
        destination_flag: destination.flag,
        visa_type: "Tourist Visa",
        travel_reason: formData.travelReason,
        vfs_check_enabled: formData.vfsCheck,
        vfs_email: formData.vfsEmail,
        preferred_date_from: formData.preferredDateFrom,
        preferred_date_to: formData.preferredDateTo,
        referral_source: formData.referralSource || undefined,
      } as DBVisaApplication);
      setShowApplicationSheet(false);
    } catch (err) {
      console.error("Failed to create application:", err);
      // Could show a toast notification here
    }
  };

  const handleToggleRequirement = async (appId: string, reqId: string) => {
    try {
      await toggleRequirement(appId, reqId);
    } catch (err) {
      console.error("Failed to toggle requirement:", err);
    }
  };

  const handleSlotFound = async (appId: string, slot: { date: string; time: string; location: string; appointmentType: string; confirmationCode?: string }) => {
    try {
      await updateSlotInfo(appId, {
        slot_found: true,
        slot_date: slot.date,
        slot_time: slot.time,
        slot_location: slot.location,
        slot_confirmation_code: slot.confirmationCode,
        last_slot_check: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to update slot info:", err);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    try {
      await deleteApplication(appId);
    } catch (err) {
      console.error("Failed to delete application:", err);
    }
  };

  const handleQuickStart = () => {
    setShowApplicationSheet(true);
  };

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Loading applications...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Visa Operations</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {hasApplications ? "Manage applications, appointments, and requirements." : "Start your visa application journey."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowApplicationSheet(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-xs font-semibold hover:bg-zinc-200 transition-colors"
        >
          <PlusIcon />
          New Application
        </button>
      </header>

      <AnimatePresence mode="wait">
        {!hasApplications ? (
          /* Empty State */
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            {/* Welcome Hero */}
            <div className="relative rounded-[32px] bg-[#0f0f11] border border-white/5 p-10 md:p-16 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-indigo-500/[0.05] pointer-events-none" />
              <div className="absolute top-10 right-10 text-zinc-800/50 hidden md:block">
                <PassportIcon />
              </div>

              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Get Started
                </div>

                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4">Your visa journey starts here</h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                  We&apos;ll guide you through every step of your visa application — from document preparation to interview scheduling. Select a destination below to begin.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApplicationSheet(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    Start Application
                    <ArrowRightIcon />
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-white border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Start Destinations */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Popular Destinations</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {popularDestinations.map((dest) => (
                  <motion.button
                    key={dest.code}
                    type="button"
                    onClick={handleQuickStart}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#0f0f11] border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{dest.flag}</span>
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">{dest.country}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{dest.visaType}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[24px] bg-[#0f0f11] border border-white/5 p-6">
                <span className="text-blue-400 mb-4 block">
                  <GlobeIcon />
                </span>
                <h4 className="text-sm font-medium text-white mb-2">200+ Countries</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Access visa requirements and application processes for destinations worldwide.</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-[24px] bg-[#0f0f11] border border-white/5 p-6">
                <span className="text-emerald-400 mb-4 block">
                  <ClockIcon />
                </span>
                <h4 className="text-sm font-medium text-white mb-2">Real-time Tracking</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Monitor your application status and receive instant updates on progress.</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-[24px] bg-[#0f0f11] border border-white/5 p-6">
                <span className="text-amber-400 mb-4 block">
                  <ShieldIcon />
                </span>
                <h4 className="text-sm font-medium text-white mb-2">Secure & Private</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Your documents and personal information are encrypted and protected.</p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* Dashboard with Applications */
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
            {applications.map((app) => (
              <ApplicationDashboard 
                key={app.id} 
                application={app} 
                onToggleRequirement={(reqId) => handleToggleRequirement(app.id, reqId)} 
                onSlotFound={(slot) => handleSlotFound(app.id, slot)}
                onDelete={() => handleDeleteApplication(app.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Application Sheet - Using the reusable component */}
      <ApplicationSheet 
        isOpen={showApplicationSheet} 
        onClose={() => setShowApplicationSheet(false)} 
        onSubmit={handleCreateApplication}
        countries={countries}
        travelReasons={travelReasons}
        referralSources={referralSources}
      />
    </div>
  );
}

// Application Dashboard Component
function ApplicationDashboard({ 
  application, 
  onToggleRequirement,
  onSlotFound,
  onDelete,
}: { 
  application: VisaApplication; 
  onToggleRequirement: (reqId: string) => void;
  onSlotFound: (slot: { date: string; time: string; location: string; appointmentType: string; confirmationCode?: string }) => void;
  onDelete: () => void;
}) {
  const totalCost = application.costs.reduce((sum, cost) => sum + cost.amount, 0);
  const completedReqs = application.requirements.filter((r) => r.completed).length;
  const progress = Math.round((completedReqs / application.requirements.length) * 100);

  return (
    <>
      {/* Active Application Status (Large) */}
      <div className="md:col-span-2 relative min-h-[280px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col justify-between overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />

        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1A1A1D] border border-white/5 flex items-center justify-center text-2xl">{application.flagEmoji}</div>
            <div>
              <h3 className="text-lg font-medium text-white">{application.country}</h3>
              <div className="text-xs text-blue-400 font-mono mt-0.5">
                {application.visaType} • Application {application.applicationNumber}
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider uppercase">
            {application.status === "draft" ? "Draft" : "In Progress"}
          </span>
        </div>

        {/* Progress */}
        <div className="relative z-10 mt-8">
          <div className="flex justify-between items-center mb-4">
            <div className="text-xs text-white font-medium">Documents</div>
            <div className="text-xs text-zinc-500">Review</div>
            <div className="text-xs text-zinc-600">Submit</div>
          </div>

          <div className="h-2 w-full bg-[#1A1A1D] rounded-full relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"
            />
          </div>

          <div className="mt-4 p-4 rounded-xl bg-[#1A1A1D] border border-white/5 flex items-start gap-3">
            <span className="text-blue-400 mt-0.5">
              <InfoIcon />
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="text-white font-medium">Next Step:</span> Complete your document checklist to proceed with your application.
            </p>
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="md:col-span-1 min-h-[280px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">Requirements</h3>
          <span className="text-xs text-zinc-500">
            {completedReqs}/{application.requirements.length}
          </span>
        </div>

        <div className="space-y-3">
          {application.requirements.map((item) => (
            <label key={item.id} className="group flex items-center gap-3 p-3 rounded-xl bg-[#1A1A1D] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <button
                type="button"
                onClick={() => onToggleRequirement(item.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  item.completed ? "border border-blue-500 bg-blue-500 text-white" : "border-2 border-zinc-700 bg-transparent group-hover:border-zinc-500"
                }`}
              >
                {item.completed && <CheckIcon />}
              </button>
              <span className={`text-xs ${item.completed ? "text-zinc-400 line-through" : "text-white"}`}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Estimated Costs */}
      <div className="md:col-span-1 min-h-[200px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/10 to-transparent pointer-events-none" />

        <div>
          <h3 className="text-lg font-medium text-white">Estimated Cost</h3>
          <p className="text-xs text-zinc-500 mt-1">Application fees</p>
        </div>

        <div className="flex items-baseline gap-1 my-4">
          <span className="text-3xl font-bold text-white tracking-tight">${totalCost}</span>
          <span className="text-sm text-zinc-500">.00</span>
        </div>

        <div className="space-y-2">
          {application.costs.map((cost) => (
            <div key={cost.label} className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">{cost.label}</span>
              <span className="text-white">${cost.amount}.00</span>
            </div>
          ))}
          <div className="h-px w-full bg-white/5 my-2" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-400">Total</span>
            <span className="text-emerald-400 font-bold">${totalCost}.00</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="md:col-span-2 rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 relative overflow-hidden">
        <h3 className="text-lg font-medium text-white mb-6">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button type="button" className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#1A1A1D] border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-blue-400">
              <PlaneIcon />
            </span>
            <span className="text-xs text-white">Upload Docs</span>
          </button>

          <button type="button" className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#1A1A1D] border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-emerald-400">
              <ClockIcon />
            </span>
            <span className="text-xs text-white">Book Slot</span>
          </button>

          <button type="button" className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#1A1A1D] border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-amber-400">
              <GlobeIcon />
            </span>
            <span className="text-xs text-white">Check Status</span>
          </button>

          <button type="button" className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#1A1A1D] border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-purple-400">
              <ShieldIcon />
            </span>
            <span className="text-xs text-white">Get Help</span>
          </button>
        </div>
      </div>

      {/* Slot Finder - Only shown when VFS check is enabled */}
      {application.vfsCheck && (
        <div className="md:col-span-3">
          <SlotFinder 
            preferredDateRange={application.preferredDateRange}
            country={application.country}
            onSlotFound={onSlotFound}
          />
        </div>
      )}

      {/* Slot Found Banner */}
      {application.slotFound && application.slotDate && (
        <div className="md:col-span-3 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckIcon />
            </div>
            <div>
              <h4 className="text-lg font-medium text-emerald-400">VFS Slot Found!</h4>
              <p className="text-sm text-zinc-400">
                {application.slotDate} at {application.slotTime} • {application.slotLocation}
                {application.slotConfirmationCode && ` • Confirmation: ${application.slotConfirmationCode}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Button */}
      <div className="md:col-span-3 flex justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          Delete Application
        </button>
      </div>
    </>
  );
}
