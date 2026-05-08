export default function FormDonePage() {
  return (
    <main className="material-shell flex items-center justify-center">
      <section className="material-elevated w-full max-w-md px-6 py-8 text-center md:px-8">
        <div className="mx-auto h-14 w-14 rounded-full bg-[var(--md-primary-container)] p-3 text-[var(--md-primary)]">
          <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="material-title mt-4 font-semibold">Thanks, You Are All Set</h1>
        <p className="material-muted mt-3 text-sm leading-7">Your updated contact information was securely submitted to ContactSwap.</p>
      </section>
    </main>
  );
}

