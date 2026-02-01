"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Icons
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export interface SlotInfo {
  date: string;
  time: string;
  location: string;
  appointmentType: string;
  confirmationCode?: string;
}

interface VFSCredentials {
  email: string;
  password: string;
  sourceCountry: string;
  destinationCountry: string;
  visaCenter: string;
  visaCategory: string;
  visaSubCategory: string;
}

interface SlotFinderProps {
  preferredDateRange?: string;
  country: string;
  sourceCountry?: string;
  visaCenter?: string;
  visaCategory?: string;
  visaSubCategory?: string;
  vfsCredentials?: VFSCredentials;
  onSlotFound?: (slot: SlotInfo) => void;
  onStartMonitoring?: (jobId: string) => void;
}

// Generate available time slots
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 16; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 16) {
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Get first day of month (0 = Sunday)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  IT: "Italy",
  CA: "Canada",
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  IN: "India",
  PK: "Pakistan",
  US: "United States",
  FR: "France",
  AU: "Australia",
  JP: "Japan",
  AE: "UAE",
  CN: "China",
  BR: "Brazil",
  ES: "Spain",
  NL: "Netherlands",
  SG: "Singapore",
  TH: "Thailand",
};

// Reverse mapping: name to code
const COUNTRY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, code])
);

// Helper to get country code from name or code
const getCountryCode = (countryOrCode: string): string => {
  if (countryOrCode.length === 2) return countryOrCode;
  return COUNTRY_CODES[countryOrCode] || countryOrCode.slice(0, 2).toUpperCase();
};

