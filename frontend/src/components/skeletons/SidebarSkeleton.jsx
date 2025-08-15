import { MessageCircle, Circle, Settings, Search, LogOut } from "lucide-react";

// Skeleton list length
const PLACEHOLDER_ITEMS = 7;

const SidebarSkeleton = () => {
  return (
    <aside className="h-full w-30 lg:w-80 min-w-24 lg:min-w-80 max-w-24 lg:max-w-80 border-r border-base-200 flex flex-shrink-0 bg-base-100 z-20 relative overflow-hidden shadow-sm">
      {/* Vertical Icon Bar (left) */}
      <div className="w-30 bg-base-200/50 border-r border-base-200 flex flex-col items-center py-3 gap-3">
        {/* Profile avatar skeleton */}
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md relative">
          <div className="w-full h-full bg-base-300 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-base-300 animate-pulse border-2 border-white" />
        </div>

        {/* Tab Icons */}
        <div className="flex flex-col gap-3">
          {/* Chats (active) */}
          <div className="relative p-3 rounded-xl bg-tangerine/10 text-tangerine">
            <MessageCircle size={22} strokeWidth={2.5} />
          </div>
          {/* Status */}
          <div className="relative p-3 rounded-xl text-charcoal/40">
            <Circle size={22} strokeWidth={2} />
          </div>
          {/* Groups (placeholder SVG) */}
          <div className="relative p-3 rounded-xl text-charcoal/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          {/* AI */}
          <div className="relative p-3 rounded-xl text-charcoal/40">
            <img src="/images/ai-logo.svg" alt="AI" className="w-[22px] h-[22px] opacity-60" />
          </div>
        </div>

        {/* Utility buttons at bottom */}
        <div className="flex flex-col gap-3 mt-auto pb-2">
          <div className="p-3 rounded-xl text-charcoal/40 bg-transparent">
            <Search size={22} />
          </div>
          <div className="p-3 rounded-xl text-charcoal/40 bg-transparent">
            {/* Theme icon placeholder */}
            <div className="w-4 h-4 rounded-full bg-base-300 animate-pulse" />
          </div>
            <div className="p-3 rounded-xl text-charcoal/40 bg-transparent">
            <Settings size={22} />
          </div>
          <div className="p-3 rounded-xl text-charcoal/40 bg-transparent">
            <LogOut size={22} />
          </div>
        </div>
      </div>

      {/* Right content area (hidden on small like real sidebar) */}
      <div className="hidden lg:flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-base-200 px-5 pt-5 pb-3 bg-base-100">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-24 rounded bg-base-300 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-base-300 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-3 w-40 bg-base-300 animate-pulse rounded" />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 py-4 space-y-1 thin-scrollbar">
          {Array.from({ length: PLACEHOLDER_ITEMS }).map((_, i) => (
            <div key={i} className="group w-full p-2 flex items-center gap-2 rounded-xl mx-2">
              <div className="relative mx-auto lg:mx-0">
                <div className="size-12 rounded-full bg-base-300 animate-pulse" />
              </div>
              <div className="hidden lg:block text-left min-w-0 flex-1 max-w-[160px]">
                <div className="font-medium flex items-center gap-2">
                  <div className="h-4 w-28 bg-base-300 animate-pulse rounded" />
                  <div className="h-4 w-4 bg-base-300 animate-pulse rounded" />
                </div>
                <div className="mt-1 h-3 w-20 bg-base-300 animate-pulse rounded" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-base-300 animate-pulse" />
                <div className="min-w-5 h-5 rounded-full bg-base-300 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SidebarSkeleton;