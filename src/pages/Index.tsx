import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import GradesSection from "@/components/landing/GradesSection";
import LeaderboardSection from "@/components/landing/LeaderboardSection";
import JoinSection from "@/components/landing/JoinSection";
import OrgSubscriptionSection from "@/components/landing/OrgSubscriptionSection";
import OrganizationsSection from "@/components/landing/OrganizationsSection";

import CTASection from "@/components/landing/CTASection";

/** Set to true when org self-registration form should appear on the home page. */
const SHOW_ORG_SUBSCRIPTION_FORM = false;

const Index = () => {
  return (
    <div className="min-h-screen font-cairo" dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <GradesSection />
        <OrganizationsSection />
        <LeaderboardSection />
        {SHOW_ORG_SUBSCRIPTION_FORM && <OrgSubscriptionSection />}
        <JoinSection />

        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
