import Link from 'next/link';

export default function TemplatesPage() {
  return (
    <main className="material-shell">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="material-panel p-6 md:p-8">
          <p className="material-chip">Templates</p>
          <h1 className="material-title mt-4 font-semibold">Template Management</h1>
          <p className="material-muted mt-3 max-w-2xl text-sm leading-7">
            Create reusable field sets for different contact workflows, such as quick updates, onboarding requests, or detailed profile refreshes.
          </p>
        </header>

        <article className="material-elevated p-6">
          <h2 className="text-lg font-semibold text-[var(--md-text)]">Coming Next</h2>
          <p className="material-muted mt-2 text-sm leading-7">
            This area is reserved for richer template authoring. Use the create form flow to pick from current templates while this management view is expanded.
          </p>
          <Link href="/config" className="material-button material-button-secondary mt-5">
            Back To Config
          </Link>
        </article>
      </section>
    </main>
  );
}

