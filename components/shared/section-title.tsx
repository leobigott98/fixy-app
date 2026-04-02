import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-2xl text-center")}>
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary-strong)]">
          {eyebrow}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
