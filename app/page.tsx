import { siteName } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8 font-sans">
      <section className="max-w-xl space-y-3 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-slate-500">
          HARNESS READY
        </p>
        <h1 className="text-4xl font-semibold text-slate-900">{siteName}</h1>
        <p className="text-slate-600">Phase 0 개발·검증 하네스</p>
      </section>
    </main>
  );
}
