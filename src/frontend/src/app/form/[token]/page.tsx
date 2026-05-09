type FormPageProps = {
  params: Promise<{ token: string }>;
};

export default async function FormPage({ params }: FormPageProps) {
  const { token } = await params;

  return (
    <main className="material-shell flex items-center justify-center">
      <section className="material-elevated w-full max-w-xl p-6 md:p-8">
        <p className="material-chip">Secure Form</p>
        <h1 className="material-title mt-4 font-semibold">Update Your Contact Info</h1>
        <p className="material-muted mt-3 text-sm leading-7">
          You are opening a unique request link. Continue to review and update your contact details before the token expires.
        </p>

        <div className="mt-6 rounded-2xl border border-[var(--md-outline)] bg-white/85 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--md-muted)]">Token</p>
          <p className="mt-2 break-all text-sm text-[var(--md-text)]">{token}</p>
        </div>
      </section>
    </main>
  );
}
