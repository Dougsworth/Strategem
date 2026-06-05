import { useView, type View } from "@/lib/ViewContext";

const LINKS: { label: string; view: View }[] = [
  { label: "Roster", view: "roster" },
  { label: "Curriculum", view: "curriculum" },
  { label: "Analytics", view: "analytics" },
];

export const DesktopNavLinks = () => {
  const { view, setView } = useView();

  return (
    <div className="hidden items-center gap-6 text-sm font-medium md:flex">
      {LINKS.map((link) => (
        <button
          key={link.label}
          onClick={() => setView(link.view)}
          className={
            view === link.view
              ? "text-ink"
              : "text-muted transition-colors hover:text-ink"
          }
        >
          {link.label}
        </button>
      ))}
    </div>
  );
};
