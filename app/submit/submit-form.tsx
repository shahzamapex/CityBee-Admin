'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { submitBusiness } from './actions';
import { getUploadSignature } from './upload-actions';
import { getCategories, type DbCategory } from './category-actions';
import CityAutocomplete, { type SelectedCity } from './city-autocomplete';
import AddressAutocomplete, { type SelectedAddress } from './address-autocomplete';
import LocationPicker, { type PinnedLocation } from './location-picker';
import Combobox from './combobox';
import { getSuggestions, type FieldSuggestions } from './suggestion-actions';

// ── Country codes (dropdown) ──────────────────────────────────────────
const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India', min: 10, max: 10, starts: '[6-9]' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada', min: 10, max: 10, starts: '[2-9]' },
  { code: '+44', flag: '🇬🇧', name: 'UK', min: 10, max: 10, starts: '[7-9]' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', min: 9, max: 9, starts: '[5]' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', min: 9, max: 9, starts: '[5]' },
  { code: '+61', flag: '🇦🇺', name: 'Australia', min: 9, max: 9, starts: '[4]' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan', min: 10, max: 10, starts: '[3]' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal', min: 10, max: 10, starts: '[9]' },
];

/**
 * Category slug → business kind + emoji + dynamic-fields profile.
 * Slugs/options come from the DB; unknown slugs fall back to generic.
 */
const CATEGORY_META: Record<
  string,
  { kind: string; kindLabel: string; emoji: string; dynamic: 'doctor' | 'restaurant' | 'hotel' | null }
> = {
  doctors: { kind: 'doctor', kindLabel: 'Doctor', emoji: '🩺', dynamic: 'doctor' },
  dining: { kind: 'restaurant', kindLabel: 'Restaurant', emoji: '🍕', dynamic: 'restaurant' },
  hotels: { kind: 'hotel', kindLabel: 'Hotel', emoji: '🏨', dynamic: 'hotel' },
  salons: { kind: 'salon', kindLabel: 'Salon', emoji: '💄', dynamic: null },
  barbers: { kind: 'salon', kindLabel: 'Barber', emoji: '💈', dynamic: null },
  fashion: { kind: 'shop', kindLabel: 'Shop', emoji: '👗', dynamic: null },
  grocery: { kind: 'shop', kindLabel: 'Grocery', emoji: '🛒', dynamic: null },
  malls: { kind: 'mall', kindLabel: 'Mall', emoji: '🏬', dynamic: null },
  cinemas: { kind: 'service', kindLabel: 'Service', emoji: '🎬', dynamic: null },
  heritage: { kind: 'shop', kindLabel: 'Shop', emoji: '🏛️', dynamic: null },
};

// ── Opening-hours select options ──────────────────────────────────────
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

const HOTEL_AMENITIES = [
  'Wi-Fi', 'Parking', 'Restaurant', 'Room Service', 'Banquet Hall',
  'Swimming Pool', 'Gym', 'AC Rooms', 'Travel Desk', 'Café',
];

const VEG_TYPES = [
  { value: 'veg', label: 'Pure Veg' },
  { value: 'non_veg', label: 'Non-Veg' },
  { value: 'mixed', label: 'Both (Mixed)' },
];

const HOTEL_TYPES = ['Budget', '2-Star', '3-Star', '4-Star', '5-Star', 'Boutique', 'Resort', 'Guest House'];

const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 5;

interface UploadedImage {
  url: string;
  publicId: string;
}

/** All form text/option values — controlled so validation errors NEVER wipe them. */
interface FormValues {
  submitter_name: string;
  submitter_phone: string;
  submitter_email: string;
  whatsapp: string;
  business_name: string;
  tagline: string;
  address: string;
  locality: string;
  website: string;
  description: string;
  opening_time: string;
  closing_time: string;
  // dynamic
  specialization: string;
  qualification: string;
  experience_years: string;
  consultation_fee: string;
  cuisine: string;
  price_range: string;
  veg_type: string;
  hotel_type: string;
  check_in_time: string;
  check_out_time: string;
}

const EMPTY_VALUES: FormValues = {
  submitter_name: '',
  submitter_phone: '',
  submitter_email: '',
  whatsapp: '',
  business_name: '',
  tagline: '',
  address: '',
  locality: '',
  website: '',
  description: '',
  opening_time: '',
  closing_time: '',
  specialization: '',
  qualification: '',
  experience_years: '',
  consultation_fee: '',
  cuisine: '',
  price_range: '',
  veg_type: 'mixed',
  hotel_type: '',
  check_in_time: '',
  check_out_time: '',
};

