"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Supplier } from "@/types/supplier";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { updateSupplierStatus } from "../_actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["prospect", "active", "on_hold", "discarded"] as const;

export function KanbanBoard({
  initialSuppliers,
}: {
  initialSuppliers: Supplier[];
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const countries = useMemo(() => {
    const set = new Set(
      suppliers.map((s) => s.country).filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [suppliers]);

  const filtered =
    countryFilter === "all"
      ? suppliers
      : suppliers.filter((s) => s.country === countryFilter);

  const grouped = STATUSES.reduce(
    (acc, status) => {
      acc[status] = filtered.filter(
        (s) => (s.relationship_status ?? "prospect") === status
      );
      return acc;
    },
    {} as Record<string, Supplier[]>
  );

  function handleDragStart(event: DragStartEvent) {
    const supplier = event.active.data.current?.supplier as Supplier;
    setActiveSupplier(supplier ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSupplier(null);

    const { active, over } = event;
    if (!over) return;

    const supplierId = active.id as string;
    const newStatus = over.id as string;

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const currentStatus = supplier.relationship_status ?? "prospect";
    if (currentStatus === newStatus) return;

    // Optimistic update
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId ? { ...s, relationship_status: newStatus } : s
      )
    );

    startTransition(async () => {
      const result = await updateSupplierStatus(supplierId, newStatus);
      if (result.error) {
        // Revert on error
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === supplierId
              ? { ...s, relationship_status: currentStatus }
              : s
          )
        );
      }
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Select
          value={countryFilter}
          onValueChange={(v) => setCountryFilter(v ?? "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por país" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los países</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            suppliers={grouped[status]}
          />
        ))}
      </div>
        <DragOverlay>
          {activeSupplier ? <KanbanCard supplier={activeSupplier} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
