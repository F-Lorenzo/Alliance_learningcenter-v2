import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CatalogView } from "@/components/catalog-view";
import { getCourses, getCategories, getCurrentUser } from "@/lib/queries";
import { logout } from "@/app/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Módulos",
  description: "Explorá todos los módulos de jiu jitsu de Alliance Learning Center.",
};

interface Props {
  searchParams: Promise<{ instructor?: string }>;
}

export default async function ModulosPage({ searchParams }: Props) {
  const { instructor } = await searchParams;
  const [courses, categories, user] = await Promise.all([getCourses(), getCategories(), getCurrentUser()]);

  const navUser = user ? { name: user.name, email: user.email } : null;
  const isLoggedIn = !!user;

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
      <main className="flex-1 pb-20">
        <CatalogView
          courses={courses}
          allCategories={categories}
          isLoggedIn={isLoggedIn}
          initialInstructor={instructor}
        />
      </main>
      <Footer />
    </>
  );
}
