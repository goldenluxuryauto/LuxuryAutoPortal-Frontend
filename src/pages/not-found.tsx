import { useLocation } from "wouter";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import SignContract from "@/pages/sign-contract";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's history to go back to
    // If the referrer exists and is from the same origin, we can go back
    const referrer = document.referrer;
    const sameOrigin = referrer && new URL(referrer).origin === window.location.origin;
    setCanGoBack(sameOrigin && window.history.length > 1);
  }, []);

  // Check if this is actually a sign-contract route
  // Sometimes routes don't match correctly, so we check the URL directly
  if (location.startsWith("/sign-contract/")) {
    return <SignContract />;
  }

  const handleBack = () => {
    if (canGoBack && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-[#EAEB80]/10 flex items-center justify-center mx-auto mb-8">
          <Construction className="w-10 h-10 text-[#EAEB80]" />
        </div>
        <h1 className="font-serif text-4xl lg:text-6xl font-light text-white mb-4">
          Under Development
        </h1>
        <p className="text-xl text-gray-400 mb-2">
          This page is currently under development
        </p>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We're working hard to bring you this feature. Please check back soon!
        </p>
        <Button 
          onClick={handleBack}
          size="lg" 
          className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          {canGoBack ? "Go Back" : "Back to Home"}
        </Button>
      </div>
    </div>
  );
}
