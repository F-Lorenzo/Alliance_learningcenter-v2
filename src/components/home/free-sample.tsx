import { SectionHeader } from "@/components/section-header";
import { CourseCard } from "@/components/course-card";
import type { Course } from "@/types";

interface FreeSampleProps {
  courses: Course[];
}

export function FreeSample({ courses }: FreeSampleProps) {
  return (
    <section className="py-20 px-6 max-w-[1280px] mx-auto">
      <SectionHeader
        label="PROBÁ GRATIS"
        title="Mirá estas técnicas sin registrarte"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} showProgress={false} />
        ))}
      </div>
    </section>
  );
}
