import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CatalogView } from "@/components/catalog-view";
import { getCourses, getCurrentUser } from "@/lib/queries";
import { logout } from "@/app/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Módulos",
  description: "Explorá todos los módulos de jiu jitsu de Alliance Learning Center.",
};

export default async function ModulosPage() {
  const [courses, user] = await Promise.all([getCourses(), getCurrentUser()]);

  const navUser = user ? { name: user.name, email: user.email } : null;
  const isLoggedIn = !!user;

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
      <main className="flex-1 pb-20">
        <CatalogView courses={courses} isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </>
  );
}
