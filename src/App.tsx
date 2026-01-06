import { Switch, Route } from "wouter";
import { queryClient, getApiBaseUrl } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TutorialProvider } from "@/components/onboarding/OnboardingTutorial";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/home";
import Fleet from "@/pages/fleet";
import Onboarding from "@/pages/onboarding";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminsPage from "@/pages/admin/admins";
import ClientsPage from "@/pages/admin/clients";
import ClientDetailPage from "@/pages/admin/client-detail";
import FormsPage from "@/pages/admin/forms";
import CarsPage from "@/pages/admin/cars";
import CarDetailPage from "@/pages/admin/car-detail";
import ViewCarPage from "@/pages/admin/view-car";
import EarningsPage from "@/pages/admin/earnings";
import TotalExpensesPage from "@/pages/admin/total-expenses";
import NADADepreciationPage from "@/pages/admin/nada-depreciation";
import PurchaseDetailsPage from "@/pages/admin/purchase-details";
import GraphsChartsPage from "@/pages/admin/graphs-charts";
import PaymentCalculatorPage from "@/pages/admin/payment-calculator";
import MaintenancePage from "@/pages/admin/maintenance";
import IncomeExpensesPage from "@/pages/admin/income-expenses";
import SettingsPage from "@/pages/admin/settings";
import ClientProfilePage from "@/pages/admin/profile";
import TrainingManualPage from "@/pages/admin/training-manual";
import SignContract from "@/pages/sign-contract";
import Signup from "@/pages/signup";
import ResetPasswordPage from "@/pages/reset-password";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/fleet" component={Fleet} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/contact" component={Contact} />
      <Route path="/sign-contract/:token" component={SignContract} />
      <Route path="/signup" component={Signup} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/admins" component={AdminsPage} />
      <Route path="/admin/clients" component={ClientsPage} />
      <Route path="/admin/clients/:id" component={ClientDetailPage} />
      <Route path="/admin/forms" component={FormsPage} />
      <Route path="/admin/cars" component={CarsPage} />
      <Route path="/admin/view-car/:id" component={ViewCarPage} />
      <Route path="/admin/cars/:id/earnings" component={EarningsPage} />
      <Route path="/admin/cars/:id/expenses" component={TotalExpensesPage} />
      <Route path="/admin/cars/:id/depreciation" component={NADADepreciationPage} />
      <Route path="/admin/cars/:id/purchase" component={PurchaseDetailsPage} />
      <Route path="/admin/cars/:id/graphs" component={GraphsChartsPage} />
      <Route path="/admin/cars/:id/calculator" component={PaymentCalculatorPage} />
      <Route path="/admin/cars/:id/maintenance" component={MaintenancePage} />
      <Route path="/admin/cars/:id" component={CarDetailPage} />
      <Route path="/admin/income-expenses" component={IncomeExpensesPage} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route path="/admin/profile" component={ClientProfilePage} />
      <Route path="/admin/training-manual" component={TrainingManualPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Log initialization for debugging
  if (typeof window !== 'undefined') {
    const apiBaseUrl = getApiBaseUrl();
    
    console.log('[APP] Initializing application...');
    console.log('[APP] Current URL:', window.location.href);
    console.log('[APP] User Agent:', navigator.userAgent);
    console.log('[APP] VITE_API_URL:', import.meta.env.VITE_API_URL || 'Not set');
    console.log('[APP] API Base URL:', apiBaseUrl || 'relative (using Vite proxy)');
    console.log('[APP] Environment:', import.meta.env.PROD ? 'Production' : 'Development');
    
    // Warn if VITE_API_URL is not set in production
    if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
      console.warn('⚠️ [APP] VITE_API_URL is not set in production!');
      console.warn('⚠️ [APP] API calls may fail. Please set VITE_API_URL in Vercel environment variables.');
      console.warn('⚠️ [APP] Expected value: https://luxuryautoportal-replit-1.onrender.com');
    }
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TutorialProvider>
            <Toaster />
            <Router />
          </TutorialProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
