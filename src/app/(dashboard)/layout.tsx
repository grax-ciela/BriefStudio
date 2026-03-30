export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <nav className="w-56 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Menu
        </h2>
        <ul className="space-y-1">
          <li>
            <a
              href="/suppliers"
              className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Suppliers
            </a>
          </li>
          <li>
            <a
              href="/products"
              className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Fichas técnicas
            </a>
          </li>
          <li>
            <a
              href="/findings"
              className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Hallazgos de feria
            </a>
          </li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
