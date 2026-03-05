import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import GradesSection from "@/components/landing/GradesSection";
import LeaderboardSection from "@/components/landing/LeaderboardSection";
import JoinSection from "@/components/landing/JoinSection";

import CTASection from "@/components/landing/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen font-cairo" dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <GradesSection />
        <LeaderboardSection />
        <JoinSection />

        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
