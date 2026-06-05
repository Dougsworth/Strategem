export const Footer = () => {
  return (
    <footer className="mt-12 border-t border-line py-8">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 font-mono text-[11px] uppercase tracking-wide text-muted">
        <p>© Strategem Coaching Platform v1.2.0</p>
        <div className="flex gap-6">
          <a href="/docs" className="transition-colors hover:text-ink">
            Documentation
          </a>
          <a href="/support" className="transition-colors hover:text-ink">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
};
