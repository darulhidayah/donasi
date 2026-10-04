export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat data halaman admin...">
      {/* Top Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-surface-container-high" />
        <div className="h-4 w-72 rounded-md bg-surface-container" />
      </div>

      {/* Main Banner / Progress Skeleton */}
      <div className="rounded-xl border border-outline/50 bg-surface p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-surface-container" />
            <div className="h-8 w-56 rounded-lg bg-surface-container-high" />
          </div>
          <div className="space-y-2 sm:text-right">
            <div className="h-3 w-36 rounded bg-surface-container ml-auto" />
            <div className="h-8 w-48 rounded-lg bg-surface-container-high ml-auto" />
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-container" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-4 w-44 rounded bg-surface-container" />
          <div className="h-4 w-28 rounded bg-surface-container" />
        </div>
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-outline/50 bg-surface p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-surface-container" />
              <div className="h-4 w-4 rounded-full bg-surface-container" />
            </div>
            <div className="h-7 w-28 rounded-lg bg-surface-container-high" />
            <div className="h-3 w-24 rounded bg-surface-container" />
          </div>
        ))}
      </div>

      {/* Content / Table Card Skeleton */}
      <div className="rounded-xl border border-outline/50 bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-outline/40 pb-4">
          <div className="h-5 w-40 rounded bg-surface-container-high" />
          <div className="h-8 w-24 rounded-lg bg-surface-container" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-2 border-b border-outline/20">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-surface-container-high" />
                <div className="h-3 w-24 rounded bg-surface-container" />
              </div>
              <div className="h-5 w-24 rounded bg-surface-container" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
