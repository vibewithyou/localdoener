import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import ShopDetail from "@/pages/ShopDetail";
import Ranking from "@/pages/Ranking";
import Report from "@/pages/Report";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import Favorites from "@/pages/Favorites";
import ReviewHistory from "@/pages/ReviewHistory";
import Impressum from "@/pages/Impressum";
import Datenschutz from "@/pages/Datenschutz";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/laden/:slug" component={ShopDetail} />
            <Route path="/ranking/:city" component={Ranking} />
            <Route path="/melden" component={Report} />
            <Route path="/admin" component={Admin} />
            <Route path="/profil" component={Profile} />
            <Route path="/favoriten" component={Favorites} />
            <Route path="/meine-bewertungen" component={ReviewHistory} />
            <Route path="/impressum" component={Impressum} />
            <Route path="/datenschutz" component={Datenschutz} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
    </AuthProvider>
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
