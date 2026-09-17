import { useEffect, useState } from "react";
import { fetchBackendHealth } from "./api/health.ts";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; service: string; timestamp: string }
  | { status: "error"; message: string };

export default function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchBackendHealth()
      .then((result) => {
        if (!cancelled) {
          setHealth({
            status: "ok",
            service: result.service,
            timestamp: result.timestamp,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to reach backend";
          setHealth({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              GeM
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Bid Compliance Verification Platform
            </h1>
          </div>
          <BackendStatus health={health} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Phase 1</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Project setup is ready
          </h2>
          <p className="mt-4 max-w-2xl text-slate-600">
            This application shell confirms that the React frontend can start and
            communicate with the Express backend. Authentication, tenders, and
            verification workflows will be added in later phases.
          </p>
        </section>
      </main>
    </div>
  );
}

function BackendStatus({ health }: { health: HealthState }) {
  if (health.status === "loading") {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
        Checking backend...
      </span>
    );
  }

  if (health.status === "error") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">
        Backend unavailable
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
      Backend {health.status}
    </span>
  );
}
