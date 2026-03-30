"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplierProduct } from "../../_actions";

export function ProductForm({ supplierId }: { supplierId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createSupplierProduct(supplierId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <h3 className="font-semibold">Agregar producto</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="product_name">Producto *</Label>
          <Input
            id="product_name"
            name="product_name"
            placeholder="Nombre del producto"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="variants">Variantes</Label>
          <Input
            id="variants"
            name="variants"
            placeholder="Colores, tamaños, etc."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="moq">MOQ</Label>
          <Input id="moq" name="moq" placeholder="Ej: 500 pcs" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">Precio</Label>
          <Input id="price" name="price" placeholder="Ej: $2.50 USD" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="product_notes">Notas</Label>
          <Input
            id="product_notes"
            name="notes"
            placeholder="Notas del producto"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Agregando..." : "Agregar producto"}
      </Button>
    </form>
  );
}
