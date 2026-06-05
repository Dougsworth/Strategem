// A simple, on-brand loading state: the Strategem checkerboard mark gently
// spinning, with an optional label. Used while the heavy analysis computes, so
// the dashboard doesn't flash a grid of skeletons.
export const Loader = ({ label }: { label?: string }) => {
  return (
    <div className="grid place-items-center gap-5 py-24">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 animate-ping rounded-lg bg-accent/15" />
        <div className="grid h-12 w-12 animate-spin grid-cols-2 grid-rows-2 overflow-hidden rounded-lg bg-ink [animation-duration:1.4s]">
          <div className="bg-paper" />
          <div />
          <div />
          <div className="bg-paper" />
        </div>
      </div>
      {label && (
        <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {label}
        </p>
      )}
    </div>
  );
};
