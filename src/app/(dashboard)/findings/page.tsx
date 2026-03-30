export const dynamic = "force-dynamic";

import { getFindings } from "@/lib/services/findings";
import { FindingForm } from "./_components/finding-form";
import { FindingsList } from "./_components/findings-list";

export default async function FindingsPage() {
  const findings = await getFindings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hallazgos de feria</h1>
      <FindingForm />
      <FindingsList findings={findings} />
    </div>
  );
}
