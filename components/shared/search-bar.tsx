import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  action: string;
  query?: string;
  placeholder: string;
};

export function SearchBar({ action, query, placeholder }: SearchBarProps) {
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[28px] border border-[var(--line)] bg-white/76 p-4 shadow-[0_18px_40px_rgba(21,28,35,0.06)] sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input className="pl-11" defaultValue={query} name="q" placeholder={placeholder} />
      </div>
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  );
}
