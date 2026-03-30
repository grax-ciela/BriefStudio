"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/types/product";
import { updateProduct } from "../../_actions";

interface SupplierOption {
  id: string;
  company_name: string;
}

export function ProductDetailForm({
  product,
  suppliers,
}: {
  product: Product;
  suppliers: SupplierOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(product.supplier_id ?? "");

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    if (supplierId) {
      formData.set("supplier_id", supplierId);
    }

    startTransition(async () => {
      const result = await updateProduct(product.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <h2 className="text-lg font-semibold">Ficha técnica</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Producto *</Label>
          <Input id="name" name="name" defaultValue={product.name} required />
        </div>

        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <Select
            value={supplierId}
            onValueChange={(v) => setSupplierId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar proveedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="materials">Materiales</Label>
          <Input
            id="materials"
            name="materials"
            defaultValue={product.materials ?? ""}
            placeholder="Ej: Bambú, algodón"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dimensions">Dimensiones</Label>
          <Input
            id="dimensions"
            name="dimensions"
            defaultValue={product.dimensions ?? ""}
            placeholder="Ej: 20x10x5 cm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="variants">Variantes</Label>
          <Input
            id="variants"
            name="variants"
            defaultValue={product.variants ?? ""}
            placeholder="Colores, tamaños"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="packaging">Packaging</Label>
          <Input
            id="packaging"
            name="packaging"
            defaultValue={product.packaging ?? ""}
            placeholder="Ej: Caja individual"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="moq">MOQ</Label>
          <Input
            id="moq"
            name="moq"
            defaultValue={product.moq ?? ""}
            placeholder="Ej: 500 pcs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            name="cost"
            defaultValue={product.cost ?? ""}
            placeholder="Ej: $2.50 USD"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={product.notes ?? ""}
            rows={3}
            className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            placeholder="Notas adicionales..."
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-green-600">Guardado correctamente.</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
