"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Supplier } from "@/types/supplier";

export function KanbanCard({ supplier }: { supplier: Supplier }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: supplier.id, data: { supplier } });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <a
        href={`/suppliers/${supplier.id}`}
        className="font-medium text-sm hover:underline"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {supplier.company_name}
      </a>
      {(supplier.city || supplier.country) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[supplier.city, supplier.country].filter(Boolean).join(", ")}
        </p>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {new Date(supplier.created_at).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
