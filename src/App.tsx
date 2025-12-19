import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import IncomeExpensesPage from "@/pages/admin/income-expenses";
import SettingsPage from "@/pages/admin/settings";
import ClientProfilePage from "@/pages/admin/profile";
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
      <Route path="/admin/cars/:id" component={CarDetailPage} />
      <Route path="/admin/income-expenses" component={IncomeExpensesPage} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route path="/admin/profile" component={ClientProfilePage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
