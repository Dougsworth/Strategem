import { useState } from "react";
import { RotateCcw } from "lucide-react";

// Memory Match — flip cards two at a time to find the pairs. Trains visual
// memory and recall, the same board-vision a player leans on when calculating.
const GLYPHS = ["♚", "♛", "♜", "♝", "♞", "♟", "♔", "♕"]; // 8 pairs → 4×4

interface Card {
  glyph: string;
  matched: boolean;
}

function deal(): Card[] {
  const cards = [...GLYPHS, ...GLYPHS].map((glyph) => ({ glyph, matched: false }));
  // Fisher–Yates shuffle.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export const MemoryMatch = () => {
  const [cards, setCards] = useState<Card[]>(deal);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const won = cards.every((c) => c.matched);

  function flip(i: number) {
    if (busy || flipped.includes(i) || cards[i].matched) return;
    const next = [...flipped, i];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].glyph === cards[b].glyph) {
        setCards((cs) =>
          cs.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c)),
        );
        setFlipped([]);
      } else {
        setBusy(true);
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 750);
      }
    }
  }

  function reset() {
    setCards(deal());
    setFlipped([]);
    setMoves(0);
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-5">
        <span className="font-mono text-sm text-muted">{moves} flips</span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <RotateCcw size={14} />
          Shuffle
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {cards.map((card, i) => {
          const showing = flipped.includes(i) || card.matched;
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`grid h-16 w-16 place-items-center rounded-xl text-3xl transition-all ${
                showing
                  ? card.matched
                    ? "bg-positive/15 text-positive"
                    : "bg-ink text-paper"
                  : "bg-ink-soft text-transparent ring-1 ring-line hover:bg-ink/10"
              }`}
            >
              {showing ? card.glyph : "?"}
            </button>
          );
        })}
      </div>

      {won && (
        <p className="mt-4 font-display text-lg font-bold text-positive">
          All matched in {moves} flips! 🧠
        </p>
      )}
    </div>
  );
};
