import type { Route } from "next";
import Link from "next/link";
import { Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { workshopServiceOptions } from "@/lib/workshops/constants";

type WorkshopDirectoryFiltersProps = {
  query?: string;
  location?: string;
  service?: string;
  locations: string[];
  actionPath?: Route;
  clearHref?: Route;
};

export function WorkshopDirectoryFilters({
  query,
  location,
  service,
  locations,
  actionPath = "/talleres" as Route,
  clearHref = "/talleres" as Route,
}: WorkshopDirectoryFiltersProps) {
  return (
    <form
      action={actionPath}
      className="grid gap-3 rounded-[22px] border border-[var(--line)] bg-white/88 p-4 shadow-[0_18px_40px_rgba(7,31,39,0.08)] sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.9fr_auto_auto]"
    >
      <label className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-11"
          defaultValue={query}
          name="q"
          placeholder="Buscar por taller, ciudad o servicio"
        />
      </label>

      <Select defaultValue={location} name="city">
        <option value="">Todas las ubicaciones</option>
        {locations.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>

      <Select defaultValue={service} name="service">
        <option value="">Todos los servicios</option>
        {workshopServiceOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>

      <Button type="submit" variant="primary">
        <Filter className="size-4" />
        Aplicar
      </Button>

      <Button asChild type="button" variant="outline">
        <Link href={clearHref}>Limpiar</Link>
      </Button>
    </form>
  );
}
