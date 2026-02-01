import Link from "next/link";
import { CheckSquareIcon } from "@/components/icons";
import { FileTextIcon, PlusIcon } from "lucide-react";

interface VisaProgressCardProps {
  percentage?: number | null;
  country?: string | null;
  applicationId?: string | null;
  isEmpty?: boolean;
}

export function VisaProgressCard({ percentage, country, applicationId, isEmpty = false }: VisaProgressCardProps) {
  // Empty state
  if (isEmpty || percentage === null || percentage === undefined) {
    return (
      <Link 
        href="/visa"
        className="md:col-span-1 h-[340px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col items-center justify-center relative group overflow-hidden hover:border-blue-500/30 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
          <FileTextIcon className="w-7 h-7 text-zinc-500 group-hover:text-blue-400 transition-colors" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 text-center">No visa applications</h3>
        <p className="text-xs text-zinc-400 text-center mb-4 max-w-[180px]">
          Start your visa application process
        </p>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium group-hover:bg-blue-500/20 transition-colors">
          <PlusIcon className="w-3 h-3" />
          Apply Now
        </div>
      </Link>
    );
  }

  // Link to visa page with optional scroll to specific application
  const detailUrl = applicationId ? `/visa?application=${applicationId}` : "/visa";

  return (
    <Link 
      href={detailUrl}
      className="md:col-span-1 h-[340px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col justify-between relative group overflow-hidden hover:border-white/10 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="w-10 h-10 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-400">
        <CheckSquareIcon />
      </div>

      <div>
        <div className="text-sm text-zinc-400 mb-1">
          {country ? `${country} Visa` : "Visa Application"}
        </div>
        <div className="text-4xl font-bold text-white tracking-tight">
          {percentage}%
        </div>
      </div>

      {/* Stylized Bar Chart Visual */}
      <div className="flex items-end gap-3 h-12 w-full mt-4">
        <div 
          className="w-1.5 rounded-full bg-zinc-800" 
          style={{ height: `${Math.min(30 + percentage * 0.2, 40)}%` }} 
        />
        <div 
          className="w-1.5 rounded-full bg-zinc-800" 
          style={{ height: `${Math.min(40 + percentage * 0.3, 60)}%` }} 
        />
        <div 
          className="w-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
          style={{ height: `${Math.max(percentage, 20)}%` }} 
        />
        <div 
          className="w-1.5 rounded-full bg-zinc-800" 
          style={{ height: `${Math.min(30 + percentage * 0.15, 45)}%` }} 
        />
      </div>
    </Link>
  );
}
