import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChartPoint = {
  label: string;
  value: number;
  color: string;
};

type LinePoint = {
  label: string;
  collected: number;
  expenses: number;
};

export function DonutChartCard({
  title,
  description,
  data,
  totalLabel,
}: {
  title: string;
  description: string;
  data: ChartPoint[];
  totalLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const circumference = 2 * Math.PI * 54;

  return (
    <Card className="bg-white/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[220px_1fr] xl:items-center">
        <div className="mx-auto">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center">
            <svg className="-rotate-90" height="220" viewBox="0 0 220 220" width="220">
              <circle cx="110" cy="110" fill="none" r="54" stroke="rgba(21,28,35,0.08)" strokeWidth="28" />
              {data.map((item) => {
                const length = total ? (item.value / total) * circumference : 0;
                const dashOffset = circumference - offset;
                offset += length;

                return (
                  <circle
                    cx="110"
                    cy="110"
                    fill="none"
                    key={item.label}
                    r="54"
                    stroke={item.color}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    strokeWidth="28"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm text-[var(--muted)]">{totalLabel}</div>
              <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {total}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
              key={item.label}
            >
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="text-sm font-medium">{item.label}</div>
              </div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BarChartCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: ChartPoint[];
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className="bg-white/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-64 items-end gap-3">
          {data.map((item) => (
            <div className="flex flex-1 flex-col items-center gap-3" key={item.label}>
              <div className="text-sm font-semibold">{item.value}</div>
              <div className="flex h-44 w-full items-end rounded-[24px] bg-[rgba(21,28,35,0.04)] p-2">
                <div
                  className="w-full rounded-[18px]"
                  style={{
                    height: `${Math.max((item.value / maxValue) * 100, item.value ? 10 : 0)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="text-center text-xs font-medium text-[var(--muted)]">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LineChartCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: LinePoint[];
}) {
  const width = 520;
  const height = 220;
  const padding = 24;
  const values = data.flatMap((item) => [item.collected, item.expenses]);
  const maxValue = Math.max(...values, 1);

  function buildPath(key: "collected" | "expenses") {
    return data
      .map((item, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
        const y =
          height - padding - ((item[key] ?? 0) / maxValue) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  return (
    <Card className="bg-white/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto">
          <svg className="min-w-[520px]" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
            {[0, 1, 2, 3].map((step) => {
              const y = padding + (step * (height - padding * 2)) / 3;
              return (
                <line
                  key={step}
                  stroke="rgba(21,28,35,0.08)"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                />
              );
            })}
            <path d={buildPath("collected")} fill="none" stroke="#f97316" strokeWidth="4" />
            <path d={buildPath("expenses")} fill="none" stroke="#0f766e" strokeWidth="4" />
            {data.map((item, index) => {
              const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
              const collectedY =
                height - padding - (item.collected / maxValue) * (height - padding * 2);
              const expensesY =
                height - padding - (item.expenses / maxValue) * (height - padding * 2);

              return (
                <g key={item.label}>
                  <circle cx={x} cy={collectedY} fill="#f97316" r="5" />
                  <circle cx={x} cy={expensesY} fill="#0f766e" r="5" />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Legend color="#f97316" label="Cobrado" />
          <Legend color="#0f766e" label="Gastos" />
        </div>
        <div className="grid gap-3 sm:grid-cols-6">
          {data.map((item) => (
            <div className="rounded-[20px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-3" key={item.label}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{item.label}</div>
              <div className="mt-2 text-sm font-medium text-[#f97316]">{item.collected.toLocaleString("es-VE")}</div>
              <div className="text-sm font-medium text-[#0f766e]">{item.expenses.toLocaleString("es-VE")}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-3")}>
      <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}
