import { cn } from "@/lib/utils";

/** Props for the SectionHeader component */
interface SectionHeaderProps {
  /** Section title displayed in bold uppercase */
  title: string;
  /** Optional subtitle displayed below the title in gold */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("bg-black px-4 py-3", className)}>
      <h2 className="text-lg font-bold uppercase tracking-wide text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-[#FFD700]">{subtitle}</p>
      )}
      <div className="mt-2 h-[2px] w-full bg-[#FFD700]" />
    </div>
  );
}
