import { useState } from "react";
import { Check, LineChart, Target, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { firebaseEnabled } from "@/lib/firebase";

const VALUE_PROPS = [
  { icon: Target, text: "Pinpoint each student's real weaknesses from their games" },
  { icon: Wand2, text: "AI report cards & lesson plans in seconds" },
  { icon: LineChart, text: "Track growth and prove progress over time" },
];

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export const AuthScreen = ({
  initialMode = "in",
}: {
  initialMode?: "in" | "up";
}) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") await signUp(name, email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-paper md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper md:flex">
        {/* slowly drifting board motif */}
        <div
          className="pointer-events-none absolute inset-0 animate-board-drift opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)",
            backgroundSize: "64px 64px",
            backgroundPosition: "0 0, 32px 32px",
          }}
        />
        {/* ambient accent glows */}
        <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 animate-glow-pulse rounded-full bg-accent/40 blur-[100px]" />
        <div
          className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 animate-float rounded-full bg-accent/15 blur-[120px]"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="relative flex animate-fade-up items-center gap-2">
          <div className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-paper">
            <div className="bg-ink" />
            <div />
            <div />
            <div className="bg-ink" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            STRATEGEM
          </span>
        </div>

        <div className="relative max-w-md">
          <h1
            className="animate-fade-up font-display text-4xl font-bold leading-tight tracking-tight"
            style={{ animationDelay: "0.1s" }}
          >
            Coach smarter.<br />See every game clearly.
          </h1>
          <ul className="mt-8 space-y-4">
            {VALUE_PROPS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex animate-fade-up items-start gap-3 text-paper/80"
                style={{ animationDelay: `${0.25 + i * 0.12}s` }}
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent transition-transform hover:scale-110">
                  <Icon size={15} />
                </span>
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p
          className="relative animate-fade-up font-mono text-[11px] uppercase tracking-wide text-paper/40"
          style={{ animationDelay: "0.7s" }}
        >
          Your students’ games, decoded
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* mobile logo */}
          <div className="mb-8 flex animate-fade-up items-center gap-2 md:hidden">
            <div className="grid h-6 w-6 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-ink">
              <div className="bg-paper" />
              <div />
              <div />
              <div className="bg-paper" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              STRATEGEM
            </span>
          </div>

          <h2
            className="animate-fade-up font-display text-2xl font-bold tracking-tight"
            style={{ animationDelay: "0.05s" }}
          >
            {mode === "in" ? "Welcome back" : "Create your account"}
          </h2>
          <p
            className="mt-1 animate-fade-up text-sm text-muted"
            style={{ animationDelay: "0.1s" }}
          >
            {mode === "in"
              ? "Sign in to your coaching workspace."
              : "Start coaching with real game insight."}
          </p>

          {/* Social sign-in */}
          <div
            className="mt-6 animate-fade-up space-y-2"
            style={{ animationDelay: "0.18s" }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Sign-in failed.");
                  setBusy(false);
                }
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-card py-2.5 text-sm font-medium transition-all hover:-translate-y-px hover:bg-ink-soft hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div
            className="my-5 flex animate-fade-up items-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <div className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted/60">
              or with email
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form
            onSubmit={submit}
            className="animate-fade-up space-y-3"
            style={{ animationDelay: "0.3s" }}
          >
            {mode === "up" && (
              <div className="animate-fade-up">
                <Field
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Coach name"
                  autoFocus
                />
              </div>
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@club.com"
              autoFocus={mode === "in"}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            {error && <p className="animate-fade-in text-xs text-accent">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              {busy
                ? "One moment…"
                : mode === "in"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p
            className="mt-6 animate-fade-up text-center text-sm text-muted"
            style={{ animationDelay: "0.36s" }}
          >
            {mode === "in" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError(null);
              }}
              className="font-semibold text-ink underline-offset-2 transition-colors hover:underline"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>

          {/* Only shown in local mock mode — hidden once real Firebase auth is live. */}
          {!firebaseEnabled && (
            <p className="mt-6 flex items-center justify-center gap-1.5 rounded-lg bg-ink-soft px-3 py-2 text-center text-[11px] text-muted">
              <Check size={12} className="text-positive" />
              Demo mode — any email + a 6-char password works. No real account yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none ring-accent/30 transition-shadow placeholder:text-muted/50 focus:ring-2"
      />
    </label>
  );
}
