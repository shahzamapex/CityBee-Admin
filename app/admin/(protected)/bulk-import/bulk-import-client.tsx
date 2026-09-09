'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { queueBulkImport } from './actions';
import { pollJobs } from './poll';

interface JobView {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  payloadCount: number;
  results: { name: string; ok: boolean; status: string; slug?: string; error?: string }[];
  summary: { total: number; created: number; reused: number; failed: number } | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

const SAMPLE_JSON = `[
  {
    "name": "Bismillah Biryani Corner",
    "kind": "restaurant",
    "tagline": "Biryani · Kebab · Rolls",
    "description": "Charcoal-grilled biryani since 1985.",
    "phone": "+915912401999",
    "whatsapp": "919812345678",
    "address": "Peeli Batti Chowk, Budh Bazaar, Moradabad",
    "locality": "Budh Bazaar",
    "latitude": 28.8291,
    "longitude": 78.7712,
    "imageUrls": ["https://example.com/photo1.jpg"],
    "googlePlaceId": null
  },
  {
    "name": "Dr. Rehma Skin Clinic",
    "kind": "doctor",
    "specialization": "Dermatologist",
    "qualification": "MBBS, MD (Dermatology)",
    "experienceYears": 9,
    "consultationFee": "₹400",
    "address": "2nd Floor, Harvard Tower, Court Road, Moradabad"
  }
]`;

/**
 * Bulk import UI: paste JSON → queued job → sequential processing with
 * live per-record results. Multiple pastes queue up and run one-by-one.
 */
export default function BulkImportClient({
  initialJobs,
  adminName,
}: {
  initialJobs: JobView[];
  adminName: string;
}) {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobView[]>(initialJobs);
  const [submitting, startSubmit] = useTransition();

  // Poll while any job is queued/running.
  const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  const poll = useCallback(async () => {
    try {
      const fresh = await pollJobs();
      setJobs(fresh as JobView[]);
    } catch {
      // polling failures are transient
    }
  }, []);

  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [hasActive, poll]);

