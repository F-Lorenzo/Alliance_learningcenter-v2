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
import { getCategories, getInstructors, getFreeCourses, getCurrentUser } from "@/lib/queries";
import { logout } from "@/app/actions";

export default async function HomePage() {
  const [categories, instructors, freeCourses, user] = await Promise.all([
    getCategories(),
    getInstructors(),
    getFreeCourses(),
    getCurrentUser(),
  ]);

  const navUser = user ? { name: user.name, email: user.email } : null;

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <HowItWorks />
        <CategoriesGrid categories={categories} />
        <InstructorsSection instructors={instructors} />
        <FreeSample courses={freeCourses} />
        <Testimonials />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
