'use client';

import { useState, useTransition, useRef } from 'react';
import { submitBusiness } from './actions';
import { getUploadSignature } from './upload-actions';
import CityAutocomplete, { type SelectedCity } from './city-autocomplete';

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

// ── Single category picklist — drives the dynamic fields + kind ───────
const CATEGORIES = [
  { slug: 'doctors', label: '🩺 Doctor / Clinic', kind: 'doctor' },
  { slug: 'dining', label: '🍕 Restaurant / Food', kind: 'restaurant' },
  { slug: 'hotels', label: '🏨 Hotel / Stay', kind: 'hotel' },
  { slug: 'salons', label: '💄 Beauty Salon / Spa', kind: 'salon' },
  { slug: 'barbers', label: '💈 Barber', kind: 'salon' },
  { slug: 'fashion', label: '👗 Fashion / Clothing Shop', kind: 'shop' },
  { slug: 'grocery', label: '🛒 Grocery / Kirana', kind: 'shop' },
  { slug: 'malls', label: '🏬 Mall / Market', kind: 'mall' },
  { slug: 'cinemas', label: '🎬 Cinema / Entertainment', kind: 'service' },
  { slug: 'heritage', label: '🏛️ Crafts / Heritage Shop', kind: 'shop' },
] as const;

type CategorySlug = (typeof CATEGORIES)[number]['slug'];

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

const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 5;

interface UploadedImage {
  url: string;
  publicId: string;
}

interface Errors {
  [key: string]: string | undefined;
}

