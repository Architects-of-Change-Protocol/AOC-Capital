export default function TrialInactivePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Trial inactive
        </h1>

        <p className="mt-4 text-neutral-600">
          Your PMFreak workspace trial or subscription is currently inactive.
        </p>

        <a
          href="/pricing"
          className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-white"
        >
          View plans
        </a>
      </div>
    </main>
  );
}
