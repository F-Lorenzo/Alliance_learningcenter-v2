"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";
import type { Instructor } from "@/types";

interface InstructorsSectionProps {
  instructors: Instructor[];
}

export function InstructorsSection({ instructors }: InstructorsSectionProps) {
  return (
    <section className="py-20 px-6 bg-bg-secondary/50">
      <div className="max-w-[1280px] mx-auto">
        <SectionHeader label="PROFESORES" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mt-10">
          {instructors.map((instructor, i) => (
            <motion.div
              key={instructor.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="group text-center cursor-pointer"
            >
              {/* Foto */}
              <div className="aspect-square rounded-full overflow-hidden bg-bg-tertiary mb-4 border-2 border-transparent group-hover:border-gold transition-colors mx-auto w-24 lg:w-full max-w-[120px]">
                {instructor.photo_url ? (
                  <Image
                    src={instructor.photo_url}
                    alt={instructor.name}
                    width={120}
                    height={120}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
                    <span className="text-2xl font-medium text-text-tertiary">
                      {instructor.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">
                {instructor.name}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {instructor.belt}
              </p>
              {/* Logros (tooltip/hover) */}
              {instructor.achievements && instructor.achievements.length > 0 && (
                <div className="hidden group-hover:flex flex-wrap gap-1 justify-center mt-2">
                  {instructor.achievements.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-sm"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
