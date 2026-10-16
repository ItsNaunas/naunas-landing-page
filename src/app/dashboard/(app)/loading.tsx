// Skeleton while a tab's live data loads (each tab calls several APIs).
export default function Loading() {
  const block = 'rounded-2xl bg-white/[0.04] animate-pulse';
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className={`${block} h-9 w-48`} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-32`} />)}</div>
      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className={`${block} h-72 lg:col-span-2`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}
