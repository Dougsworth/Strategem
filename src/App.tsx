import { useState, type ReactNode } from "react";
import { PageShell } from "@/sections/PageShell";
import { StudentProvider } from "@/lib/StudentContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ScannedGamesProvider } from "@/lib/ScannedGamesContext";
import { ViewProvider } from "@/lib/ViewContext";
import { AuthScreen } from "@/sections/Auth/AuthScreen";
import { LandingPage } from "@/sections/Landing";
import { CheckoutToast } from "@/sections/Auth/CheckoutToast";

function AuthGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  // Logged-out visitors see the marketing page first; a CTA opens the auth
  // screen (sign-up by default, sign-in from the "Sign in" link).
  const [auth, setAuth] = useState<null | "in" | "up">(null);

  if (!ready) return null; // brief: hydrating auth from storage
  if (!user) {
    return auth ? (
      <AuthScreen initialMode={auth} />
    ) : (
      <LandingPage onGetStarted={(mode) => setAuth(mode)} />
    );
  }
  return <>{children}</>;
}

export const App = () => {
  return (
    <AuthProvider>
      <AuthGate>
        <ScannedGamesProvider>
          <ViewProvider>
            <StudentProvider>
              <PageShell />
            </StudentProvider>
          </ViewProvider>
        </ScannedGamesProvider>
        <CheckoutToast />
      </AuthGate>
    </AuthProvider>
  );
};
