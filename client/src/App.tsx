/** Galactic Command Deck theme: keep the application in dark mode so celestial imagery and high-contrast telemetry remain readable. */
import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Register from "./pages/Register";

const Community = lazy(() => import("./pages/Community"));
const AdminRegistrations = lazy(() => import("./pages/AdminRegistrations"));
const FoodTokenPortal = lazy(() => import("./pages/FoodTokenPortal"));
const AdminFoodScanner = lazy(() => import("./pages/AdminFoodScanner"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/community">
        {() => (
          <Suspense fallback={<main className="registration-page"><div className="registration-shell">Opening Command Deck…</div></main>}>
            <Community />
          </Suspense>
        )}
      </Route>
      <Route path="/food-token">
        {() => (
          <Suspense fallback={<main className="registration-page"><div className="registration-shell">Verifying Food Pass…</div></main>}>
            <FoodTokenPortal />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/food-scan">
        {() => (
          <Suspense fallback={<main className="admin-state">Loading Organiser Scanner…</main>}>
            <AdminFoodScanner />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/catering">
        {() => (
          <Suspense fallback={<main className="admin-state">Loading Organiser Scanner…</main>}>
            <AdminFoodScanner />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/registrations">
        {() => (
          <Suspense fallback={<main className="admin-state">Loading organiser access…</main>}>
            <AdminRegistrations />
          </Suspense>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
