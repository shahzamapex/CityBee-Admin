# CityBee — Supabase Schema Backup

**Schema-only backup** (कोई data नहीं) — tables, functions, triggers, RLS
policies, indexes, extensions सब शामिल। नए provider पर restore करने के लिए।

- **Dumped:** 2026-09-11 · Supabase PostgreSQL 17.6 · `public` schema
- **File:** `schema.sql` (~2300 lines)

## क्या-क्या इसमें है

| चीज़ | Count | नाम |
|---|---|---|
| Tables | 25 | businesses, doctors, restaurants, hotels, offers, places, categories, cities, users, reviews, favorites, notifications, business_submissions, bulk_import_jobs, services, business_hours, menu_items… (पूरी list `schema.sql` में) |
| Functions | 4 | `is_admin()`, `owns_business()`, `set_updated_at()`, `business_images_max_five()` |
| Triggers | 17 | `set_updated_at` (हर table पर), `business_images_max_five_trg` |
| RLS policies | 63 | public_read / owner_write / admin_write patterns |
| Indexes | 20 | slug lookups, geo (PostGIS), category links |
| Extensions | 4 ज़रूरी | **postgis** (geo columns), pgcrypto, uuid-ossp, pg_trgm |

## नए provider पर restore कैसे करें

### अगर नया provider भी Supabase है (sabse aasan)
```bash
# नए project की connection string लो (session pooler, port 5432), फिर:
psql "postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" \
  -f schema.sql
```
Roles (`anon`, `authenticated`, `service_role`) और `auth.uid()` पहले से मौजूद
होते हैं — कुछ बदलने की ज़रूरत नहीं। बस service_role/anon की grants re-run
कर देना (file के अंत में दी हैं)।

### अगर कोई और provider है (Neon, RDS, plain Postgres…)
1. `CREATE EXTENSION` lines पहले चलाओ (PostGIS superuser access माँगता है)
2. Supabase roles exist नहीं करते — दो options:
   - वैसे roles create कर लो: `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`
   - या file में `TO anon` / `TO authenticated` वाली grant/policy lines हटा दो
3. `auth.uid()` — Supabase का auth है। अपने auth solution के हिसाब से replace
   करो (या फिर RLS policies temporarily drop करके app-level checks use करो)

## App के लिए restore के बाद ज़रूरी steps

- `citybee_api` role बनाओ (backend इसी से जुड़ता है, BYPASSRLS):
  ```sql
  CREATE ROLE citybee_api LOGIN PASSWORD '<new-password>' BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO citybee_api;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO citybee_api;
  ```
- Supabase Auth users (email/Google logins) **इस dump में नहीं हैं** — वो
  `auth` schema में होते हैं जो dump नहीं हुआ (permission restriction).
  नए Supabase project पर users दोबारा sign-up करेंगे या Supabase CLI से
  auth users export/import करना होगा।
- Cloudinary images का कोई data नहीं गया (सिर्फ URLs tables में थे, जो
  data dump में नहीं है — data चाहिये तो अलग से data-only dump लेना)

## Data भी backup चाहिए हो तो

```bash
pg_dump --data-only --schema=public --no-owner --no-privileges \
  -f data.sql "$SUPABASE_DB_URL"
# restore: psql "$NEW_DB_URL" -f schema.sql && psql "$NEW_DB_URL" -f data.sql
```

## Refresh कैसे करें (schema बदले तब)

```bash
pg_dump --schema-only --no-owner --no-privileges --schema=public --no-comments \
  -f schema.sql "postgresql://citybee_api.[REF]:[PASSWORD]@[POOLER]:5432/postgres"
# फिर ऊपर वाला extensions header वापस जोड़ना (या is file को reference रखना)
```
