export const BrandLogo = () => {
  return (
    <a href="/" className="flex items-center gap-2">
      <div className="grid h-6 w-6 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-ink">
        <div className="bg-paper" />
        <div />
        <div />
        <div className="bg-paper" />
      </div>
      <span className="font-display text-lg font-bold tracking-tight">
        STRATEGEM
      </span>
    </a>
  );
};
