/**
 * Declarative entity registry — the single source of truth for every CRUD
 * page. Adding a table here automatically produces a list page, a form,
 * and validation. Field types map to form inputs + table rendering.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'url'
  | 'uuid'
  | 'email'
  | 'time'
  | 'phone'
  | 'address'
  | 'category'
  | 'location';

export interface FieldLookup {
  field: string;
  table: string;
  label: string;
}

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Render in the list table. */
  inList?: boolean;
  /** Show a compact on/off pill in the list. */
  listPill?: boolean;
  placeholder?: string;
  help?: string;
  /** For uuid fields: parent table to populate the select. */
  lookups?: FieldLookup[];
  /** Only render when the business `kind` select matches one of these. */
  kindOnly?: string[];
  /** Numeric bounds (rating 0-5 etc.). */
  min?: number;
  max?: number;
  /** Phone-family field that can mirror another phone field's value. */
  sameAs?: string;
  /** Render in detail views but not in the create/edit form (wizard). */
  inForm?: boolean;
}

export interface Entity {
  key: string;              // route segment
  table: string;            // supabase table
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  /** Column shown as the row's "name" in delete confirmations etc. */
  nameField: string;
  defaultOrder: { column: string; ascending: boolean };
  /** Optional join to show a parent label in the list (e.g. business name). */
  lookups?: FieldLookup[];
  /** Named field groups for the multi-step create/edit wizard. */
  steps?: { title: string; fields: string[] }[];
  icon: string;
}

