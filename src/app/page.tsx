import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/home/hero";
import { StatsBar } from "@/components/home/stats-bar";
import { HowItWorks } from "@/components/home/how-it-works";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { InstructorsSection } from "@/components/home/instructors-section";
import { FreeSample } from "@/components/home/free-sample";
import { Testimonials } from "@/components/home/testimonials";
import { PricingSection } from "@/components/home/pricing-section";
import { FaqSection } from "@/components/home/faq-section";
import {
  MOCK_CATEGORIES,
  MOCK_INSTRUCTORS,
  MOCK_FREE_COURSES,
} from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <HowItWorks />
        <CategoriesGrid categories={MOCK_CATEGORIES} />
        <InstructorsSection instructors={MOCK_INSTRUCTORS} />
        <FreeSample courses={MOCK_FREE_COURSES} />
        <Testimonials />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
