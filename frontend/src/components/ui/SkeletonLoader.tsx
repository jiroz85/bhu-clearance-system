const skeletonWidths = ["w-full", "w-3/4", "w-5/6", "w-2/3", "w-4/5"];

export function SkeletonLoader({
  className = "",
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div
            className={`h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg ${skeletonWidths[i % skeletonWidths.length]}`}
          ></div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg"></div>
          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-5/6"></div>
        </div>
        <div className="h-20 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
      <div className="p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl animate-pulse"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-3/4"></div>
              <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/2"></div>
            </div>
            <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