export const entities: Entity[] = [
  {
    key: 'cities',
    table: 'cities',
    title: 'Cities',
    singular: 'City',
    description: 'Locations the app operates in — every listing is scoped to a city.',
    nameField: 'name',
    defaultOrder: { column: 'name', ascending: true },
    icon: 'City',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, inList: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true, inList: true, help: 'Stable id used by the app (e.g. "moradabad")' },
      { name: 'state_region', label: 'State / Region', type: 'text', inList: true },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'country_code', label: 'Country Code', type: 'text', placeholder: 'IN' },
      { name: 'latitude', label: 'Latitude', type: 'number', required: true },
      { name: 'longitude', label: 'Longitude', type: 'number', required: true },
      { name: 'is_active', label: 'Active', type: 'boolean', inList: true, listPill: true },
    ],
  },
  {
    key: 'categories',
    table: 'categories',
    title: 'Categories',
    singular: 'Category',
    description: 'Discovery categories shown in the app’s category grid.',
    nameField: 'name',
    defaultOrder: { column: 'sort_order', ascending: true },
    icon: 'Category',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, inList: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true, inList: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'Material icon name' },
      { name: 'sort_order', label: 'Sort Order', type: 'number', inList: true },
      { name: 'default_kind', label: 'Default Kind', type: 'text', inList: true },
      { name: 'is_active', label: 'Active', type: 'boolean', inList: true, listPill: true },
    ],
  },
  {
    key: 'businesses',
    table: 'businesses',
    title: 'Businesses',
    singular: 'Business',
    description: 'Shops, restaurants, doctors, hotels — the core listing entity. Approve pending listings here.',
    nameField: 'name',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Store',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, inList: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'category', label: 'Category', type: 'category', required: true, inList: true, help: 'Kind is set automatically from the category' },
      { name: 'tagline', label: 'Tagline', type: 'text', inList: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'phone', label: 'Phone', type: 'phone', inList: true, required: true },
      { name: 'whatsapp', label: 'WhatsApp', type: 'phone', sameAs: 'phone' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'location', label: 'Location', type: 'location', required: true, inList: false, help: 'Pick the city, optionally pin the exact spot on the map' },
      { name: 'address', label: 'Address', type: 'text', required: true, inForm: false },
      { name: 'locality', label: 'Locality / Area', type: 'text', required: true, inList: true, inForm: false },
      { name: 'city_id', label: 'City', type: 'uuid', inForm: false, lookups: [{ field: 'city_id', table: 'cities', label: 'name' }] },
      { name: 'rating', label: 'Rating', type: 'number', min: 0, max: 5, inList: true },
      { name: 'review_count', label: 'Review Count', type: 'number', min: 0 },
      { name: 'opening_hours', label: 'Opening Hours', type: 'text' },
      { name: 'is_pure_veg', label: 'Pure Veg', type: 'boolean' },
      { name: 'is_verified', label: 'Verified', type: 'boolean', inList: true, listPill: true },
      { name: 'is_featured', label: 'Featured', type: 'boolean', inList: true, listPill: true },
      { name: 'status', label: 'Status', type: 'select', required: true, inList: true, options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'inactive', label: 'Inactive' },
      ]},

      // ── Kind-specific details (shown/hidden by the kind select) ──────
      // Doctor extension
      { name: 'doctorName', label: 'Doctor Name', type: 'text', kindOnly: ['doctor'], placeholder: 'Dr. Anil Verma' },
      { name: 'specialization', label: 'Specialization', type: 'text', required: true, kindOnly: ['doctor'], placeholder: 'Dentist, Cardiologist…' },
      { name: 'qualification', label: 'Qualification', type: 'text', kindOnly: ['doctor'], placeholder: 'MBBS, MD…' },
      { name: 'experienceYears', label: 'Experience (years)', type: 'number', kindOnly: ['doctor'] },
      { name: 'consultationFee', label: 'Consultation Fee', type: 'text', kindOnly: ['doctor'], placeholder: '₹300' },
      // Restaurant extension
      { name: 'cuisine', label: 'Cuisines', type: 'text', required: true, kindOnly: ['restaurant'], placeholder: 'Mughlai, North Indian…' },
      { name: 'vegType', label: 'Food Type', type: 'select', kindOnly: ['restaurant'], options: [
        { value: 'veg', label: 'Pure Veg' },
        { value: 'non_veg', label: 'Non-Veg' },
        { value: 'mixed', label: 'Mixed' },
      ]},
      { name: 'priceRange', label: 'Price Range', type: 'text', kindOnly: ['restaurant', 'hotel'], placeholder: '₹₹ / ₹1,400–₹2,800 per night' },
      // Hotel extension
      { name: 'hotelType', label: 'Hotel Type', type: 'select', required: true, kindOnly: ['hotel'], options: [
        { value: '1-Star', label: '1-Star' },
        { value: '2-Star', label: '2-Star' },
        { value: '3-Star', label: '3-Star' },
        { value: '4-Star', label: '4-Star' },
        { value: '5-Star', label: '5-Star' },
        { value: 'Boutique', label: 'Boutique' },
        { value: 'Guest House', label: 'Guest House' },
        { value: 'Homestay', label: 'Homestay' },
        { value: 'Resort', label: 'Resort' },
      ]},
      { name: 'checkInTime', label: 'Check-in Time', type: 'time', kindOnly: ['hotel'] },
      { name: 'checkOutTime', label: 'Check-out Time', type: 'time', kindOnly: ['hotel'] },
      { name: 'amenities', label: 'Amenities (comma separated)', type: 'text', kindOnly: ['hotel'], placeholder: 'Wi-Fi, Parking, Room Service' },
    ],
    lookups: [{ field: 'city_id', table: 'cities', label: 'name' }],
    steps: [
      { title: 'Basics', fields: ['name', 'category', 'slug', 'tagline'] },
      { title: 'Contact', fields: ['phone', 'whatsapp', 'email', 'website'] },
      { title: 'Location', fields: ['location', 'address', 'locality', 'city_id'] },
      { title: 'Details', fields: ['description', 'opening_hours', 'rating', 'review_count', 'status'] },
      { title: 'Flags', fields: ['is_pure_veg', 'is_verified', 'is_featured'] },
      { title: 'Kind Details', fields: [] }, // kind-specific fields auto-fill here
    ],
  },
  {
    key: 'offers',
    table: 'offers',
    title: 'Offers',
    singular: 'Offer',
    description: 'Deals from businesses. Draft → pending → active lifecycle is managed here.',
    nameField: 'title',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Offer',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, inList: true },
      { name: 'business_id', label: 'Business', type: 'uuid', required: true, inList: true },
      { name: 'badge_text', label: 'Badge Text', type: 'text', inList: true, placeholder: '25% OFF' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', inList: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'category_tag', label: 'Category Tag', type: 'text', inList: true, placeholder: 'Dining' },
      { name: 'discount_type', label: 'Discount Type', type: 'select', options: [
        { value: 'percent', label: 'Percent' },
        { value: 'flat', label: 'Flat' },
        { value: 'bogo', label: 'Buy One Get One' },
        { value: 'other', label: 'Other' },
      ]},
      { name: 'discount_value', label: 'Discount Value', type: 'number' },
      { name: 'valid_from', label: 'Valid From', type: 'date' },
      { name: 'valid_until', label: 'Valid Until', type: 'date', inList: true },
      { name: 'is_featured', label: 'Featured', type: 'boolean', inList: true, listPill: true },
      { name: 'status', label: 'Status', type: 'select', required: true, inList: true, options: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'inactive', label: 'Inactive' },
      ]},
    ],
    lookups: [{ field: 'business_id', table: 'businesses', label: 'name' }],
    steps: [
      { title: 'Offer', fields: ['title', 'business_id', 'badge_text', 'subtitle'] },
      { title: 'Discount', fields: ['discount_type', 'discount_value', 'category_tag', 'description'] },
      { title: 'Validity & Status', fields: ['valid_from', 'valid_until', 'is_featured', 'status'] },
    ],
  },
  {
    key: 'places',
    table: 'places',
    title: 'Places',
    singular: 'Place',
    description: 'Tourist spots, markets, heritage sites for the Explore tab.',
    nameField: 'name',
    defaultOrder: { column: 'name', ascending: true },
    icon: 'Map',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, inList: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'category_id', label: 'Category', type: 'uuid' },
      { name: 'city_id', label: 'City', type: 'uuid', inList: true },
      { name: 'address', label: 'Address', type: 'text', inList: true },
      { name: 'timings', label: 'Timings', type: 'text' },
      { name: 'entry_fee', label: 'Entry Fee', type: 'text' },
      { name: 'rating', label: 'Rating', type: 'number', min: 0, max: 5, inList: true },
      { name: 'review_count', label: 'Review Count', type: 'number', min: 0 },
      { name: 'is_featured', label: 'Featured', type: 'boolean', inList: true, listPill: true },
      { name: 'is_active', label: 'Active', type: 'boolean', inList: true, listPill: true },
    ],
    lookups: [{ field: 'city_id', table: 'cities', label: 'name' }],
  },
  {
    key: 'users',
    table: 'users',
    title: 'Users',
    singular: 'User',
    description: 'App users mirrored from Supabase Auth. Manage roles and activity.',
    nameField: 'name',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'People',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, inList: true },
      { name: 'phone', label: 'Phone', type: 'text', inList: true },
      { name: 'email', label: 'Email', type: 'text', inList: true },
      { name: 'profile_image_url', label: 'Profile Image URL', type: 'url' },
      { name: 'role', label: 'Role', type: 'select', required: true, inList: true, options: [
        { value: 'user', label: 'User' },
        { value: 'business_owner', label: 'Business Owner' },
        { value: 'admin', label: 'Admin' },
      ]},
      { name: 'is_active', label: 'Active', type: 'boolean', inList: true, listPill: true },
    ],
  },
  {
    key: 'reviews',
    table: 'reviews',
    title: 'Reviews',
    singular: 'Review',
    description: 'User reviews of businesses and places — moderate here.',
    nameField: 'review_text',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Star',
    fields: [
      { name: 'user_id', label: 'User', type: 'uuid', required: true, inList: true },
      { name: 'business_id', label: 'Business', type: 'uuid', inList: true },
      { name: 'place_id', label: 'Place', type: 'uuid' },
      { name: 'rating', label: 'Rating', type: 'number', required: true, inList: true },
      { name: 'review_text', label: 'Review', type: 'textarea', inList: true },
      { name: 'status', label: 'Status', type: 'select', required: true, inList: true, options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ]},
    ],
    lookups: [
      { field: 'user_id', table: 'users', label: 'name' },
      { field: 'business_id', table: 'businesses', label: 'name' },
    ],
  },
  {
    key: 'notifications',
    table: 'notifications',
    title: 'Notifications',
    singular: 'Notification',
    description: 'In-app notification inbox items (user_id empty = broadcast).',
    nameField: 'title',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Notifications',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, inList: true },
      { name: 'message', label: 'Message', type: 'textarea', required: true, inList: true },
      { name: 'user_id', label: 'User (blank = broadcast)', type: 'uuid' },
      { name: 'type', label: 'Type', type: 'text', inList: true, placeholder: 'general' },
      { name: 'target_type', label: 'Target Type', type: 'select', options: [
        { value: 'business', label: 'Business' },
        { value: 'offer', label: 'Offer' },
        { value: 'place', label: 'Place' },
        { value: 'offers_tab', label: 'Offers Tab' },
        { value: 'explore_tab', label: 'Explore Tab' },
        { value: 'more_tab', label: 'More Tab' },
      ]},
      { name: 'target_id', label: 'Target ID', type: 'uuid' },
      { name: 'is_read', label: 'Read', type: 'boolean' },
    ],
  },
  {
    key: 'business-claims',
    table: 'business_claims',
    title: 'Business Claims',
    singular: 'Claim',
    description: 'Ownership claims submitted by business owners — approve or reject.',
    nameField: 'message',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Verified',
    fields: [
      { name: 'business_id', label: 'Business', type: 'uuid', required: true, inList: true },
      { name: 'user_id', label: 'User', type: 'uuid', required: true, inList: true },
      { name: 'status', label: 'Status', type: 'select', required: true, inList: true, options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ]},
      { name: 'message', label: 'Message', type: 'textarea' },
    ],
    lookups: [
      { field: 'business_id', table: 'businesses', label: 'name' },
      { field: 'user_id', table: 'users', label: 'name' },
    ],
  },
  {
    key: 'submissions',
    table: 'business_submissions',
    title: 'Submissions',
    singular: 'Submission',
    description: 'Customer-submitted business requests from the public form — approve to publish or reject.',
    nameField: 'business_name',
    defaultOrder: { column: 'created_at', ascending: false },
    icon: 'Submission',
    fields: [
      { name: 'business_name', label: 'Business', type: 'text', required: true, inList: true },
      { name: 'kind', label: 'Type', type: 'select', required: true, inList: true, options: [
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'doctor', label: 'Doctor' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'salon', label: 'Salon' },
        { value: 'shop', label: 'Shop' },
        { value: 'mall', label: 'Mall' },
        { value: 'service', label: 'Service' },
      ]},
      { name: 'submitter_name', label: 'Submitted By', type: 'text', required: true, inList: true },
      { name: 'submitter_phone', label: 'Contact Phone', type: 'text', required: true, inList: true },
      { name: 'submitter_email', label: 'Contact Email', type: 'text' },
      { name: 'tagline', label: 'Tagline', type: 'text', inList: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'phone', label: 'Business Phone', type: 'text' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
      { name: 'address', label: 'Address', type: 'text', inList: true },
      { name: 'locality', label: 'Locality', type: 'text' },
      { name: 'city_slug', label: 'City Slug', type: 'text', inList: true },
      { name: 'category_slug', label: 'Category Slug', type: 'text' },
      { name: 'opening_hours', label: 'Opening Hours', type: 'text' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'status', label: 'Status', type: 'select', required: true, inList: true, options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ]},
      // Category-specific extras (from the dynamic public form)
      { name: 'specialization', label: 'Specialization (Dr.)', type: 'text', inList: true },
      { name: 'qualification', label: 'Qualification (Dr.)', type: 'text' },
      { name: 'experience_years', label: 'Experience Yrs (Dr.)', type: 'number' },
      { name: 'consultation_fee', label: 'Consult Fee (Dr.)', type: 'text' },
      { name: 'cuisine', label: 'Cuisines (Restaurant)', type: 'text' },
      { name: 'veg_type', label: 'Food Type (Restaurant)', type: 'select', options: [
        { value: 'veg', label: 'Pure Veg' },
        { value: 'non_veg', label: 'Non-Veg' },
        { value: 'mixed', label: 'Mixed' },
      ]},
      { name: 'hotel_type', label: 'Hotel Type (Hotel)', type: 'text' },
      { name: 'check_in_time', label: 'Check-in (Hotel)', type: 'text' },
      { name: 'check_out_time', label: 'Check-out (Hotel)', type: 'text' },
      { name: 'amenities', label: 'Amenities (Hotel)', type: 'text' },
      { name: 'image_urls', label: 'Photos (JSON)', type: 'textarea', inList: false },
      { name: 'admin_note', label: 'Admin Note', type: 'textarea', inList: false },
    ],
  },
];

