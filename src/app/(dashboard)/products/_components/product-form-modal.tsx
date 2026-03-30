"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct } from "../_actions";

interface SupplierOption {
  id: string;
  company_name: string;
}

export function ProductFormModal({
  suppliers,
}: {
  suppliers: SupplierOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState<string>("");

  function handleSubmit(formData: FormData) {
    setError(null);
    if (supplierId) {
      formData.set("supplier_id", supplierId);
    }

    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setSupplierId("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setError(null);
          setSupplierId("");
        }
      }}
    >
      <DialogTrigger render={<Button>Nueva ficha técnica</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva ficha técnica</DialogTitle>
          <DialogDescription>
            Registra los datos técnicos del producto.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Producto *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nombre del producto"
                required
              />
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
                placeholder="Ej: Bambú, algodón"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dimensions">Dimensiones</Label>
              <Input
                id="dimensions"
                name="dimensions"
                placeholder="Ej: 20x10x5 cm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="variants">Variantes</Label>
              <Input
                id="variants"
                name="variants"
                placeholder="Colores, tamaños"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="packaging">Packaging</Label>
              <Input
                id="packaging"
                name="packaging"
                placeholder="Ej: Caja individual"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moq">MOQ</Label>
              <Input id="moq" name="moq" placeholder="Ej: 500 pcs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost">Costo</Label>
              <Input id="cost" name="cost" placeholder="Ej: $2.50 USD" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              placeholder="Notas adicionales..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
