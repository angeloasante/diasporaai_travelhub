import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { VisaOperations } from "@/components/visa/visa-operations";

function DevelopmentBanner() {
  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-amber-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-amber-400 font-semibold text-sm mb-1">
            Beta Feature — Under Development
          </h3>
          <p className="text-amber-200/70 text-sm leading-relaxed">
            This visa management feature is currently in beta. Some functionality may be incomplete or subject to change. 
            Please verify all visa requirements with official embassy sources before making travel arrangements.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VisaPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide transition-all duration-300">
        <BackgroundGradients />

        <div className="max-w-[1200px] mx-auto p-6 lg:p-10">
          <DevelopmentBanner />
          <VisaOperations />
        </div>
      </main>

      <MobileNavToggle />
    </div>
  );
}
