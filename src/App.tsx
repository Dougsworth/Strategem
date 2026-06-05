import type { ReactNode } from "react";
import { PageShell } from "@/sections/PageShell";
import { StudentProvider } from "@/lib/StudentContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ScannedGamesProvider } from "@/lib/ScannedGamesContext";
import { ViewProvider } from "@/lib/ViewContext";
import { AuthScreen } from "@/sections/Auth/AuthScreen";
import { CheckoutToast } from "@/sections/Auth/CheckoutToast";

function AuthGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null; // brief: hydrating auth from storage
  if (!user) return <AuthScreen />;
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
