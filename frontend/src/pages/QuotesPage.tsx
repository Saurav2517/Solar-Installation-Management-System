import { AppShell } from '@/components/layout/AppShell';
import { loadDatabase } from '@/services/mockStore';

export function QuotesPage() {
  const db = loadDatabase();

  return (
    <AppShell title="Quotes & Auto-BOM">
      <dl className="w-fit min-w-48 rounded-lg border border-slate-200 bg-white px-5 py-4">
        <dt className="text-sm font-medium text-slate-600">Projects</dt>
        <dd className="mt-1 text-2xl font-semibold text-slate-900">{db.projects.length}</dd>
      </dl>
    </AppShell>
  );
}
