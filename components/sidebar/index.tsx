"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Navigation } from "./navigation";
// import { MilesWidget } from "./miles-widget";
import { ProfileCard } from "./profile-card";
import { useSidebar } from "./sidebar-provider";

export { SidebarProvider, useSidebar } from "./sidebar-provider";

// Contact Support Component
function ContactSupport() {
  const [isOpen, setIsOpen] = useState(false);
  
  const whatsappUrl = "https://api.whatsapp.com/send/?phone=%2B447555834656&text=Hi%21+I+need+support+with+Diaspora+AI.&type=phone_number&app_absent=0";
  const emailAddress = "info@diasporaai.dev";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all duration-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-sm font-medium flex-1 text-left">Contact Support</span>
        <motion.svg 
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-1">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:bg-green-500/10 hover:text-green-400 transition-all duration-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
                <svg className="w-3 h-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              {/* Email */}
              <a
                href={`mailto:${emailAddress}?subject=Support Request - Diaspora AI`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
                <span className="text-sm font-medium">Email</span>
                <svg className="w-3 h-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const { isCollapsed, setIsCollapsed, isHovered, setIsHovered, showExpanded } = useSidebar();

  return (
    <motion.aside
      initial={false}
      animate={{
        width: showExpanded ? 320 : 88,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isCollapsed && !isHovered && setIsHovered(true)}
      className="hidden md:flex flex-col relative z-20 p-3 flex-shrink-0"
    >
      <div
        className={`h-full flex flex-col justify-between rounded-[2rem] bg-[#0a0a0b] border border-white/5 ${
          showExpanded ? "p-5" : "p-4"
        } transition-all duration-300`}
      >
        {/* Top Section - Logo & Toggle */}
        <div>
          {/* Logo */}
          <div className={`flex items-center ${showExpanded ? "justify-between" : "justify-center"} mb-8`}>
            <motion.div
              className="flex items-center gap-2"
              animate={{ justifyContent: showExpanded ? "flex-start" : "center" }}
            >
              {/* Logo Image */}
              <Image
                src="/logo.png"
                alt="Diaspora"
                width={32}
                height={32}
                className="rounded-full"
                style={{ width: 32, height: 32 }}
              />
              <AnimatePresence>
                {showExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-lg font-semibold text-white whitespace-nowrap overflow-hidden"
                  >
                    Diaspora
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Toggle Button - only show when expanded */}
            <AnimatePresence>
              {showExpanded && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(!isCollapsed);
                    setIsHovered(false);
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  aria-label={isCollapsed ? "Pin sidebar" : "Collapse sidebar"}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-zinc-500 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
                  >
                    <path d="M11 17l-5-5 5-5" />
                    <path d="M18 17l-5-5 5-5" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <Navigation isCollapsed={!showExpanded} onExpand={() => setIsHovered(true)} />
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Miles Widget - commented out for now */}
          {/* <AnimatePresence>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <MilesWidget />
              </motion.div>
            )}
          </AnimatePresence> */}

          {/* Contact Support */}
          <AnimatePresence>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ContactSupport />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile */}
          <ProfileCard
            isCollapsed={!showExpanded}
          />
        </div>
      </div>
    </motion.aside>
  );
}
