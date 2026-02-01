import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";

export default function BookingDetailLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide transition-all duration-300">
        <BackgroundGradients />

        <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10">
          <div className="space-y-6">
            {/* Back Button */}
            <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
            
            {/* Header Row */}
            <div className="flex justify-between items-center">
              <div className="h-10 bg-zinc-800 rounded-full w-24 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-10 bg-zinc-800 rounded-full w-28 animate-pulse" />
                <div className="h-10 bg-zinc-800 rounded-full w-24 animate-pulse" />
              </div>
            </div>
            
            {/* Route Title */}
            <div className="h-14 bg-zinc-800 rounded w-64 animate-pulse" />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Flight Timeline */}
              <div className="rounded-3xl bg-white/5 border border-white/5 p-8">
                <div className="flex gap-4 mb-6">
                  <div className="w-40 h-24 bg-zinc-800 rounded-2xl animate-pulse" />
                  <div className="flex-1 flex justify-between">
                    <div>
                      <div className="h-6 bg-zinc-800 rounded w-24 mb-2 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                    </div>
                    <div className="text-right">
                      <div className="h-6 bg-zinc-800 rounded w-16 mb-2 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-center my-6">
                  <div className="h-8 bg-zinc-800 rounded-full w-16 animate-pulse" />
                </div>
                <div className="flex gap-4">
                  <div className="w-40 h-24 bg-zinc-800 rounded-2xl animate-pulse" />
                  <div className="flex-1 flex justify-between">
                    <div>
                      <div className="h-6 bg-zinc-800 rounded w-24 mb-2 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                    </div>
                    <div className="text-right">
                      <div className="h-6 bg-zinc-800 rounded w-16 mb-2 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Map Placeholder */}
              <div className="rounded-3xl bg-zinc-800/50 border border-white/5 min-h-[300px] animate-pulse flex items-center justify-center">
                <div className="text-zinc-500 text-sm">Loading map...</div>
              </div>
            </div>
            
            {/* Bottom Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6">
                <div className="h-4 bg-zinc-800 rounded w-24 mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-800 rounded-full animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6">
                <div className="h-4 bg-zinc-800 rounded w-20 mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                </div>
              </div>
              <div className="rounded-3xl bg-blue-500/20 border border-white/5 p-6 min-h-[160px] animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
