import type { Finding } from "@/types/finding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          No hay hallazgos registrados aún.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {findings.map((f) => (
        <Card key={f.id}>
          {f.photo_url && (
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.photo_url}
                alt={f.product}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardHeader className={f.photo_url ? "pt-3" : ""}>
            <CardTitle className="text-base">{f.product}</CardTitle>
            <CardDescription>{f.company}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {f.city && (
                <>
                  <dt className="text-muted-foreground">Ciudad</dt>
                  <dd>{f.city}</dd>
                </>
              )}
              {f.moq && (
                <>
                  <dt className="text-muted-foreground">MOQ</dt>
                  <dd>{f.moq}</dd>
                </>
              )}
              {f.quoted_price && (
                <>
                  <dt className="text-muted-foreground">Precio</dt>
                  <dd>{f.quoted_price}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Fecha</dt>
              <dd>
                {new Date(f.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </dd>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
