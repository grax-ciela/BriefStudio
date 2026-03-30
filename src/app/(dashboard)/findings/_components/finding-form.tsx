"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFinding } from "../_actions";

export function FindingForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createFinding(formData);
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
      <h2 className="text-lg font-semibold">Nuevo hallazgo</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company">Empresa *</Label>
          <Input
            id="company"
            name="company"
            placeholder="Nombre del proveedor"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" name="city" placeholder="Ciudad de la feria" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product">Producto *</Label>
          <Input
            id="product"
            name="product"
            placeholder="Descripción del producto"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="moq">MOQ</Label>
          <Input id="moq" name="moq" placeholder="Ej: 500 pcs" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quoted_price">Precio cotizado</Label>
          <Input
            id="quoted_price"
            name="quoted_price"
            placeholder="Ej: $2.50 USD"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="photo">Foto del producto</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className="h-auto py-1.5"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar hallazgo"}
      </Button>
    </form>
  );
}
