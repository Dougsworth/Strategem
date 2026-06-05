import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ReportProfile, RosterEntry, StudentReport } from "./types";
import { fetchRosterEntry } from "./roster";
import {
  fetchReportGames,
  resolveProfile,
} from "./analysis/computeReport";
import { runReportInWorker } from "./analysis/runReportInWorker";
import { parseLichessInput } from "./parseInput";
import { fetchGamePlayers } from "./providers/lichess";
import { computeDeltas, recordSnapshot, type Delta } from "./snapshots";
import { loadCoachData, saveCoachData, type StoredStudent } from "./coachStore";
import { useAuth } from "./AuthContext";
import { canAddStudent, entitlements } from "./entitlements";
import { cooldownOk } from "./guardrails";

// Cache of computed reports, keyed by username:perf. Re-selecting a student or
// toggling a perf returns instantly (no games fetch, no re-analysis). Persisted
// to localStorage with a TTL so it's instant across reloads too; entries older
// than the TTL are dropped on load so data doesn't get stale forever.
const reportCache = new Map<string, StudentReport>();
const cacheKey = (username: string, perf: string) =>
  `${username.toLowerCase()}:${perf}`;

const RCACHE_KEY = "strategem.reportcache.v1";
const RCACHE_CAP = 6;
const RCACHE_TTL = 12 * 60 * 60 * 1000; // 12h

function hydrateReportCache() {
  try {
    const raw = localStorage.getItem(RCACHE_KEY);
    if (!raw) return;
    const now = Date.now();
    for (const [key, ts, report] of JSON.parse(raw) as [
      string,
      number,
      StudentReport,
    ][]) {
      if (now - ts < RCACHE_TTL) reportCache.set(key, report);
    }
  } catch {
    /* ignore corrupt cache */
  }
}