export default function SubmitForm() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const [category, setCategory] = useState<CategorySlug | ''>('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const kind = CATEGORIES.find((c) => c.slug === category)?.kind;

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

  // ── Validation ──────────────────────────────────────────────────────
  function validate(form: HTMLFormElement): Errors {
    const errs: Errors = {};
    const val = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ?? '';

    if (val('submitter_name').length < 2) errs.submitter_name = 'Please enter your name.';

    const digits = val('submitter_phone').replace(/[^0-9]/g, '');
    const startDigit = country.starts.replace(/[\[\]\\-]/g, '').charAt(0);
    if (!digits) {
      errs.submitter_phone = 'Phone number is required.';
    } else if (!new RegExp(`^${country.starts}`).test(digits)) {
      errs.submitter_phone = `${country.name} mobile numbers start with ${startDigit}.`;
    } else if (digits.length < country.min || digits.length > country.max) {
      errs.submitter_phone = `${country.name} numbers are ${country.min} digits — you entered ${digits.length}.`;
    }

    const email = val('submitter_email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errs.submitter_email = 'Enter a valid email (e.g. name@gmail.com).';
    }

    if (!category) errs.category = 'Please choose a category.';
    if (!city) errs.city = 'Please select your city from the list.';
    if (val('business_name').length < 2) errs.business_name = 'Business name is required.';
    if (val('address').length < 6) errs.address = 'Full address is required.';

    const open = val('opening_time');
    const close = val('closing_time');
    if ((open && !close) || (!open && close)) {
      errs.opening_time = 'Select both opening and closing time.';
    }

    const website = val('website');
    if (website && !/^https?:\/\/.+\..+/.test(website)) {
      errs.website = 'Enter a full URL starting with https://';
    }

    // Category-specific validation
    if (category === 'doctors' && val('specialization').length < 2) {
      errs.specialization = 'Specialization is required (e.g. Dentist, Cardiologist).';
    }
    if (category === 'hotels' && val('hotel_type').length < 2) {
      errs.hotel_type = 'Hotel type is required (e.g. 2-Star, Boutique, Resort).';
    }

    return errs;
  }

  function handleSubmit(formData: FormData) {
    const errs = validate(formRef.current!);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      formRef.current?.querySelector('[data-error="true"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    // Attach uploaded images + chosen category + city as JSON.
    formData.set('category', category);
    formData.set('images_json', JSON.stringify(images));
    formData.set('city_json', JSON.stringify(city));
    startTransition(async () => {
      const result = await submitBusiness(formData);
      if (result.ok) {
        setSuccess(true);
        formRef.current?.reset();
        setCategory('');
        setCountry(COUNTRIES[0]);
        setImages([]);
        setCity(null);
      } else {
        setErrors({ form: result.error });
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">✅</div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight">Request submitted!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
          Thank you — our team will verify your business and call you before it goes live on CityBee.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-7 rounded-xl bg-[#FF6F00] px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-[#E65100]"
        >
          Submit another business
        </button>
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
      className="space-y-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      {errors.form && (
        <div data-error="true" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {errors.form}
        </div>
      )}

      {/* ── 1. Category (drives everything else) ───────────────── */}
      <section className="space-y-4" data-error={!!errors.category}>
        <SectionHeader step="1" title="Choose a category" hint="This decides which details we ask for" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition sm:text-sm ${
                category === c.slug
                  ? 'border-[#FF6F00] bg-orange-50 text-[#FF6F00] ring-2 ring-[#FF6F00]/20'
                  : 'border-stone-200 bg-white text-slate-600 hover:border-orange-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <FieldError msg={errors.category} />
      </section>

      {/* ── 2. Contact ─────────────────────────────────────────── */}
      <section
        className="space-y-4 border-t border-stone-100 pt-6"
        data-error={!!(errors.submitter_name || errors.submitter_phone || errors.submitter_email)}
      >
        <SectionHeader step="2" title="Your details" hint="So we can reach you about the listing" />
        <div className="grid gap-4 sm:grid-cols-2">
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
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <input id="submitter_phone" name="submitter_phone" inputMode="numeric" maxLength={country.max} className={inputCls('submitter_phone')} placeholder={`${country.min}-digit number`} />
              <input type="hidden" name="country_code" value={country.code} />
            </div>
            <FieldError msg={errors.submitter_phone} />
          </div>

          <div data-error={!!errors.submitter_email}>
            <label htmlFor="submitter_email" className="mb-1.5 block text-sm font-bold">Email</label>
            <input id="submitter_email" name="submitter_email" type="email" className={inputCls('submitter_email')} placeholder="you@gmail.com" />
            <FieldError msg={errors.submitter_email} />
          </div>

          <div>
            <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-bold">WhatsApp number</label>
            <input id="whatsapp" name="whatsapp" maxLength={15} className={inputCls('whatsapp')} placeholder={`${country.code} …`} />
          </div>
        </div>
      </section>

      {/* ── 3. Business + dynamic category fields ──────────────── */}
      <section
        className="space-y-4 border-t border-stone-100 pt-6"
        data-error={!!(errors.business_name || errors.address || errors.city || errors.opening_time || errors.website || errors.specialization || errors.hotel_type)}
      >
        <SectionHeader
          step="3"
          title="Business details"
          hint={category ? CATEGORIES.find((c) => c.slug === category)?.label : 'Pick a category above for extra fields'}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div data-error={!!errors.business_name}>
            <label htmlFor="business_name" className="mb-1.5 block text-sm font-bold">
              Business name <span className="text-[#FF6F00]">*</span>
            </label>
            <input id="business_name" name="business_name" maxLength={120} className={inputCls('business_name')} placeholder="Royal Restaurant & Banquet" />
            <FieldError msg={errors.business_name} />
          </div>

          {/* ── DYNAMIC: doctor fields ─────────────────────────── */}
          {category === 'doctors' && (
            <>
              <div data-error={!!errors.specialization}>
                <label htmlFor="specialization" className="mb-1.5 block text-sm font-bold">
                  Specialization <span className="text-[#FF6F00]">*</span>
                </label>
                <input id="specialization" name="specialization" maxLength={80} className={inputCls('specialization')} placeholder="Dentist / Cardiologist…" />
                <FieldError msg={errors.specialization} />
              </div>
              <div>
                <label htmlFor="qualification" className="mb-1.5 block text-sm font-bold">Qualification</label>
                <input id="qualification" name="qualification" maxLength={100} className={inputCls('qualification')} placeholder="BDS, MDS — Prosthodontics" />
              </div>
              <div>
                <label htmlFor="experience_years" className="mb-1.5 block text-sm font-bold">Experience (years)</label>
                <input id="experience_years" name="experience_years" type="number" min={0} max={60} className={inputCls('experience_years')} placeholder="12" />
              </div>
              <div>
                <label htmlFor="consultation_fee" className="mb-1.5 block text-sm font-bold">Consultation fee</label>
                <input id="consultation_fee" name="consultation_fee" maxLength={30} className={inputCls('consultation_fee')} placeholder="₹300" />
              </div>
            </>
          )}

          {/* ── DYNAMIC: restaurant fields ─────────────────────── */}
          {category === 'dining' && (
            <>
              <div>
                <label htmlFor="cuisine" className="mb-1.5 block text-sm font-bold">Cuisines</label>
                <input id="cuisine" name="cuisine" maxLength={120} className={inputCls('cuisine')} placeholder="Mughlai, North Indian, Chinese…" />
              </div>
              <div>
                <label htmlFor="price_range" className="mb-1.5 block text-sm font-bold">Price range</label>
                <select name="price_range" defaultValue="₹₹" className={inputCls('price_range')}>
                  <option value="₹">₹ — Budget</option>
                  <option value="₹₹">₹₹ — Moderate</option>
                  <option value="₹₹₹">₹₹₹ — Premium</option>
                </select>
              </div>
              <div>
                <label htmlFor="veg_type" className="mb-1.5 block text-sm font-bold">Food type</label>
                <select name="veg_type" defaultValue="mixed" className={inputCls('veg_type')}>
                  {VEG_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── DYNAMIC: hotel fields ──────────────────────────── */}
          {category === 'hotels' && (
            <>
              <div data-error={!!errors.hotel_type}>
                <label htmlFor="hotel_type" className="mb-1.5 block text-sm font-bold">
                  Hotel type <span className="text-[#FF6F00]">*</span>
                </label>
                <select name="hotel_type" defaultValue="" className={inputCls('hotel_type')}>
                  <option value="" disabled>Choose…</option>
                  {['Budget', '2-Star', '3-Star', '4-Star', '5-Star', 'Boutique', 'Resort', 'Guest House'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <FieldError msg={errors.hotel_type} />
              </div>
              <div>
                <label htmlFor="price_range" className="mb-1.5 block text-sm font-bold">Room price (per night)</label>
                <input id="price_range" name="price_range" maxLength={60} className={inputCls('price_range')} placeholder="₹1,400–₹2,800" />
              </div>
              <div>
                <label htmlFor="check_in_time" className="mb-1.5 block text-sm font-bold">Check-in</label>
                <select name="check_in_time" defaultValue="12:00 PM" className={inputCls('check_in_time')}>
                  <option value="">—</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="check_out_time" className="mb-1.5 block text-sm font-bold">Check-out</label>
                <select name="check_out_time" defaultValue="11:00 AM" className={inputCls('check_out_time')}>
                  <option value="">—</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Amenities</span>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-5">
                  {HOTEL_AMENITIES.map((a) => (
                    <label key={a} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" name="amenities" value={a} className="h-3.5 w-3.5 accent-[#FF6F00]" />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── City (full width — autocomplete dropdown needs space) */}
          <div className="sm:col-span-2">
            <CityAutocomplete value={city} onChange={setCity} error={errors.city} />
          </div>

          <div data-error={!!errors.address} className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-bold">
              Full address <span className="text-[#FF6F00]">*</span>
            </label>
            <input id="address" name="address" maxLength={200} className={inputCls('address')} placeholder="Shop no, street, landmark" />
            <FieldError msg={errors.address} />
          </div>

          <div>
            <label htmlFor="locality" className="mb-1.5 block text-sm font-bold">Area / Locality</label>
            <input id="locality" name="locality" maxLength={80} className={inputCls('locality')} placeholder="Civil Lines" />
          </div>

          <div>
            <label htmlFor="tagline" className="mb-1.5 block text-sm font-bold">Tagline</label>
            <input id="tagline" name="tagline" maxLength={100} className={inputCls('tagline')} placeholder="Mughlai · North Indian · Family Dining" />
          </div>

          <div data-error={!!errors.opening_time} className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold">Opening hours</label>
            <div className="grid grid-cols-2 gap-4">
              <select name="opening_time" defaultValue="" className={inputCls('opening_time')}>
                <option value="">Opens…</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select name="closing_time" defaultValue="" className={inputCls('closing_time')}>
                <option value="">Closes…</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <FieldError msg={errors.opening_time} />
          </div>

          <div data-error={!!errors.website} className="sm:col-span-2">
            <label htmlFor="website" className="mb-1.5 block text-sm font-bold">Website</label>
            <input id="website" name="website" type="url" className={inputCls('website')} placeholder="https://…" />
            <FieldError msg={errors.website} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-bold">About your business</label>
            <textarea id="description" name="description" rows={3} maxLength={500} className={inputCls('description')} placeholder="What makes your business special? (optional)" />
          </div>

          {/* ── Photos (full width) ─────────────────────────────── */}
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold">Photos ({images.length}/{MAX_IMAGES})</span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition hover:border-[#FF6F00] hover:bg-orange-50/50">
              <span className="text-2xl">📷</span>
              <span className="text-sm font-bold text-slate-600">
                {uploading ? 'Uploading…' : 'Click to add photos'}
              </span>
              <span className="text-xs font-medium text-slate-400">JPG / PNG / WebP · max {MAX_IMAGE_MB}MB each · first photo becomes the cover</span>
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
            {uploadError && <p className="mt-1.5 text-xs font-semibold text-red-500">{uploadError}</p>}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <div key={img.publicId} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-xl border border-stone-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
                    >
                      ✕
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] font-bold text-white">
                        COVER
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Submit ─────────────────────────────────────────────── */}
      <div className="border-t border-stone-100 pt-6">
        <button
          type="submit"
          disabled={pending || uploading}
          className="w-full rounded-xl bg-[#FF6F00] py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-[#E65100] active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:px-10"
        >
          {pending ? 'Submitting…' : uploading ? 'Uploading photos…' : 'Submit for Review'}
        </button>
        <p className="mt-3 text-xs font-medium text-slate-400">
          Free listing · Our team verifies every business before it goes live
        </p>
      </div>
    </form>
  );
}

function SectionHeader({ step, title, hint }: { step: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-extrabold text-[#FF6F00]">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
        {hint && <p className="text-xs font-medium text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs font-semibold text-red-500">{msg}</p>;
}