interface Errors {
  [key: string]: string | undefined;
}

const STEPS = [
  { n: 1, title: 'Category & Contact', hint: 'Who is listing this business' },
  { n: 2, title: 'Business Details', hint: 'Tell us about the business' },
  { n: 3, title: 'Photos & Submit', hint: 'Add photos and review' },
];

export default function SubmitForm() {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [pin, setPin] = useState<PinnedLocation | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [suggestions, setSuggestions] = useState<FieldSuggestions>({
    specializations: [],
    qualifications: [],
    localities: [],
    cuisines: [],
    taglines: [],
  });
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Categories + combobox suggestions load live from the database.
  useEffect(() => {
    getCategories().then(setDbCategories).catch(() => setDbCategories([]));
    getSuggestions().then(setSuggestions).catch(() => undefined);
  }, []);

  const meta = CATEGORY_META[category];
  const dynamicFields = meta?.dynamic ?? null;

  // Dropdown shows the KIND value; the selected slug is what gets saved.
  const categoryLabel = (slug: string): string => {
    const meta = CATEGORY_META[slug];
    const emoji = meta?.emoji ?? '🗂️';
    const cat = dbCategories.find((c) => c.slug === slug);
    return `${emoji} ${meta?.kindLabel ?? cat?.name ?? slug}`;
  };

  // Controlled field setter — data survives failed submits.
  function set<K extends keyof FormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // clear the field's error as soon as the user edits it
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  // ── Image upload (direct to Cloudinary, signed server-side) ─────────
  async function handleFiles(files: FileList | null) {
    setUploadError(null);
    if (!files || files.length === 0) return;

    const room = MAX_IMAGES - images.length;
    const selected = Array.from(files).slice(0, room);
    if (selected.length === 0) {
      setUploadError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files (JPG, PNG, WebP) are allowed.');
        continue;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setUploadError(`Each image must be under ${MAX_IMAGE_MB}MB.`);
        continue;
      }
    }

    setUploading(true);
    try {
      const sign = await getUploadSignature();
      if (!sign.ok) throw new Error(sign.error);

      const uploaded: UploadedImage[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sign.apiKey!);
        form.append('timestamp', String(sign.timestamp));
        form.append('signature', sign.signature!);
        form.append('folder', sign.folder!);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        uploaded.push({ url: json.secure_url, publicId: json.public_id });
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  // ── Step validation (only the fields of the current step) ───────────
  function validateStep(current: number): Errors {
    const errs: Errors = {};
    const v = values;

    if (current === 1) {
      if (v.submitter_name.trim().length < 2) errs.submitter_name = 'Please enter your name.';
      const digits = v.submitter_phone.replace(/[^0-9]/g, '');
      const startDigit = country.starts.replace(/[\[\]\\-]/g, '').charAt(0);
      if (!digits) {
        errs.submitter_phone = 'Phone number is required.';
      } else if (!new RegExp(`^${country.starts}`).test(digits)) {
        errs.submitter_phone = `${country.name} mobile numbers start with ${startDigit}.`;
      } else if (digits.length < country.min || digits.length > country.max) {
        errs.submitter_phone = `${country.name} numbers are ${country.min} digits — you entered ${digits.length}.`;
      }
      if (v.submitter_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.submitter_email.trim())) {
        errs.submitter_email = 'Enter a valid email (e.g. name@gmail.com).';
      }
      if (!category) errs.category = 'Please select a category.';
    }

    if (current === 2) {
      if (v.business_name.trim().length < 2) errs.business_name = 'Business name is required.';
      if (v.address.trim().length < 6) errs.address = 'Full address is required.';
      if (!city) errs.city = 'Please select your city from the list.';
      if ((v.opening_time && !v.closing_time) || (!v.opening_time && v.closing_time)) {
        errs.opening_time = 'Select both opening and closing time.';
      }
      if (v.website.trim() && !/^https?:\/\/.+\..+/.test(v.website.trim())) {
        errs.website = 'Enter a full URL starting with https://';
      }
      if (category === 'doctors' && v.specialization.trim().length < 2) {
        errs.specialization = 'Specialization is required (e.g. Dentist).';
      }
      if (category === 'hotels' && v.hotel_type.length < 2) {
        errs.hotel_type = 'Hotel type is required.';
      }
    }

    return errs;
  }

  function nextStep() {
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      formRef.current?.querySelector<HTMLElement>('[data-error="true"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit() {
    // Validate ALL steps before submitting (data is preserved on failure).
    const allErrors = { ...validateStep(1), ...validateStep(2) };
    setErrors(allErrors);
    const failedStep = Object.keys(allErrors).some(Boolean)
      ? ['category', 'submitter_name', 'submitter_phone', 'submitter_email'].some((k) => allErrors[k])
        ? 1
        : 2
      : 0;
    if (failedStep) {
      setStep(failedStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Build the FormData from the preserved values — NOT from the DOM,
    // so nothing can be lost.
    const formData = new FormData();
    formData.set('submitter_name', values.submitter_name.trim());
    formData.set('submitter_phone', values.submitter_phone.trim());
    formData.set('submitter_email', values.submitter_email.trim());
    formData.set('country_code', country.code);
    formData.set('whatsapp', values.whatsapp.trim());
    formData.set('category', category);
    formData.set('kind', CATEGORY_META[category]?.kind ?? 'service');
    formData.set('business_name', values.business_name.trim());
    formData.set('tagline', values.tagline.trim());
    formData.set('address', (address?.address ?? values.address).trim());
    formData.set('address_json', JSON.stringify({
      ...(address ?? {}),
      // Map pin takes priority for coordinates (user fine-tuned it).
      lat: pin?.lat ?? address?.lat ?? null,
      lng: pin?.lng ?? address?.lng ?? null,
    }));
    formData.set('locality', values.locality.trim());
    formData.set('website', values.website.trim());
    formData.set('description', values.description.trim());
    formData.set('opening_time', values.opening_time);
    formData.set('closing_time', values.closing_time);
    formData.set('images_json', JSON.stringify(images));
    formData.set('city_json', JSON.stringify(city));
    // Dynamic fields
    formData.set('specialization', values.specialization.trim());
    formData.set('qualification', values.qualification.trim());
    formData.set('experience_years', values.experience_years.trim());
    formData.set('consultation_fee', values.consultation_fee.trim());
    formData.set('cuisine', values.cuisine.trim());
    formData.set('price_range', values.price_range);
    formData.set('veg_type', values.veg_type);
    formData.set('hotel_type', values.hotel_type);
    formData.set('check_in_time', values.check_in_time);
    formData.set('check_out_time', values.check_out_time);
    for (const a of amenities) formData.append('amenities', a);

    startTransition(async () => {
      const result = await submitBusiness(formData);
      if (result.ok) {
        setSuccess(true);
        // Only clear everything AFTER a successful submission.
        setValues(EMPTY_VALUES);
        setCategory('');
        setCountry(COUNTRIES[0]);
        setImages([]);
        setCity(null);
        setAddress(null);
        setPin(null);
        setAmenities([]);
        setErrors({});
        setStep(1);
      } else {
        setErrors({ form: result.error });
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald/25 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10 text-3xl">✅</div>
        <h2 className="mt-5 font-headline text-2xl font-bold tracking-tight text-ink">Request submitted!</h2>
        <p className="mx-auto mt-2 max-w-md font-body text-sm text-ink-soft">
          Thank you — our team will verify your business and call you before it goes live on CityBee.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-7 rounded-lg bg-brand px-6 py-2.5 font-body text-sm font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-hover"
        >
          Submit another business
        </button>
      </div>
    );
  }

  const inputCls = (name: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted ${
      errors[name]
        ? 'border-rose/40 bg-rose/5 focus:border-rose focus:ring-2 focus:ring-rose/15'
        : 'border-border-strong bg-white focus:border-brand focus:ring-2 focus:ring-brand/15'
    }`;

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm sm:p-8">
      {/* ── Stepper ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full font-headline text-sm font-bold transition-all ${
                      done
                        ? 'bg-emerald text-white'
                        : active
                          ? 'bg-brand text-white ring-4 ring-brand/15'
                          : 'bg-subtle text-ink-muted'
                    }`}
                  >
                    {done ? (
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    ) : (
                      s.n
                    )}
                  </div>
                  <span
                    className={`mt-1.5 hidden whitespace-nowrap font-body text-[11px] font-semibold sm:block ${
                      active ? 'text-brand' : 'text-ink-muted'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 rounded-full sm:w-14 ${
                      step > s.n ? 'bg-emerald' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 sm:hidden">
          <span className="font-body text-sm font-semibold text-ink">
            Step {step} of 3 — {STEPS[step - 1].title}
          </span>
        </div>
      </div>

      {errors.form && (
        <div className="mb-4 rounded-lg border border-rose/25 bg-rose/10 px-4 py-2.5 font-body text-sm font-semibold text-rose">
          {errors.form}
        </div>
      )}

      <form
        ref={formRef}
        noValidate
        onKeyDown={(e) => {
          // Enter in a text input moves to the next step (or submits on the
          // final step) — never a mid-wizard accidental submit.
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (step < 3) nextStep();
            else handleSubmit();
          }
        }}
      >
        {/* ════════════ STEP 1: Category + Contact ════════════ */}
        {step === 1 && (
          <section className="space-y-4" data-error={!!(errors.category || errors.submitter_name || errors.submitter_phone || errors.submitter_email)}>
            <SectionHeader title="What are you listing?" hint="Pick a category and tell us who you are" />

            <div data-error={!!errors.category}>
              <label htmlFor="category_select" className="mb-1.5 block font-body text-sm font-semibold text-ink">
                Category <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-muted">
                  {category ? CATEGORY_META[category]?.emoji ?? '🗂️' : 'category'}
                </span>
                <select
                  id="category_select"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  disabled={dbCategories.length === 0}
                  className={`w-full appearance-none rounded-lg border bg-white py-2.5 pl-11 pr-10 font-body text-sm outline-none transition ${
                    errors.category
                      ? 'border-rose/40 bg-rose/5 focus:border-rose focus:ring-2 focus:ring-rose/15'
                      : 'border-border-strong focus:border-brand focus:ring-2 focus:ring-brand/15'
                  } ${category ? 'font-semibold text-ink' : 'text-ink-muted'}`}
                >
                  <option value="" disabled>
                    {dbCategories.length === 0 ? 'Loading categories…' : 'Select a category…'}
                  </option>
                  {dbCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {categoryLabel(c.slug)}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-muted">
                  expand_more
                </span>
              </div>
              {category && (
                <p className="mt-1.5 flex items-center gap-1.5 font-body text-xs font-semibold text-emerald">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  {categoryLabel(category)} selected
                </p>
              )}
              <FieldError msg={errors.category} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div data-error={!!errors.submitter_name}>
                <label htmlFor="submitter_name" className="mb-1.5 block font-body text-sm font-semibold text-ink">
                  Your name <span className="text-brand">*</span>
                </label>
                <input
                  id="submitter_name"
                  value={values.submitter_name}
                  onChange={(e) => set('submitter_name', e.target.value)}
                  maxLength={80}
                  className={inputCls('submitter_name')}
                  placeholder="Amit Sharma"
                />
                <FieldError msg={errors.submitter_name} />
              </div>

              <div data-error={!!errors.submitter_phone}>
                <label htmlFor="submitter_phone" className="mb-1.5 block font-body text-sm font-semibold text-ink">
                  Phone <span className="text-brand">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={country.code}
                    onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0])}
                    className="rounded-lg border border-border-strong bg-white px-2 py-2.5 font-body text-sm font-semibold outline-none focus:border-brand"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    id="submitter_phone"
                    value={values.submitter_phone}
                    onChange={(e) => set('submitter_phone', e.target.value)}
                    inputMode="numeric"
                    maxLength={country.max}
                    className={inputCls('submitter_phone')}
                    placeholder={`${country.min}-digit number`}
                  />
                </div>
                <FieldError msg={errors.submitter_phone} />
              </div>

              <div data-error={!!errors.submitter_email}>
                <label htmlFor="submitter_email" className="mb-1.5 block font-body text-sm font-semibold text-ink">Email</label>
                <input
                  id="submitter_email"
                  value={values.submitter_email}
                  onChange={(e) => set('submitter_email', e.target.value)}
                  type="email"
                  className={inputCls('submitter_email')}
                  placeholder="you@gmail.com"
                />
                <FieldError msg={errors.submitter_email} />
              </div>

              <div>
                <label htmlFor="whatsapp" className="mb-1.5 block font-body text-sm font-semibold text-ink">WhatsApp number</label>
                <input
                  id="whatsapp"
                  value={values.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  maxLength={15}
                  className={inputCls('whatsapp')}
                  placeholder={`${country.code} …`}
                />
              </div>
            </div>
          </section>
        )}

        {/* ════════════ STEP 2: Business details ════════════ */}
        {step === 2 && (
          <section className="space-y-4" data-error={!!(errors.business_name || errors.address || errors.city || errors.opening_time || errors.website || errors.specialization || errors.hotel_type)}>
            <SectionHeader
              title="Business details"
              hint={category ? categoryLabel(category).replace(/^\S+\s/, '') : 'About the business'}
            />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div data-error={!!errors.business_name}>
                <label htmlFor="business_name" className="mb-1.5 block font-body text-sm font-semibold text-ink">
                  Business name <span className="text-brand">*</span>
                </label>
                <input
                  id="business_name"
                  value={values.business_name}
                  onChange={(e) => set('business_name', e.target.value)}
                  maxLength={120}
                  className={inputCls('business_name')}
                  placeholder="Royal Restaurant & Banquet"
                />
                <FieldError msg={errors.business_name} />
              </div>

              {/* ── DYNAMIC: doctor fields ─────────────────────────── */}
              {dynamicFields === 'doctor' && (
                <>
                  <div data-error={!!errors.specialization}>
                    <Combobox
                      id="specialization"
                      label="Specialization"
                      value={values.specialization}
                      onChange={(v) => set('specialization', v)}
                      suggestions={suggestions.specializations}
                      placeholder="Start typing — e.g. Dentist, Cardiologist…"
                      required
                      error={errors.specialization}
                      hint="as specialization"
                    />
                  </div>
                  <Combobox
                    id="qualification"
                    label="Qualification"
                    value={values.qualification}
                    onChange={(v) => set('qualification', v)}
                    suggestions={suggestions.qualifications}
                    placeholder="e.g. MBBS, MD, BDS…"
                    hint="as qualification"
                  />
                  <div>
                    <label htmlFor="experience_years" className="mb-1.5 block font-body text-sm font-semibold text-ink">Experience (years)</label>
                    <input
                      id="experience_years"
                      value={values.experience_years}
                      onChange={(e) => set('experience_years', e.target.value)}
                      type="number"
                      min={0}
                      max={60}
                      className={inputCls('experience_years')}
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label htmlFor="consultation_fee" className="mb-1.5 block font-body text-sm font-semibold text-ink">Consultation fee</label>
                    <input
                      id="consultation_fee"
                      value={values.consultation_fee}
                      onChange={(e) => set('consultation_fee', e.target.value)}
                      maxLength={30}
                      className={inputCls('consultation_fee')}
                      placeholder="₹300"
                    />
                  </div>
                </>
              )}

              {/* ── DYNAMIC: restaurant fields ─────────────────────── */}
              {dynamicFields === 'restaurant' && (
                <>
                  <div className="sm:col-span-2">
                    <Combobox
                      id="cuisine"
                      label="Cuisines"
                      value={values.cuisine}
                      onChange={(v) => set('cuisine', v)}
                      suggestions={suggestions.cuisines}
                      placeholder="e.g. Mughlai, North Indian, Chinese…"
                      hint="as cuisines"
                    />
                  </div>
                  <div>
                    <label htmlFor="veg_type" className="mb-1.5 block font-body text-sm font-semibold text-ink">Food type</label>
                    <select
                      id="veg_type"
                      value={values.veg_type}
                      onChange={(e) => set('veg_type', e.target.value)}
                      className={inputCls('veg_type')}
                    >
                      {VEG_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="price_range" className="mb-1.5 block font-body text-sm font-semibold text-ink">Price range</label>
                    <select
                      id="price_range"
                      value={values.price_range}
                      onChange={(e) => set('price_range', e.target.value)}
                      className={inputCls('price_range')}
                    >
                      <option value="">—</option>
                      <option value="₹">₹ — Budget</option>
                      <option value="₹₹">₹₹ — Moderate</option>
                      <option value="₹₹₹">₹₹₹ — Premium</option>
                    </select>
                  </div>
                </>
              )}

              {/* ── DYNAMIC: hotel fields ──────────────────────────── */}
              {dynamicFields === 'hotel' && (
                <>
                  <div data-error={!!errors.hotel_type}>
                    <label htmlFor="hotel_type" className="mb-1.5 block font-body text-sm font-semibold text-ink">
                      Hotel type <span className="text-brand">*</span>
                    </label>
                    <select
                      id="hotel_type"
                      value={values.hotel_type}
                      onChange={(e) => set('hotel_type', e.target.value)}
                      className={inputCls('hotel_type')}
                    >
                      <option value="" disabled>Choose…</option>
                      {HOTEL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <FieldError msg={errors.hotel_type} />
                  </div>
                  <div>
                    <label htmlFor="price_range" className="mb-1.5 block font-body text-sm font-semibold text-ink">Room price (per night)</label>
                    <input
                      id="price_range"
                      value={values.price_range}
                      onChange={(e) => set('price_range', e.target.value)}
                      maxLength={60}
                      className={inputCls('price_range')}
                      placeholder="₹1,400–₹2,800"
                    />
                  </div>
                  <div>
                    <label htmlFor="check_in_time" className="mb-1.5 block font-body text-sm font-semibold text-ink">Check-in</label>
                    <select
                      id="check_in_time"
                      value={values.check_in_time}
                      onChange={(e) => set('check_in_time', e.target.value)}
                      className={inputCls('check_in_time')}
                    >
                      <option value="">—</option>
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="check_out_time" className="mb-1.5 block font-body text-sm font-semibold text-ink">Check-out</label>
                    <select
                      id="check_out_time"
                      value={values.check_out_time}
                      onChange={(e) => set('check_out_time', e.target.value)}
                      className={inputCls('check_out_time')}
                    >
                      <option value="">—</option>
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block font-body text-sm font-semibold text-ink">Amenities</span>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-5">
                      {HOTEL_AMENITIES.map((a) => (
                        <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 font-body text-xs font-semibold transition ${
                          amenities.includes(a)
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-border-subtle bg-white text-ink-soft hover:border-brand/40'
                        }`}>
                          <input
                            type="checkbox"
                            checked={amenities.includes(a)}
                            onChange={() => toggleAmenity(a)}
                            className="h-3.5 w-3.5 accent-brand"
                          />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── City + address ─────────────────────────────────── */}
              <div>
                <CityAutocomplete
                  value={city}
                  onChange={(c) => {
                    setCity(c);
                    setErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                  error={errors.city}
                />
              </div>

              <div data-error={!!errors.address}>
                <AddressAutocomplete
                  value={address}
                  onChange={(a) => {
                    setAddress(a);
                    // Mirror into the values store for submit + review.
                    set('address', a?.address ?? '');
                    // Sync the map pin to the resolved coordinates.
                    setPin(a?.lat != null && a?.lng != null ? { lat: a.lat, lng: a.lng } : null);
                    setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  biasLat={city?.lat}
                  biasLng={city?.lng}
                  error={errors.address}
                  required
                />
              </div>

              <Combobox
                id="locality"
                label="Area / Locality"
                value={values.locality}
                onChange={(v) => set('locality', v)}
                suggestions={suggestions.localities}
                placeholder="e.g. Civil Lines"
                hint="as locality"
              />

              <Combobox
                id="tagline"
                label="Tagline"
                value={values.tagline}
                onChange={(v) => set('tagline', v)}
                suggestions={suggestions.taglines}
                placeholder="e.g. Mughlai · Family Dining"
                hint="as tagline"
              />

              {/* ── Map: exact location pin (draggable) ───────────── */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 block font-body text-sm font-semibold text-ink">
                  Pin the exact location on the map
                </span>
                <LocationPicker
                  pin={pin}
                  onPin={setPin}
                  center={
                    city?.lat != null && city?.lng != null
                      ? { lat: city.lat, lng: city.lng }
                      : null
                  }
                />
              </div>

              <div data-error={!!errors.opening_time}>
                <label className="mb-1.5 block font-body text-sm font-semibold text-ink">Opens</label>
                <select
                  value={values.opening_time}
                  onChange={(e) => set('opening_time', e.target.value)}
                  className={inputCls('opening_time')}
                >
                  <option value="">—</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <FieldError msg={errors.opening_time} />
              </div>

              <div>
                <label className="mb-1.5 block font-body text-sm font-semibold text-ink">Closes</label>
                <select
                  value={values.closing_time}
                  onChange={(e) => set('closing_time', e.target.value)}
                  className={inputCls('closing_time')}
                >
                  <option value="">—</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div data-error={!!errors.website}>
                <label htmlFor="website" className="mb-1.5 block font-body text-sm font-semibold text-ink">Website</label>
                <input
                  id="website"
                  value={values.website}
                  onChange={(e) => set('website', e.target.value)}
                  type="url"
                  className={inputCls('website')}
                  placeholder="https://…"
                />
                <FieldError msg={errors.website} />
              </div>

              <div>
                <label htmlFor="description" className="mb-1.5 block font-body text-sm font-semibold text-ink">About your business</label>
                <textarea
                  id="description"
                  value={values.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={inputCls('description')}
                  placeholder="What makes your business special? (optional)"
                />
              </div>
            </div>
          </section>
        )}

        {/* ════════════ STEP 3: Photos + review + submit ════════════ */}
        {step === 3 && (
          <section className="space-y-6">
            <SectionHeader title="Photos & final review" hint="Add photos, check your details, then submit" />

            {/* Photos */}
            <div>
              <span className="mb-1.5 block font-body text-sm font-semibold text-ink">
                Photos ({images.length}/{MAX_IMAGES})
              </span>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong bg-subtle px-4 py-6 text-center transition hover:border-brand hover:bg-brand-soft/40">
                <span className="text-2xl">📷</span>
                <span className="font-body text-sm font-bold text-ink-soft">
                  {uploading ? 'Uploading…' : 'Click to add photos'}
                </span>
                <span className="font-body text-xs text-ink-muted">
                  JPG / PNG / WebP · max {MAX_IMAGE_MB}MB each · first photo becomes the cover
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading || images.length >= MAX_IMAGES}
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              {uploadError && <p className="mt-1.5 font-body text-xs font-semibold text-rose">{uploadError}</p>}
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.map((img, i) => (
                    <div key={img.publicId} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-lg border border-border-subtle object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white shadow"
                      >
                        ✕
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-body text-[8px] font-bold text-white">
                          COVER
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review summary */}
            <div className="rounded-lg border border-border-subtle bg-subtle/60 p-4">
              <h4 className="mb-3 font-body text-xs font-bold uppercase tracking-wider text-ink-muted">
                Review your submission
              </h4>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 font-body text-sm sm:grid-cols-2">
                <ReviewRow label="Category" value={category ? categoryLabel(category) : '—'} />
                <ReviewRow label="Name" value={values.submitter_name || '—'} />
                <ReviewRow label="Phone" value={`${country.code} ${values.submitter_phone}`.trim() || '—'} />
                <ReviewRow label="Business" value={values.business_name || '—'} />
                <ReviewRow label="City" value={city?.name ?? '—'} />
                <ReviewRow label="Address" value={values.address || '—'} />
                {dynamicFields === 'doctor' && values.specialization && (
                  <ReviewRow label="Specialization" value={values.specialization} />
                )}
                {dynamicFields === 'restaurant' && values.cuisine && (
                  <ReviewRow label="Cuisines" value={values.cuisine} />
                )}
                {dynamicFields === 'hotel' && values.hotel_type && (
                  <ReviewRow label="Hotel type" value={values.hotel_type} />
                )}
                <ReviewRow
                  label="Hours"
                  value={values.opening_time && values.closing_time ? `${values.opening_time} – ${values.closing_time}` : '—'}
                />
                <ReviewRow label="Photos" value={`${images.length} uploaded`} />
              </dl>
              <p className="mt-3 font-body text-xs text-ink-muted">
                Wrong something? Use <b>Back</b> to edit — your details are saved.
              </p>
            </div>
          </section>
        )}

        {/* ── Wizard navigation ────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between border-t border-border-subtle/60 pt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-6 py-2.5 font-body text-sm font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-hover"
              >
                Continue
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={pending || uploading}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-8 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover disabled:opacity-60"
              >
                {pending ? 'Submitting…' : uploading ? 'Uploading photos…' : (
                  <>
                    Submit for Review
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <div>
        <h3 className="font-headline text-base font-semibold tracking-tight text-ink">{title}</h3>
        {hint && <p className="font-body text-xs text-ink-soft">{hint}</p>}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 font-body text-xs font-semibold text-rose">{msg}</p>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-body text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="truncate text-right font-body text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
