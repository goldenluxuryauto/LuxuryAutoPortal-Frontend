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
import FormsPage from "@/pages/admin/forms";
import SignContract from "@/pages/sign-contract";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/fleet" component={Fleet} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/contact" component={Contact} />
      <Route path="/sign-contract/:token" component={SignContract} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/admins" component={AdminsPage} />
      <Route path="/admin/clients" component={ClientsPage} />
      <Route path="/admin/forms" component={FormsPage} />
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
