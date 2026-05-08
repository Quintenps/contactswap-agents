import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="material-shell">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="material-panel px-6 py-8 md:px-10 md:py-12">
          <span className="material-chip">Material Refresh</span>
          <h1 className="material-title mt-5 font-semibold">Contact workflows that feel clear, modern, and alive.</h1>
          <p className="material-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
            ContactSwap helps teams request updates and rebuild accurate vCards with less back-and-forth. The dashboard now uses a cleaner,
            Material-inspired rhythm: elevated cards, stronger hierarchy, and softer surfaces.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/config" className="material-button material-button-primary">
              Open Admin Workspace
            </Link>
            <Link href="/form/demo" className="material-button material-button-secondary">
              Preview Public Form
            </Link>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="material-elevated p-5">
            <h2 className="text-lg font-semibold text-[var(--md-text)]">Better Information Density</h2>
            <p className="material-muted mt-2 text-sm leading-6">
              Tables and actions are separated into clear surfaces so scanning forms and statuses takes less effort.
            </p>
          </div>
          <div className="material-elevated p-5">
            <h2 className="text-lg font-semibold text-[var(--md-text)]">Consistent Input Language</h2>
            <p className="material-muted mt-2 text-sm leading-6">
              Inputs, chips, and buttons now share one visual grammar for both admin and recipient experiences.
            </p>
          </div>
          <div className="material-elevated p-5">
            <h2 className="text-lg font-semibold text-[var(--md-text)]">Mobile-First Spacing</h2>
            <p className="material-muted mt-2 text-sm leading-6">Surfaces collapse elegantly on smaller screens without losing hierarchy.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

