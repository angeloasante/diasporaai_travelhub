import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";

export default function ItineraryDetailLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-hidden relative bg-[#0e0e10] transition-all duration-300">
        <BackgroundGradients />
        
        <div className="h-full flex">
          {/* Left Panel - Activity List */}
          <div className="w-[400px] border-r border-white/5 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
              </div>
            </div>
            
            {/* Day Selector */}
            <div className="p-4 border-b border-white/5">
              <div className="h-10 bg-zinc-800 rounded-xl w-full animate-pulse" />
            </div>
            
            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-zinc-800/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 bg-zinc-700 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-700 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-zinc-700 rounded w-1/2 animate-pulse" />
                      <div className="h-3 bg-zinc-700 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Panel - Map */}
          <div className="flex-1 bg-zinc-900 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-400 text-sm">Loading map...</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
