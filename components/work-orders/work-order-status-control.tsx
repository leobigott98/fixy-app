"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { moveWorkOrderStatusAction } from "@/app/actions/work-orders";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { workOrderStatusOptions } from "@/lib/work-orders/constants";
import type { WorkOrderRecord } from "@/lib/data/work-orders";

type WorkOrderStatusControlProps = {
  workOrderId: string;
  currentStatus: WorkOrderRecord["status"];
  compact?: boolean;
};

export function WorkOrderStatusControl({
  workOrderId,
  currentStatus,
  compact = false,
}: WorkOrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WorkOrderRecord["status"]>(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="space-y-2">
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
        <Select
          className={compact ? "h-10 text-xs" : undefined}
          onChange={(event) => setStatus(event.target.value as WorkOrderRecord["status"])}
          value={status}
        >
          {workOrderStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button
          className={compact ? "h-10 px-3" : undefined}
          disabled={isPending || status === currentStatus}
          onClick={async () => {
            setIsPending(true);
            const result = await moveWorkOrderStatusAction(workOrderId, status);
            setMessage(result.message);
            setIsPending(false);

            if (result.success) {
              startTransition(() => {
                router.refresh();
              });
            }
          }}
          variant={compact ? "outline" : "primary"}
        >
          Mover
        </Button>
      </div>
      {message && !compact ? (
        <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
