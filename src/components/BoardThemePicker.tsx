import { BOARD_THEMES, setBoardTheme, useBoardTheme } from "@/lib/boardTheme";

// Mini checkerboard swatches to switch the board colour theme (applies to every
// board in the app).
export const BoardThemePicker = () => {
  const current = useBoardTheme();
  return (
    <div className="flex items-center justify-center gap-1.5">
      {BOARD_THEMES.map((t) => (
        <button
          key={t.key}
          onClick={() => setBoardTheme(t.key)}
          title={t.name}
          aria-label={`${t.name} board`}
          className={`h-5 w-5 overflow-hidden rounded-[5px] ring-2 transition ${
            current.key === t.key ? "ring-ink" : "ring-transparent hover:ring-line"
          }`}
        >
          <span className="grid h-full w-full grid-cols-2 grid-rows-2">
            <span style={{ background: t.light }} />
            <span style={{ background: t.dark }} />
            <span style={{ background: t.dark }} />
            <span style={{ background: t.light }} />
          </span>
        </button>
      ))}
    </div>
  );
};
