/** Shown the instant you switch pages, while the next page is fetched. Keeps the screen alive instead of looking frozen. */
export function PageSkeleton() {
  const block = "animate-pulse rounded-[18px] bg-gray-100 motion-reduce:animate-none";
  return (
    <div data-skeleton aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <div className={`${block} h-8 w-64 max-w-full`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div className={`${block} h-44`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-28`} />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className={`${block} h-64`} />
        <div className={`${block} h-64`} />
      </div>
    </div>
  );
}
