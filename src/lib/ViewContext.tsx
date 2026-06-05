import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Which top-level tab is showing. The app is a single page, so this is a tiny
// in-memory router shared by the navbar links and the main content.
export type View = "roster" | "curriculum" | "analytics";

interface ViewValue {
  view: View;
  setView: (v: View) => void;
}

const Ctx = createContext<ViewValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("roster");
  const value = useMemo(() => ({ view, setView }), [view]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useView(): ViewValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useView must be used within ViewProvider");
  return c;
}
