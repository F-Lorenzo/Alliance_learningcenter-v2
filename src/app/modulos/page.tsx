import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CatalogView } from "@/components/catalog-view";
import { MOCK_ALL_COURSES } from "@/lib/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Módulos",
  description: "Explorá todos los módulos de jiu jitsu de Alliance Learning Center.",
};

export default function ModulosPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1 pb-20">
        <CatalogView courses={MOCK_ALL_COURSES} isLoggedIn={false} />
      </main>
      <Footer />
    </>
  );
}
