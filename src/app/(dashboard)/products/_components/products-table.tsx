import type { Product } from "@/types/product";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No hay fichas técnicas registradas.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea una nueva ficha técnica para comenzar.
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
            <TableHead>Proveedor</TableHead>
            <TableHead>Materiales</TableHead>
            <TableHead>Dimensiones</TableHead>
            <TableHead>MOQ</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/products/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
              </TableCell>
              <TableCell>
                {p.supplier_id ? (
                  <Link
                    href={`/suppliers/${p.supplier_id}`}
                    className="hover:underline"
                  >
                    {p.supplier_name ?? "—"}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="max-w-32 truncate">
                {p.materials ?? "—"}
              </TableCell>
              <TableCell>{p.dimensions ?? "—"}</TableCell>
              <TableCell>{p.moq ?? "—"}</TableCell>
              <TableCell>{p.cost ?? "—"}</TableCell>
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
