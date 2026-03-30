"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Supplier } from "@/types/supplier";
import { KanbanCard } from "./kanban-card";

const COLUMN_LABELS: Record<string, string> = {
  prospect: "Prospect",
  active: "Activo",
  on_hold: "En espera",
  discarded: "Descartado",
};

const COLUMN_COLORS: Record<string, string> = {
  prospect: "bg-blue-500",
  active: "bg-green-500",
  on_hold: "bg-yellow-500",
  discarded: "bg-red-500",
};

export function KanbanColumn({
  status,
  suppliers,
}: {
  status: string;
  suppliers: Supplier[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors ${
        isOver ? "border-ring bg-muted/60" : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <span
          className={`size-2.5 rounded-full ${COLUMN_COLORS[status] ?? "bg-gray-400"}`}
        />
        <h3 className="text-sm font-semibold">
          {COLUMN_LABELS[status] ?? status}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {suppliers.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {suppliers.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Sin proveedores
          </p>
        ) : (
          suppliers.map((s) => <KanbanCard key={s.id} supplier={s} />)
        )}
      </div>
    </div>
  );
}
