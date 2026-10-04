export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* Header bar skeleton */}
      <header className="site-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-surface-container border border-outline/50 animate-pulse" />
            <div className="space-y-1.5 animate-pulse">
              <div className="h-4 w-36 rounded bg-surface-container-high" />
              <div className="h-3 w-48 rounded bg-surface-container" />
            </div>
          </div>
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-9 w-9 rounded-xl bg-surface-container" />
            <div className="h-9 w-20 rounded-xl bg-surface-container" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10 animate-pulse">
        {/* 1. Hero Banner Skeleton */}
        <section className="rounded-xl bg-surface border border-outline/50 p-6 md:p-8 space-y-6">
          <div className="h-5 w-48 rounded-full bg-emerald-500/10 border border-emerald-500/20" />
          <div className="space-y-2">
            <div className="h-8 md:h-10 w-3/4 rounded-lg bg-surface-container-high" />
            <div className="h-4 w-full max-w-xl rounded bg-surface-container" />
          </div>

          <div className="mt-8 pt-6 border-t border-outline/40 space-y-4">
            <div className="flex justify-between items-baseline">
              <div className="space-y-1">
                <div className="h-3 w-28 rounded bg-surface-container" />
                <div className="h-8 w-44 rounded bg-surface-container-high" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-3 w-28 rounded bg-surface-container ml-auto" />
                <div className="h-6 w-36 rounded bg-surface-container ml-auto" />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-container" />
            <div className="flex justify-between">
              <div className="h-4 w-24 rounded bg-surface-container" />
              <div className="h-4 w-36 rounded bg-surface-container" />
            </div>
          </div>
        </section>

        {/* 2. Stats Grid Skeleton */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-surface border border-outline/50 p-4 text-center space-y-2">
              <div className="h-3 w-24 rounded bg-surface-container mx-auto" />
              <div className="h-7 w-20 rounded bg-surface-container-high mx-auto" />
              <div className="h-2.5 w-28 rounded bg-surface-container mx-auto" />
            </div>
          ))}
        </section>

        {/* 3. Section Skeleton */}
        <section className="rounded-xl bg-surface border border-outline/50 p-6 space-y-4">
          <div className="h-6 w-52 rounded bg-surface-container-high" />
          <div className="h-4 w-72 rounded bg-surface-container" />
          <div className="h-32 w-full rounded-lg bg-surface-container mt-4" />
        </section>
      </main>
    </div>
  );
}
