'use client';

import { useState, useTransition, useRef } from 'react';
import { submitBusiness } from './actions';

const KINDS = [
  { value: 'restaurant', label: 'Restaurant / Food' },
  { value: 'doctor', label: 'Doctor / Clinic' },
  { value: 'hotel', label: 'Hotel / Stay' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'shop', label: 'Shop / Retail' },
  { value: 'mall', label: 'Mall / Market' },
  { value: 'service', label: 'Other Service' },
];

const CATEGORY_SLUGS = [
  'fashion', 'grocery', 'dining', 'doctors', 'hotels',
  'barbers', 'heritage', 'salons', 'malls', 'cinemas',
];

export default function SubmitForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitBusiness(formData);
      if (result.ok) {
        setSuccess(true);
        formRef.current?.reset();
      } else {
        setError(result.error ?? 'Something went wrong.');
      }
    });
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
            ✅
          </div>
          <h2 className="mt-4 text-xl font-extrabold">Request submitted!</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Thank you — our team reviews new listings and will reach out on
            your phone number before it goes live on CityBee.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 rounded-xl bg-[#FF6F00] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#E65100]"
          >
            Submit another business
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20';

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mx-auto max-w-lg space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* ── About you ─────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Your details
        </legend>
        <div>
          <label htmlFor="submitter_name" className="mb-1.5 block text-sm font-bold">
            Your name <span className="text-[#FF6F00]">*</span>
          </label>
          <input id="submitter_name" name="submitter_name" required maxLength={80} className={inputCls} placeholder="Amit Sharma" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="submitter_phone" className="mb-1.5 block text-sm font-bold">
              Phone <span className="text-[#FF6F00]">*</span>
            </label>
            <input id="submitter_phone" name="submitter_phone" required maxLength={15} className={inputCls} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label htmlFor="submitter_email" className="mb-1.5 block text-sm font-bold">
              Email
            </label>
            <input id="submitter_email" name="submitter_email" type="email" className={inputCls} placeholder="you@example.com" />
          </div>
        </div>
      </fieldset>

      {/* ── About the business ────────────────────────────────── */}
      <fieldset className="space-y-4 border-t border-stone-100 pt-5">
        <legend className="text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Business details
        </legend>
        <div>
          <label htmlFor="business_name" className="mb-1.5 block text-sm font-bold">
            Business name <span className="text-[#FF6F00]">*</span>
          </label>
          <input id="business_name" name="business_name" required maxLength={120} className={inputCls} placeholder="Royal Restaurant & Banquet" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className="mb-1.5 block text-sm font-bold">
              Type <span className="text-[#FF6F00]">*</span>
            </label>
            <select id="kind" name="kind" required defaultValue="restaurant" className={inputCls}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category_slug" className="mb-1.5 block text-sm font-bold">
              Category
            </label>
            <select id="category_slug" name="category_slug" defaultValue="" className={inputCls}>
              <option value="">— optional —</option>
              {CATEGORY_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {slug === 'dining' ? 'Food & Dining' : slug.charAt(0).toUpperCase() + slug.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tagline" className="mb-1.5 block text-sm font-bold">
            Tagline
          </label>
          <input id="tagline" name="tagline" maxLength={100} className={inputCls} placeholder="Mughlai · Awadhi · North Indian" />
        </div>
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-bold">
            Description
          </label>
          <textarea id="description" name="description" rows={3} maxLength={500} className={inputCls} placeholder="Tell customers what makes your business special…" />
        </div>
        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-bold">
            Address
          </label>
          <input id="address" name="address" maxLength={200} className={inputCls} placeholder="16B, Delhi Road, near Majhola Chauraha" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="locality" className="mb-1.5 block text-sm font-bold">
              Area / Locality
            </label>
            <input id="locality" name="locality" maxLength={80} className={inputCls} placeholder="Civil Lines" />
          </div>
          <div>
            <label htmlFor="opening_hours" className="mb-1.5 block text-sm font-bold">
              Opening hours
            </label>
            <input id="opening_hours" name="opening_hours" maxLength={80} className={inputCls} placeholder="11 AM – 11 PM" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-bold">
              Business phone
            </label>
            <input id="phone" name="phone" maxLength={15} className={inputCls} placeholder="+91 591 240 0161" />
          </div>
          <div>
            <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-bold">
              WhatsApp number
            </label>
            <input id="whatsapp" name="whatsapp" maxLength={15} className={inputCls} placeholder="+91 98765 43210" />
          </div>
        </div>
        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-bold">
            Website
          </label>
          <input id="website" name="website" type="url" className={inputCls} placeholder="https://…" />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#FF6F00] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#E65100] active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit for Review'}
      </button>

      <p className="text-center text-xs font-medium text-slate-400">
        Free listing. Our team verifies every business before it appears on CityBee.
      </p>
    </form>
  );
}
