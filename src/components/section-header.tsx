import { cn } from "@/lib/utils";
import Link from "next/link";

interface SectionHeaderProps {
  label: string;
  title?: string;
  action?: string;
  actionHref?: string;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  action,
  actionHref,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-baseline justify-between", className)}>
      <div>
        <p className="text-[11px] uppercase tracking-[3px] text-text-tertiary font-medium mb-2">
          {label}
        </p>
        {title && (
          <h2 className="text-xl font-medium text-text-primary">{title}</h2>
        )}
      </div>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="text-sm text-text-secondary hover:text-gold transition-colors"
        >
          {action}
        </Link>
      )}
      {action && !actionHref && (
        <span className="text-sm text-text-secondary hover:text-gold transition-colors cursor-pointer">
          {action}
        </span>
      )}
    </div>
  );
}
