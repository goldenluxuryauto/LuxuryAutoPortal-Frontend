import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Car, Phone, FileText, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/fleet", label: "Our Fleet", icon: Car },
  { href: "/onboarding", label: "Get Started", icon: FileText },
  { href: "/contact", label: "Contact", icon: Phone },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#0a0a0a]/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link
            href="/"
            className="flex items-center"
            data-testid="link-logo"
          >
            <img 
              src="/logo.png" 
              alt="Golden Luxury Auto" 
              className="w-[140px] md:w-[180px] h-auto object-contain drop-shadow-[0_0_12px_rgba(234,235,128,0.4)]"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors relative group",
                  location === link.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute bottom-0 left-4 right-4 h-0.5 bg-primary transition-transform origin-left",
                    location === link.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/admin/login">
              <Button variant="ghost" data-testid="button-login">
                Login
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>

          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-mobile-menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-[#0a0a0a] z-40">
          <div className="flex flex-col p-6 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md text-lg font-medium transition-colors",
                    location === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                  data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <Link href="/admin/login" className="w-full">
                <Button variant="ghost" className="w-full" onClick={() => setIsOpen(false)} data-testid="button-mobile-login">
                  Login
                </Button>
              </Link>
              <Link href="/onboarding" className="w-full">
                <Button className="w-full" size="lg" onClick={() => setIsOpen(false)} data-testid="button-mobile-get-started">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