export function SlotFinder({ 
  preferredDateRange, 
  country, 
  sourceCountry = "NG",
  visaCenter,
  visaCategory,
  visaSubCategory,
  vfsCredentials,
  onSlotFound,
  onStartMonitoring,
}: SlotFinderProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [foundSlot, setFoundSlot] = useState<SlotInfo | null>(null);
  const [foundSlots, setFoundSlots] = useState<SlotInfo[]>([]);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [, setMonitoringJobId] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Credentials form state (used when not provided via props)
  const [showCredentials, setShowCredentials] = useState(!vfsCredentials);
  const [credentials, setCredentials] = useState({
    email: vfsCredentials?.email || "",
    password: vfsCredentials?.password || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Service status
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [isStartingService, setIsStartingService] = useState(false);

  // Check and auto-start VFS service
  const checkAndStartService = useCallback(async () => {
    try {
      // First check if service is running
      const statusResponse = await fetch("/api/vfs/service");
      const statusData = await statusResponse.json();
      
      if (statusData.running) {
        setServiceAvailable(true);
        return true;
      }
      
      // Service not running, try to start it
      setIsStartingService(true);
      const startResponse = await fetch("/api/vfs/service", { method: "POST" });
      const startData = await startResponse.json();
      
      if (startData.success) {
        // Wait and verify
        await new Promise(resolve => setTimeout(resolve, 3000));
        const verifyResponse = await fetch("/api/vfs/service");
        const verifyData = await verifyResponse.json();
        setServiceAvailable(verifyData.running);
        return verifyData.running;
      }
      
      setServiceAvailable(false);
      return false;
    } catch {
      setServiceAvailable(false);
      return false;
    } finally {
      setIsStartingService(false);
    }
  }, []);

  // Check if VFS service is available on mount and auto-start if needed
  useEffect(() => {
    checkAndStartService();
  }, [checkAndStartService]);

  // Retry service connection periodically if not available
  useEffect(() => {
    if (serviceAvailable === false) {
      const retryInterval = setInterval(() => {
        checkAndStartService();
      }, 10000); // Retry every 10 seconds
      
      return () => clearInterval(retryInterval);
    }
  }, [serviceAvailable, checkAndStartService]);

  // Parse preferred date range
  const dateRange = useMemo(() => {
    if (!preferredDateRange) return { from: null, to: null };
    const parts = preferredDateRange.split(" - ");
    return {
      from: parts[0] ? new Date(parts[0]) : null,
      to: parts[1] ? new Date(parts[1]) : null,
    };
  }, [preferredDateRange]);

  // Check if credentials are available
  const hasCredentials = Boolean(
    (vfsCredentials?.email && vfsCredentials?.password) || 
    (credentials.email && credentials.password)
  );

  // Generate calendar days with unique keys
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: { day: number | null; key: string }[] = [];

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, key: `empty-${currentYear}-${currentMonth}-${i}` });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, key: `day-${currentYear}-${currentMonth}-${day}` });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Check if a date is within preferred range
  const isDateInRange = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (date < todayStart) return false;
    
    if (dateRange.from && dateRange.to) {
      return date >= dateRange.from && date <= dateRange.to;
    }
    return true;
  };

  // Check if a date is in the past
  const isDatePast = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  // Simulate random slot availability (for demo)
  const getSlotAvailability = (day: number, time: string) => {
    // Random availability based on date and time hash
    const hash = (day * 100 + parseInt(time.replace(":", ""), 10)) % 7;
    return hash > 2; // About 60% availability
  };

  const handleDateSelect = (day: number) => {
    if (isDatePast(day)) return;
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setFoundSlot(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setFoundSlot(null);
    setError(null);
  };

  // Check for VFS slots via API
  const checkVFSSlots = useCallback(async () => {
    const email = vfsCredentials?.email || credentials.email;
    const password = vfsCredentials?.password || credentials.password;
    
    if (!email || !password) {
      setError("Please enter your VFS credentials");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Convert country names to 2-letter ISO codes for the API
      const srcCountryCode = getCountryCode(vfsCredentials?.sourceCountry || sourceCountry);
      const destCountryCode = getCountryCode(vfsCredentials?.destinationCountry || country);
      
      const response = await fetch("/api/vfs/check-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry: srcCountryCode,
          destinationCountry: destCountryCode,
          visaCenter: vfsCredentials?.visaCenter || visaCenter || "Lagos",
          visaCategory: vfsCredentials?.visaCategory || visaCategory || "National Visa",
          visaSubCategory: vfsCredentials?.visaSubCategory || visaSubCategory || "Study",
          email,
          password,
          headless: true, // Run headless with CAPTCHA solver
        }),
      });

      const data = await response.json();
      setLastChecked(new Date());

      if (!response.ok) {
        throw new Error(data.error || "Failed to check slots");
      }

      if (data.slots && data.slots.length > 0) {
        const slotsWithLocation = data.slots.map((slot: SlotInfo) => ({
          ...slot,
          location: slot.location || `VFS Global - ${COUNTRY_NAMES[country] || country} Visa Application Center`,
          appointmentType: slot.appointmentType || "Visa Appointment",
        }));
        
        setFoundSlots(slotsWithLocation);
        setFoundSlot(slotsWithLocation[0]);
        onSlotFound?.(slotsWithLocation[0]);
      } else {
        setFoundSlots([]);
        setFoundSlot(null);
        setError("No slots available at this time. Try enabling monitoring to get notified.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check slots");
      setFoundSlots([]);
      setFoundSlot(null);
    } finally {
      setIsSearching(false);
    }
  }, [vfsCredentials, credentials, sourceCountry, country, visaCenter, visaCategory, visaSubCategory, onSlotFound]);

  // Start background monitoring
  const startMonitoring = async () => {
    const email = vfsCredentials?.email || credentials.email;
    const password = vfsCredentials?.password || credentials.password;
    
    if (!email || !password) {
      setError("Please enter your VFS credentials to start monitoring");
      return;
    }

    try {
      // Convert country names to 2-letter ISO codes for the API
      const srcCountryCode = getCountryCode(vfsCredentials?.sourceCountry || sourceCountry);
      const destCountryCode = getCountryCode(vfsCredentials?.destinationCountry || country);
      
      const response = await fetch("/api/vfs/start-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry: srcCountryCode,
          destinationCountry: destCountryCode,
          visaCenter: vfsCredentials?.visaCenter || visaCenter || "Lagos",
          visaCategory: vfsCredentials?.visaCategory || visaCategory || "National Visa",
          visaSubCategory: vfsCredentials?.visaSubCategory || visaSubCategory || "Study",
          email,
          password,
          checkIntervalMinutes: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start monitoring");
      }

      setIsMonitoring(true);
      setMonitoringJobId(data.jobId);
      onStartMonitoring?.(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start monitoring");
    }
  };

  const handleSearchSlot = async () => {
    // If we have credentials, always try to use the real API
    if (hasCredentials) {
      // If service isn't available, try to start it first
      if (!serviceAvailable) {
        const started = await checkAndStartService();
        if (!started) {
          setError("VFS service is not available. Please ensure the Python service is running.");
          return;
        }
      }
      await checkVFSSlots();
    } else {
      // Fallback to simulated slot for demo (requires date/time selection)
      if (!selectedDate || !selectedTime) {
        setError("Please select a date and time, or enter your VFS credentials for live checking.");
        return;
      }
      
      setIsSearching(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const slot: SlotInfo = {
        date: selectedDate,
        time: selectedTime,
        location: `VFS Global - ${COUNTRY_NAMES[country] || country} Visa Application Center`,
        appointmentType: "Biometric Submission",
        confirmationCode: `VFS${Date.now().toString(36).toUpperCase()}`,
      };
      
      setFoundSlot(slot);
      setFoundSlots([slot]);
      setIsSearching(false);
      onSlotFound?.(slot);
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  return (
    <div className="rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-indigo-400">
            <CalendarIcon />
          </span>
          <div>
            <h3 className="text-lg font-medium text-white">VFS Slot Finder</h3>
            <p className="text-xs text-zinc-500">
              {preferredDateRange ? `Searching: ${preferredDateRange}` : "Find available appointment slots"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Service Status Indicator */}
          <button
            type="button"
            onClick={checkAndStartService}
            disabled={isStartingService}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
              serviceAvailable === null || isStartingService
                ? "bg-zinc-800 text-zinc-400" 
                : serviceAvailable 
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                  : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            }`}
            title={serviceAvailable ? "Service running" : "Click to start service"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              serviceAvailable === null || isStartingService
                ? "bg-zinc-400 animate-pulse" 
                : serviceAvailable 
                  ? "bg-emerald-400" 
                  : "bg-red-400"
            }`} />
            {isStartingService ? "Starting..." : serviceAvailable === null ? "Checking..." : serviceAvailable ? "Live" : "Offline - Click to Start"}
          </button>
          
          {isMonitoring && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Monitoring
            </span>
          )}
          
          <button
            type="button"
            onClick={() => setNotifyEnabled(!notifyEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              notifyEnabled 
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                : "bg-zinc-800 text-zinc-400 border border-white/5"
            }`}
          >
            <BellIcon />
            {notifyEnabled ? "Alerts On" : "Alerts Off"}
          </button>
        </div>
      </div>

      {/* VFS Credentials Section (only if not provided via props) */}
      {!vfsCredentials && (
        <div className="relative z-10 mb-6">
          <button
            type="button"
            onClick={() => setShowCredentials(!showCredentials)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-3"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showCredentials ? "rotate-90" : ""}`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            VFS Login Credentials
            {credentials.email && <span className="text-emerald-400 text-xs">(Configured)</span>}
          </button>
          
          <AnimatePresence>
            {showCredentials && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-[#1A1A1D] border border-white/5 space-y-3">
                  <div>
                    <label htmlFor="vfs-email" className="block text-xs text-zinc-500 mb-1.5">VFS Email</label>
                    <input
                      id="vfs-email"
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your-email@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="vfs-password" className="block text-xs text-zinc-500 mb-1.5">VFS Password</label>
                    <div className="relative">
                      <input
                        id="vfs-password"
                        type={showPassword ? "text" : "password"}
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-zinc-800 border border-white/5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && credentials.email && credentials.password) {
                            handleSearchSlot();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Check Slots Button inside credentials */}
                  <button
                    type="button"
                    onClick={handleSearchSlot}
                    disabled={!credentials.email || !credentials.password || isSearching}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      credentials.email && credentials.password && !isSearching
                        ? "bg-indigo-500 text-white hover:bg-indigo-600"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    {isSearching ? (
                      <>
                        <RefreshIcon />
                        <span className="animate-pulse">Checking VFS...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        Check VFS Slots Now
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-zinc-600">
                    Your credentials are used only for checking VFS slots and are not stored.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Select Date</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon />
              </button>
              <span className="text-sm text-white font-medium min-w-[140px] text-center">
                {months[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 rounded-xl bg-[#1A1A1D] border border-white/5">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-zinc-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item) => {
                if (item.day === null) {
                  return <div key={item.key} className="aspect-square" />;
                }

                const day = item.day;
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                const isPast = isDatePast(day);
                const inRange = isDateInRange(day);
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isPast}
                    className={`
                      aspect-square rounded-lg text-xs font-medium transition-all relative
                      ${isPast 
                        ? "text-zinc-700 cursor-not-allowed" 
                        : isSelected 
                          ? "bg-indigo-500 text-white" 
                          : inRange 
                            ? "text-white hover:bg-white/10" 
                            : "text-zinc-500 hover:bg-white/5"
                      }
                      ${isToday && !isSelected ? "ring-1 ring-indigo-500/50" : ""}
                    `}
                  >
                    {day}
                    {inRange && !isPast && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white">Select Time</h4>
          
          <div className="p-4 rounded-xl bg-[#1A1A1D] border border-white/5 max-h-[280px] overflow-y-auto scrollbar-hide">
            {selectedDate ? (
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => {
                  const isAvailable = selectedDate ? getSlotAvailability(parseInt(selectedDate.split("-")[2], 10), time) : false;
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => isAvailable && handleTimeSelect(time)}
                      disabled={!isAvailable}
                      className={`
                        flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all
                        ${!isAvailable 
                          ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed line-through" 
                          : isSelected 
                            ? "bg-indigo-500 text-white" 
                            : "bg-zinc-800 text-white hover:bg-zinc-700"
                        }
                      `}
                    >
                      <ClockIcon />
                      {time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <span className="text-zinc-600 mb-2">
                  <CalendarIcon />
                </span>
                <p className="text-sm text-zinc-500">Select a date to see available times</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="relative z-10 mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSearchSlot}
          disabled={isSearching || (!hasCredentials && (!selectedDate || !selectedTime))}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all
            ${!isSearching && (hasCredentials || (selectedDate && selectedTime))
              ? "bg-indigo-500 text-white hover:bg-indigo-600"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }
          `}
        >
          {isSearching ? (
            <>
              <RefreshIcon />
              <span className="animate-pulse">Checking VFS for slots...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {hasCredentials ? "Check VFS Slots Now" : "Check Availability"}
            </>
          )}
        </button>
        
        {/* Start Monitoring Button */}
        {serviceAvailable && !isMonitoring && hasCredentials && (
          <button
            type="button"
            onClick={startMonitoring}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
          >
            <BellIcon />
            Monitor
          </button>
        )}
      </div>

      {/* Last Checked Timestamp */}
      {lastChecked && (
        <div className="relative z-10 mt-3 text-xs text-zinc-500 text-center">
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2"
          >
            <AlertCircleIcon />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
              {!serviceAvailable && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={checkAndStartService}
                    disabled={isStartingService}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                  >
                    {isStartingService ? "Starting Service..." : "Start VFS Service"}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-zinc-500 hover:text-white"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multiple Slots Display */}
      {foundSlots.length > 1 && !foundSlot && (
        <div className="relative z-10 mt-6 space-y-2">
          <h4 className="text-sm font-medium text-white">Available Slots ({foundSlots.length})</h4>
          <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide">
            {foundSlots.map((slot, index) => (
              <button
                key={`${slot.date}-${slot.time}-${index}`}
                type="button"
                onClick={() => {
                  setFoundSlot(slot);
                  onSlotFound?.(slot);
                }}
                className="w-full p-3 rounded-lg bg-[#1A1A1D] border border-white/5 hover:border-indigo-500/30 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{slot.date}</span>
                  <span className="text-indigo-400 text-sm">{slot.time}</span>
                </div>
                {slot.location && (
                  <p className="text-xs text-zinc-500 mt-1">{slot.location}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Found Slot Display */}
      <AnimatePresence>
        {foundSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 mt-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">
                <CheckCircleIcon />
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-emerald-400 mb-2">Slot Found!</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Date:</span>
                    <span className="text-white font-medium">{formatDisplayDate(foundSlot.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Time:</span>
                    <span className="text-white font-medium">{foundSlot.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Location:</span>
                    <span className="text-white font-medium text-right max-w-[200px]">{foundSlot.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Type:</span>
                    <span className="text-white font-medium">{foundSlot.appointmentType}</span>
                  </div>
                  {foundSlot.confirmationCode && (
                    <div className="flex justify-between pt-2 border-t border-emerald-500/20">
                      <span className="text-zinc-400">Confirmation:</span>
                      <span className="text-emerald-400 font-mono font-bold">{foundSlot.confirmationCode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Confirm Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoundSlot(null)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Find Another
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