export function getEntity(key: string): Entity | undefined {
  return entities.find((e) => e.key === key);
}

export interface FormStep {
  title: string;
  fields: Field[];
}

/**
 * Wizard steps for an entity:
 *  1. explicit `steps` config wins (kindOnly fields fill an empty titled step);
 *  2. otherwise: kindOnly fields get their own step, the rest chunk by 7;
 *  3. one step total → the caller renders a plain single-page form.
 */
export function getFormSteps(entity: Entity): FormStep[] {
  const kindFields = entity.fields.filter((f) => f.kindOnly?.length);
  const plain = entity.fields.filter((f) => !f.kindOnly?.length);

  if (entity.steps?.length) {
    return entity.steps.map((step) => ({
      title: step.title,
      fields: step.fields
        .length
        ? step.fields
            .map((name) => entity.fields.find((f) => f.name === name))
            .filter((f): f is Field => !!f)
        : kindFields,
    }));
  }

  const steps: FormStep[] = [];
  for (let i = 0; i < plain.length; i += 7) {
    steps.push({ title: steps.length === 0 ? 'Details' : 'More Details', fields: plain.slice(i, i + 7) });
  }
  if (kindFields.length) steps.push({ title: 'Kind Details', fields: kindFields });
  return steps;
}

export const statCards = [
  { table: 'businesses', label: 'Businesses', where: null as string | null, icon: 'Store' },
  { table: 'businesses', label: 'Pending Approval', where: 'status=eq.pending', icon: 'Pending' },
  { table: 'business_submissions', label: 'New Submissions', where: 'status=eq.pending', icon: 'Submission' },
  { table: 'offers', label: 'Active Offers', where: 'status=eq.active', icon: 'Offer' },
  { table: 'places', label: 'Places', where: null, icon: 'Map' },
  { table: 'users', label: 'Users', where: null, icon: 'People' },
  { table: 'reviews', label: 'Reviews', where: null, icon: 'Star' },
];
