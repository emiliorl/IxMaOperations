const bar = "animate-pulse rounded bg-zinc-800/60";

/** Shown inside the portal layout while a portal page loads, so a click responds at once. */
export default function PortalLoading() {
  return (
    <div className="py-10 md:py-14" aria-busy="true">
      <div className="container mx-auto px-6 max-w-5xl space-y-8">
        <div className="space-y-3">
          <div className={`${bar} h-3 w-24`} />
          <div className={`${bar} h-9 w-2/3 max-w-md`} />
          <div className={`${bar} h-4 w-full max-w-xl`} />
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3">
            <div className={`${bar} h-3 w-32`} />
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className={`${bar} h-4 w-full`} />
            <div className={`${bar} h-4 w-5/6`} />
            <div className={`${bar} h-4 w-2/3`} />
          </div>
        </div>
      </div>
    </div>
  );
}
