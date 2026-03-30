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
import { createSupplier } from "../_actions";

const RELATIONSHIP_STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Activo" },
  { value: "on_hold", label: "En espera" },
  { value: "discarded", label: "Descartado" },
] as const;

export function NewSupplierModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");

  function handleSubmit(formData: FormData) {
    setError(null);

    if (status) {
      formData.set("relationship_status", status);
    }

    startTransition(async () => {
      const result = await createSupplier(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setStatus("");
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
          setStatus("");
        }
      }}
    >
      <DialogTrigger render={<Button>Nuevo proveedor</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo proveedor.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Empresa *</Label>
            <Input
              id="company_name"
              name="company_name"
              placeholder="Nombre de la empresa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              name="country"
              placeholder="País de origen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              name="city"
              placeholder="Ciudad"
            />
          </div>

          <div className="space-y-2">
            <Label>Estado de relación</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
