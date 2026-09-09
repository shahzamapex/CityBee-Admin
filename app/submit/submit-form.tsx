'use client';

import { useMemo, useState, useTransition, useRef } from 'react';
import { submitBusiness } from './actions';

// ── Country codes (dropdown) ──────────────────────────────────────────
const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India', min: 10, max: 10, starts: '[6-9]' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada', min: 10, max: 10, starts: '[2-9]' },
  { code: '+44', flag: '🇬🇧', name: 'UK', min: 10, max: 10, starts: '[7-9]' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', min: 9, max: 9, starts: '[5]' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', min: 9, max: 9, starts: '[5]' },
  { code: '+61', flag: '🇦🇺', name: 'Australia', min: 9, max: 9, starts: '[4]' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan', min: 10, max: 10, starts: '[3]' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines', min: 10, max: 10, starts: '[9]' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia', min: 9, max: 10, starts: '[1]' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal', min: 10, max: 10, starts: '[9]' },
];

// ── Single category picklist (drives both category + kind) ────────────
const CATEGORIES = [
  { slug: 'dining', label: '🍕 Food & Dining', kind: 'restaurant' },
  { slug: 'doctors', label: '🩺 Doctors & Clinics', kind: 'doctor' },
  { slug: 'hotels', label: '🏨 Hotels & Stays', kind: 'hotel' },
  { slug: 'salons', label: '💄 Beauty & Salons', kind: 'salon' },
  { slug: 'barbers', label: '💈 Barbers & Grooming', kind: 'salon' },
  { slug: 'fashion', label: '👗 Fashion & Clothing', kind: 'shop' },
  { slug: 'grocery', label: '🛒 Grocery & Kirana', kind: 'shop' },
  { slug: 'malls', label: '🏬 Malls & Markets', kind: 'mall' },
  { slug: 'cinemas', label: '🎬 Cinemas', kind: 'service' },
  { slug: 'heritage', label: '🏛️ Heritage & Crafts', kind: 'service' },
];

// ── Time options for opening-hours selects ────────────────────────────
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hr12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      out.push(`${hr12}:${m === 0 ? '00' : '30'} ${ampm}`);
    }
  }
  return out;
})();

interface Errors {
  [key: string]: string | undefined;
}

