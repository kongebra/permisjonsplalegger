export function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Header skeleton */}
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
          <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4">
        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="h-9 flex-1 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 flex-1 bg-muted animate-pulse rounded-lg" />
        </div>

        {/* Navigation skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-9 bg-muted animate-pulse rounded-md" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
          <div className="h-9 w-9 bg-muted animate-pulse rounded-md" />
        </div>

        {/* Calendar grid skeleton */}
        <div className="space-y-2">
          {/* Day header row */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`header-${i}`} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
          {/* Week rows */}
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={`row-${row}`} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, col) => (
                <div
                  key={`cell-${row}-${col}`}
                  className="h-10 bg-muted animate-pulse rounded"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Stats bar skeleton */}
        <div className="flex gap-2 mt-4">
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-lg" />
        </div>
      </main>
    </div>
  );
}