  function submit() {
    setError(null);
    startSubmit(async () => {
      const result = await queueBulkImport(json);
      if (result.ok) {
        setJson(''); // ready for the next paste → queues behind
        await poll();
      } else {
        setError(result.error ?? 'Could not queue the job.');
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 py-4">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-ink">Bulk Import</h1>
        <p className="mt-0.5 font-body text-sm text-ink-soft">
          Paste a JSON array of businesses — jobs run one at a time in order, with live results.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Paste panel ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-headline text-base font-semibold text-ink">Paste JSON</h3>
            <button
              type="button"
              onClick={() => setJson(SAMPLE_JSON)}
              className="rounded-lg border border-border-strong px-3 py-1 font-body text-xs font-semibold text-ink-soft transition hover:bg-subtle"
            >
              Insert sample
            </button>
          </div>
          <textarea
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              if (error) setError(null);
            }}
            rows={14}
            spellCheck={false}
            placeholder={`[\n  { "name": "…", "kind": "restaurant", … }\n]`}
            className="w-full rounded-lg border border-border-strong bg-canvas p-3.5 font-mono text-xs leading-rel5 text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          />
          {error && (
            <p className="mt-2 rounded-lg border border-rose/25 bg-rose/10 px-3 py-2 font-body text-xs font-semibold text-rose">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="font-body text-xs text-ink-muted">
              Max 200 per job · runs in chunks of 25 · images fetched automatically
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !json.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Queueing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">playlist_add</span>
                  Add to Queue
                </>
              )}
            </button>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-subtle px-3 py-2.5">
            <span className="material-symbols-outlined mt-0.5 text-[16px] text-brand">info</span>
            <p className="font-body text-xs text-ink-soft">
              Each job calls <b>POST /api/businesses/bulk</b> with your admin session
              {adminName ? ` (${adminName})` : ''}. Duplicate businesses (same
              googlePlaceId/slug) are reused, not duplicated.
            </p>
          </div>
        </div>

        {/* ── Jobs panel ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-headline text-base font-semibold text-ink">Import Queue</h3>
            {hasActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-1 font-body text-[11px] font-semibold text-amber">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
                {jobs.filter((j) => j.status === 'running').length} running ·{' '}
                {jobs.filter((j) => j.status === 'queued').length} waiting
              </span>
            )}
          </div>

          {jobs.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border-strong font-body text-sm text-ink-muted">
              No jobs yet — paste JSON and queue your first import
            </div>
          )}

          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobView }) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = job.status === 'running';
  const isQueued = job.status === 'queued';
  const isDone = job.status === 'done';
  const isFailed = job.status === 'failed';
  const failures = job.results.filter((r) => r.status === 'failed').length;

  return (
    <div className="rounded-lg border border-border-subtle bg-canvas/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Status icon */}
          {isQueued && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-subtle">
              <span className="material-symbols-outlined text-[16px] text-ink-muted">schedule</span>
            </span>
          )}
          {isRunning && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-soft border-t-brand" />
            </span>
          )}
          {isDone && failures === 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald/10">
              <span className="material-symbols-outlined text-[16px] text-emerald">check</span>
            </span>
          )}
          {isDone && failures > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber/10">
              <span className="material-symbols-outlined text-[16px] text-amber">warning</span>
            </span>
          )}
          {isFailed && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/10">
              <span className="material-symbols-outlined text-[16px] text-rose">error</span>
            </span>
          )}

          <div className="flex flex-col">
            <span className="font-body text-sm font-semibold text-ink">
              {job.payloadCount} businesses
              <span className="ml-1.5 font-mono text-[10px] text-ink-muted">{job.id}</span>
            </span>
            <span className="font-body text-[11px] text-ink-muted">
              {new Date(job.createdAt).toLocaleTimeString()} · {job.status}
            </span>
          </div>
        </div>

        {/* Summary / live progress */}
        {job.summary ? (
          <div className="flex items-center gap-2">
            <Pill tone="emerald" label={`${job.summary.created} added`} icon="add_circle" />
            {job.summary.reused > 0 && <Pill tone="slate" label={`${job.summary.reused} reused`} icon="cached" />}
            {job.summary.failed > 0 && <Pill tone="rose" label={`${job.summary.failed} failed`} icon="cancel" />}
          </div>
        ) : (
          <span className="font-body text-xs text-ink-muted">
            {isRunning ? `${job.results.length}/${job.payloadCount} done…` : isQueued ? 'waiting' : ''}
          </span>
        )}
      </div>

      {job.error && (
        <p className="mt-2 rounded-lg border border-rose/25 bg-rose/10 px-3 py-2 font-body text-xs font-semibold text-rose">
          {job.error}
        </p>
      )}

      {/* Expandable per-record results */}
      {job.results.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="font-body text-xs font-semibold text-brand transition hover:underline"
          >
            {expanded ? 'Hide' : 'Show'} per-record results ({job.results.length})
          </button>
          {expanded && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border-subtle bg-white p-2">
              {job.results.map((r, i) => (
                <li key={i} className="flex items-center gap-2 px-2 py-1 font-body text-xs">
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      r.status === 'created' ? 'text-emerald' : r.status === 'failed' ? 'text-rose' : 'text-ink-muted'
                    }`}
                  >
                    {r.status === 'created' ? 'check_circle' : r.status === 'failed' ? 'cancel' : 'cached'}
                  </span>
                  <span className="truncate font-semibold text-ink">{r.name}</span>
                  {r.slug && <span className="font-mono text-[10px] text-ink-muted">{r.slug}</span>}
                  {r.error && <span className="truncate text-rose">{r.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({
  tone,
  label,
  icon,
}: {
  tone: 'emerald' | 'rose' | 'slate';
  label: string;
  icon: string;
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald/10 text-emerald'
      : tone === 'rose'
        ? 'bg-rose/10 text-rose'
        : 'bg-subtle text-ink-soft';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${cls}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      {label}
    </span>
  );
}