export default function SubmitForm() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [country, setCountry] = useState(COUNTRIES[0]);

  function validate(form: HTMLFormElement): Errors {
    const errs: Errors = {};
    const val = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ?? '';

    // Name
    if (val('submitter_name').length < 2) errs.submitter_name = 'Please enter your name.';

    // Phone — country-aware digit validation
    const digits = val('submitter_phone').replace(/[^0-9]/g, '');
    const startDigit = country.starts.replace(/[\[\]\\-]/g, '').charAt(0);
    if (!digits) {
      errs.submitter_phone = 'Phone number is required.';
    } else if (!new RegExp(`^${country.starts}`).test(digits)) {
      errs.submitter_phone = `${country.name} mobile numbers start with ${startDigit}.`;
    } else if (digits.length < country.min || digits.length > country.max) {
      errs.submitter_phone = `${country.name} numbers are ${country.min} digits — you entered ${digits.length}.`;
    }

    // Email (optional but must be valid when present)
    const email = val('submitter_email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errs.submitter_email = 'Enter a valid email (e.g. name@gmail.com).';
    }

    // Category
    if (!val('category')) errs.category = 'Please choose a category.';

    // Business name
    if (val('business_name').length < 2) errs.business_name = 'Business name is required.';

    // Address (required)
    if (val('address').length < 6) errs.address = 'Full address is required.';

    // Hours — both or neither, close after open
    const open = val('opening_time');
    const close = val('closing_time');
    if ((open && !close) || (!open && close)) {
      errs.opening_time = 'Select both opening and closing time.';
    }

    // Website (optional, must be a URL)
    const website = val('website');
    if (website && !/^https?:\/\/.+\..+/.test(website)) {
      errs.website = 'Enter a full URL starting with https://';
    }

    return errs;
  }

  function handleSubmit(formData: FormData) {
    const errs = validate(formRef.current!);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // scroll to first error
      const first = formRef.current?.querySelector('[data-error="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    startTransition(async () => {
      const result = await submitBusiness(formData);
      if (result.ok) {
        setSuccess(true);
        formRef.current?.reset();
        setCountry(COUNTRIES[0]);
      } else {
        setErrors({ form: result.error });
      }
    });
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">✅</div>
          <h2 className="mt-4 text-xl font-extrabold">Request submitted!</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Thank you — our team will verify your business and call you before it goes live on CityBee.
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

  const inputCls = (name: string) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
      errors[name]
        ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-2 focus:ring-red-200'
        : 'border-stone-300 bg-white focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20'
    }`;

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mx-auto max-w-lg space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      {errors.form && (
        <div data-error="true" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {errors.form}
        </div>
      )}

      {/* ── Your details ─────────────────────────────────────── */}
      <fieldset className="space-y-4" data-error={!!errors.submitter_name || !!errors.submitter_phone || !!errors.submitter_email}>
        <legend className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Your details</legend>
        <div data-error={!!errors.submitter_name}>
          <label htmlFor="submitter_name" className="mb-1.5 block text-sm font-bold">
            Your name <span className="text-[#FF6F00]">*</span>
          </label>
          <input id="submitter_name" name="submitter_name" maxLength={80} className={inputCls('submitter_name')} placeholder="Amit Sharma" />
          <FieldError msg={errors.submitter_name} />
        </div>

        <div data-error={!!errors.submitter_phone}>
          <label htmlFor="submitter_phone" className="mb-1.5 block text-sm font-bold">
            Phone <span className="text-[#FF6F00]">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={country.code}
              onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0])}
              className="rounded-xl border border-stone-300 bg-white px-2 py-2.5 text-sm font-semibold outline-none focus:border-[#FF6F00]"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              id="submitter_phone"
              name="submitter_phone"
              inputMode="numeric"
              maxLength={country.max}
              className={inputCls('submitter_phone')}
              placeholder={`${country.min}-digit number`}
            />
            <input type="hidden" name="country_code" value={country.code} />
          </div>
          <FieldError msg={errors.submitter_phone} />
        </div>

        <div data-error={!!errors.submitter_email}>
          <label htmlFor="submitter_email" className="mb-1.5 block text-sm font-bold">Email</label>
          <input id="submitter_email" name="submitter_email" type="email" className={inputCls('submitter_email')} placeholder="you@gmail.com" />
          <FieldError msg={errors.submitter_email} />
        </div>
      </fieldset>

      {/* ── Business details ─────────────────────────────────── */}
      <fieldset className="space-y-4 border-t border-stone-100 pt-5" data-error={!!errors.category || !!errors.business_name || !!errors.address || !!errors.opening_time || !!errors.website}>
        <legend className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Business details</legend>

        <div data-error={!!errors.category}>
          <label htmlFor="category" className="mb-1.5 block text-sm font-bold">
            Category <span className="text-[#FF6F00]">*</span>
          </label>
          <select id="category" name="category" defaultValue="" className={inputCls('category')}>
            <option value="" disabled>Choose a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          <FieldError msg={errors.category} />
        </div>

        <div data-error={!!errors.business_name}>
          <label htmlFor="business_name" className="mb-1.5 block text-sm font-bold">
            Business name <span className="text-[#FF6F00]">*</span>
          </label>
          <input id="business_name" name="business_name" maxLength={120} className={inputCls('business_name')} placeholder="Royal Restaurant & Banquet" />
          <FieldError msg={errors.business_name} />
        </div>

        <div>
          <label htmlFor="tagline" className="mb-1.5 block text-sm font-bold">Tagline</label>
          <input id="tagline" name="tagline" maxLength={100} className={inputCls('tagline')} placeholder="Mughlai · North Indian" />
        </div>

        <div data-error={!!errors.address}>
          <label htmlFor="address" className="mb-1.5 block text-sm font-bold">
            Full address <span className="text-[#FF6F00]">*</span>
          </label>
          <input id="address" name="address" maxLength={200} className={inputCls('address')} placeholder="Shop no, street, landmark, city" />
          <FieldError msg={errors.address} />
        </div>

        <div>
          <label htmlFor="locality" className="mb-1.5 block text-sm font-bold">Area / Locality</label>
          <input id="locality" name="locality" maxLength={80} className={inputCls('locality')} placeholder="Civil Lines" />
        </div>

        {/* Opening hours — selects, not typing */}
        <div data-error={!!errors.opening_time}>
          <label className="mb-1.5 block text-sm font-bold">Opening hours</label>
          <div className="flex items-center gap-2">
            <select name="opening_time" defaultValue="" className={inputCls('opening_time')}>
              <option value="">Opens…</option>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-sm font-bold text-slate-400">to</span>
            <select name="closing_time" defaultValue="" className={inputCls('closing_time')}>
              <option value="">Closes…</option>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FieldError msg={errors.opening_time} />
        </div>

        <div data-error={!!errors.website}>
          <label htmlFor="website" className="mb-1.5 block text-sm font-bold">Website</label>
          <input id="website" name="website" type="url" className={inputCls('website')} placeholder="https://…" />
          <FieldError msg={errors.website} />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-bold">About your business</label>
          <textarea id="description" name="description" rows={3} maxLength={500} className={inputCls('description')} placeholder="What makes your business special? (optional)" />
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
        Free listing · Our team verifies every business before it goes live
      </p>
    </form>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs font-semibold text-red-500">{msg}</p>;
}