function persistReportCache() {
  try {
    const now = Date.now();
    const entries = [...reportCache.entries()]
      .slice(-RCACHE_CAP)
      .map(([key, report]) => [key, now, report]);
    localStorage.setItem(RCACHE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full/disabled — non-fatal */
  }
}

hydrateReportCache();

/** Example accounts a coach can try — NOT hardcoded students, just a starting point. */
export const EXAMPLE_USERNAMES = ["EricRosen", "Zhigalko_Sergei", "Krikor"];

interface StudentContextValue {
  roster: RosterEntry[];
  rosterLoading: boolean;
  selected: string | null;
  select: (username: string) => void;
  /** Add by pasted profile URL, game URL, or bare username. */
  addByInput: (input: string) => Promise<void>;
  removeStudent: (username: string) => void;
  /** Switch the time-control (bullet/blitz/rapid/classical) for the selected student. */
  setPerf: (perf: string) => void;
  /** Re-pull the selected student's games, bypassing the cache (after they play). */
  refresh: () => void;
  /** Identity + rating data, available before the full analysis finishes. */
  profile: ReportProfile | null;
  report: StudentReport | null;
  reportLoading: boolean;
  reportError: string | null;
  /** "Since last review" deltas (null until ≥2 snapshots exist). */
  deltas: ReturnType<typeof computeDeltas>;
  reportCardOpen: boolean;
  openReportCard: () => void;
  closeReportCard: () => void;
}

export type { Delta };

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user, openMembership } = useAuth();
  const uid = user?.uid;
  const plan = user?.plan;
  const clubId = user?.clubId;
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const [profile, setProfile] = useState<ReportProfile | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<ReturnType<typeof computeDeltas>>(null);
  const [reportCardOpen, setReportCardOpen] = useState(false);
  // Per-student time-control override (undefined → auto-pick most-played).
  const [perfOverrides, setPerfOverrides] = useState<Record<string, string>>({});
  const hydrated = useRef(false);
  const lastSaved = useRef("");

  // Hydrate the roster for the signed-in coach — from Firestore when signed in
  // with Firebase, else localStorage. Re-runs if the coach (uid) changes.
  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;
    setRosterLoading(true);
    (async () => {
      const data = await loadCoachData(uid, clubId);
      const entries = await Promise.all(
        data.roster.map((s) =>
          fetchRosterEntry(s.username).catch(
            (): RosterEntry => ({
              platform: "lichess",
              username: s.username,
              displayName: s.username,
              initials: s.username.slice(0, 2).toUpperCase(),
              rating: null,
              trend: "steady",
            }),
          ),
        ),
      );
      if (cancelled) return;
      const nextSelected =
        data.selected && entries.some((e) => e.username === data.selected)
          ? data.selected
          : (entries[0]?.username ?? null);
      // Remember what we just loaded so the persist effect doesn't echo it back.
      lastSaved.current = JSON.stringify({
        roster: entries.map((e) => ({ platform: e.platform, username: e.username })),
        selected: nextSelected,
        clubId,
      });
      setRoster(entries);
      setSelected(nextSelected);
      setRosterLoading(false);
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, clubId]);

  // Persist roster + selection (to Firestore or localStorage) after hydration,
  // skipping no-op writes (incl. the echo right after loading).
  useEffect(() => {
    if (!hydrated.current) return;
    const stored: StoredStudent[] = roster.map((r) => ({
      platform: r.platform,
      username: r.username,
    }));
    const payload = JSON.stringify({ roster: stored, selected, clubId });
    if (payload === lastSaved.current) return;
    lastSaved.current = payload;
    void saveCoachData(uid, clubId, { roster: stored, selected });
  }, [roster, selected, uid, clubId]);

  // Staged load whenever the selected student / perf changes:
  //   1. resolveProfile (fast) → show name, rating, trend, perf selector, sparkline
  //   2. cache hit → set report instantly; else fetch games + analyze in a worker
  useEffect(() => {
    if (!selected) {
      setProfile(null);
      setReport(null);
      return;
    }
    let cancelled = false;
    setReportLoading(true);
    setReportError(null);
    setDeltas(null);
    setProfile(null);
    setReport(null);

    const desiredPerf = perfOverrides[selected];

    (async () => {
      try {
        // Stage 1 — identity + rating (renders the header immediately).
        const { profile: prof, buildBase, perf } = await resolveProfile(selected, {
          perf: desiredPerf,
        });
        if (cancelled) return;
        setProfile(prof);

        const applyReport = (r: StudentReport) => {
          setReport(r);
          // Keep the accurate last-game time from stage 1 (true last game),
          // not the report's (which only sees analysed games).
          setProfile({ ...prof, lastGameAt: prof.lastGameAt ?? r.lastGameAt });
          setDeltas(computeDeltas(recordSnapshot(r)));
        };

        // Stage 2 — cached report → instant; skip games fetch + worker.
        const key = cacheKey(selected, perf);
        const cached = reportCache.get(key);
        if (cached) {
          applyReport(cached);
          return;
        }

        // Stage 3 — fetch games, analyze off the main thread, cache.
        const games = await fetchReportGames(selected, perf);
        if (cancelled) return;
        const report = await runReportInWorker({ ...buildBase, games });
        if (cancelled) return;
        reportCache.set(key, report);
        persistReportCache();
        applyReport(report);
      } catch (e: unknown) {
        if (cancelled) return;
        setReport(null);
        setReportError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, perfOverrides, refreshNonce]);

  // Deep link: ?u=<profile-url|game-url|username> auto-loads a student.
  const didParam = useRef(false);
  useEffect(() => {
    if (rosterLoading || didParam.current) return;
    didParam.current = true;
    const params = new URLSearchParams(window.location.search);
    const param = params.get("u");
    if (param) void addByInputRef.current?.(param);
    // ?card=1 deep-links straight to the report card once it loads.
    if (params.get("card")) setReportCardOpen(true);
    // addByInputRef is set below; this runs after roster hydration.
  }, [rosterLoading]);
  const addByInputRef = useRef<((input: string) => Promise<void>) | null>(null);

  const select = useCallback((username: string) => setSelected(username), []);

  const upsert = useCallback((entry: RosterEntry) => {
    setRoster((cur) =>
      cur.some((r) => r.username.toLowerCase() === entry.username.toLowerCase())
        ? cur
        : [...cur, entry],
    );
  }, []);

  const addByInput = useCallback(
    async (input: string) => {
      const parsed = parseLichessInput(input);
      if (!parsed) {
        throw new Error(
          "Paste a Lichess profile URL, game URL, or username.",
        );
      }
      // Enforce the plan's student cap (real gating, not just a pricing label).
      // In a club the roster is shared + owner-paid, so no per-user cap applies.
      if (!clubId && !canAddStudent(plan, roster.length)) {
        openMembership();
        const cap = entitlements(plan).maxStudents;
        throw new Error(
          `Your plan covers ${cap} student${cap === 1 ? "" : "s"}. Upgrade for more.`,
        );
      }
      if (parsed.kind === "user") {
        const entry = await fetchRosterEntry(parsed.username);
        upsert(entry);
        setSelected(entry.username);
        return;
      }
      // Game URL → add both players, but never past the plan's student cap.
      const names = await fetchGamePlayers(parsed.gameId);
      if (names.length === 0) throw new Error("No players found in that game.");
      const entries = await Promise.all(names.map((n) => fetchRosterEntry(n)));
      const max = clubId ? Infinity : entitlements(plan).maxStudents;
      const remaining =
        max === Infinity ? entries.length : Math.max(0, max - roster.length);
      const toAdd = entries.slice(0, remaining);
      if (toAdd.length === 0) {
        openMembership();
        throw new Error(
          `Your plan covers ${max} student${max === 1 ? "" : "s"}. Upgrade for more.`,
        );
      }
      toAdd.forEach(upsert);
      setSelected(toAdd[0].username);
    },
    [upsert, plan, roster, openMembership, clubId],
  );

  addByInputRef.current = addByInput;

  const removeStudent = useCallback((username: string) => {
    setRoster((cur) => {
      const next = cur.filter((r) => r.username !== username);
      setSelected((sel) =>
        sel === username ? (next[0]?.username ?? null) : sel,
      );
      return next;
    });
  }, []);

  // Drop the cached report for the selected student (all perfs) and re-pull —
  // for when they've just played and the dashboard looks stale.
  const refresh = useCallback(() => {
    if (!selected) return;
    // Throttle: at most one refresh per student every 20s (don't spam Lichess).
    if (!cooldownOk(`refresh:${selected.toLowerCase()}`, 20_000)) return;
    const prefix = `${selected.toLowerCase()}:`;
    for (const k of [...reportCache.keys()]) {
      if (k.startsWith(prefix)) reportCache.delete(k);
    }
    persistReportCache();
    setRefreshNonce((n) => n + 1);
  }, [selected]);

  const openReportCard = useCallback(() => setReportCardOpen(true), []);
  const closeReportCard = useCallback(() => setReportCardOpen(false), []);
  const setPerf = useCallback(
    (perf: string) => {
      setPerfOverrides((cur) => (selected ? { ...cur, [selected]: perf } : cur));
    },
    [selected],
  );

  const value = useMemo<StudentContextValue>(
    () => ({
      roster,
      rosterLoading,
      selected,
      select,
      addByInput,
      removeStudent,
      setPerf,
      refresh,
      profile,
      report,
      reportLoading,
      reportError,
      deltas,
      reportCardOpen,
      openReportCard,
      closeReportCard,
    }),
    [
      roster,
      rosterLoading,
      selected,
      select,
      addByInput,
      removeStudent,
      setPerf,
      refresh,
      profile,
      report,
      reportLoading,
      reportError,
      deltas,
      reportCardOpen,
      openReportCard,
      closeReportCard,
    ],
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used within StudentProvider");
  return ctx;
}
