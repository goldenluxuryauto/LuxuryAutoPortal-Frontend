import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { FeaturedCars } from "@/components/home/featured-cars";
import { Services } from "@/components/home/services";
import { CTASection } from "@/components/home/cta-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <main className="relative">
        <Hero />
        
        {/* Transition Section with Subtle Pattern */}
        <section className="relative py-20 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-slate-900/50 dark:to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.05),transparent_50%)]" />
          <div className="relative z-10">
            <FeaturedCars />
          </div>
        </section>

        {/* Services Section with Enhanced Styling */}
        <section className="relative py-20 bg-white dark:bg-slate-900">
          <div className="absolute inset-0">
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <Services />
        </section>

        {/* CTA Section with Gradient Background */}
        <section className="relative py-20 bg-gradient-to-br from-slate-100 via-white to-primary/5 dark:from-slate-800 dark:via-slate-900 dark:to-primary/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
          <div className="relative z-10">
            <CTASection />
          </div>
        </section>
      </main>
      
      {/* Enhanced Footer */}
      <div className="relative">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <Footer />
      </div>
    </div>
  );
}
