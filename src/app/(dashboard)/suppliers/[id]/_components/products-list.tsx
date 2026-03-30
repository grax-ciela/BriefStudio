import type { SupplierProduct } from "@/types/supplier";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProductsList({ products }: { products: SupplierProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No hay productos registrados para este proveedor.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Variantes</TableHead>
            <TableHead>MOQ</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.product_name}</TableCell>
              <TableCell>{p.variants ?? "—"}</TableCell>
              <TableCell>{p.moq ?? "—"}</TableCell>
              <TableCell>{p.price ?? "—"}</TableCell>
              <TableCell className="max-w-48 truncate">
                {p.notes ?? "—"}
              </TableCell>
              <TableCell>
                {new Date(p.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
