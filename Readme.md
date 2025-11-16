# Trucking Documents Upload – Web App (React + Django)

A simple, modular document upload application for trucking companies. Files are stored in AWS S3; metadata is stored in PostgreSQL. Multi-tenant by company with basic roles.

## Key Requirements (from user)
- **Frontend**: React (JS) + Vite, **Tailwind** for styling, **no TypeScript**, **no React Query**.
- **Single API client** at `frontend/src/lib/fetchData.js` for all HTTP calls (easily configurable).
- **Backend**: Django + DRF + Django default auth + SimpleJWT; use **Django ORM** (no Prisma).
- **Storage**: AWS S3 via presigned URLs. All **AWS details from `.env`**.
- **DB**: **Local Postgres** on `localhost:5432` via `.env`.
- **Documents** are per **truck + date**, with predefined sections (Aadhaar, Driving License, PAN, RC, Insurance, Fitness, Permit, PUC, Receipt, Other).
- **Multi-tenant**: partition by company; **admins** can add/remove users for their company.
- **Validation**: basic checks; **Indian truck regex must be permissive** (prefer not to block). Correct formats must always be accepted.
- **Deletion policy**: **Hard delete allowed only while filling the form (staging)**. After save/finalize, **no hard delete**.
- **Limits in env** with defaults: **10MB/file**, **20 files** per upload.
- **Bilingual**: Hindi (default) and English via i18next.
- **Responsive**: Works across devices.

---

## Architecture Overview
- **Frontend**: React (Vite), Tailwind CSS, React Router, i18next (Hindi default), centralized `fetchData.js` (native `fetch`).
- **Backend**: Django, Django REST Framework, SimpleJWT, django-storages (S3), django-cors-headers, Django ORM, Postgres.
- **Storage**: AWS S3 presigned POST/GET (files go directly to S3, not through Django).
- **DB**: Postgres; models for companies, memberships, trucks, sections, documents.

### Monorepo Layout
/ (repo root) backend/ manage.py requirements.txt .env (not committed) src/ config/ (settings, urls, asgi/wsgi) accounts/ (auth, JWT) companies/ (Company, Membership) trucks/ (Truck) documents/ (DocumentSection, Document, presign/finalize) frontend/ index.html vite.config.js package.json .env (not committed) src/ lib/fetchData.js i18n/ pages/{Auth,Upload,Documents,Admin}/ components/ styles/ public/locales/ hi/translation.json en/translation.json .env.example README.md .gitignore


---

## Data Model (Django)
- **Company**: `id`, `name`, `created_at`
- **Membership**: `user(FK)`, `company(FK)`, `role` in {`admin`, `member`} (unique by user+company)
- **Truck**: `id`, `company(FK)`, `truck_number` (unique per company), `active`
- **DocumentSection**: `id`, `key` (aadhaar, dl, pan, rc, insurance, fitness, permit, puc, receipt, other), `label_hi`, `label_en`
- **Document**: `id`, `company(FK)`, `truck(FK)`, `doc_date` (date), `section(FK)`, `file_name`, `mime_type`, `size_bytes`, `s3_key`, `uploaded_by(FK user)`, `created_at`

### S3 Key Convention
- **Final**: `company/{companyId}/truck/{truckId}/date/{YYYY-MM-DD}/{section}/{uuid}.{ext}`
- **Staging** (in-form, deletable): `staging/{userId}/{uuid}.{ext}`

### Document Lifecycle & Deletion Policy
1. User uploads files to S3 under `staging/` (presigned POST). Deletion allowed here.
2. On finalize:
   - Backend moves each object from `staging/` to final key.
   - Metadata row is created in `documents` table.
   - After this point, no hard delete is exposed.

---

## API Endpoints (v1)
- **Auth**
  - POST `/api/auth/login/` → {access, refresh}
  - POST `/api/auth/register/` → admin-only or initial setup
  - GET `/api/me/` → profile + memberships
- **Companies & Users**
  - GET `/api/companies/{id}/users/` [admin]
  - POST `/api/companies/{id}/users/` [admin]
  - PATCH `/api/companies/{id}/users/{userId}/` [admin] (role/remove)
- **Trucks**
  - GET `/api/trucks/`
  - POST `/api/trucks/` [admin] (permissive Indian truck validation)
- **Documents**
  - POST `/api/documents/presign-upload/` → {url/fields or signed URL, tempKey}
  - POST `/api/documents/finalize/` → moves staging → final, creates metadata
  - GET `/api/documents/?truckId=&date=` → list
  - GET `/api/documents/{id}/presign-download/` → signed URL to download
  - DELETE `/api/documents/staging` (by tempKey) → only before finalize

All endpoints are scoped to the authenticated user’s current company (membership + RBAC).

---

## Frontend Pages
- **Auth**: Login (Hindi default), language switcher (HI/EN).
- **Upload**: Select Company, Truck, Date, Section(s). Add files (PDF/Images). Show size/count limits. Upload to staging. Allow delete in staging. Finalize to save.
- **Documents**: Filter by Truck + Date. List results. Download (signed URL). No delete here (post-finalize).
- **Admin**: Manage Users (add/remove, roles). Manage Trucks (add/edit/disable).

---

## Validation & Limits
- **Truck number (India)**:
  - Normalize to uppercase; strip spaces/hyphens for validation.
  - Use a permissive regex covering common formats (`MH12AB1234`, `MH 12 AB 1234`, `DL1PC1234`, etc.).
  - Avoid rejecting borderline-valid inputs; frontend may show a non-blocking warning.
- **File limits** (from env): default **10MB** per file, **20** files per upload.
- **Allowed types**: `pdf, jpg, jpeg, png, webp`.
- **Date**: valid calendar day; grouped by date-only.

---

## Environment Variables
Create `.env` files (not committed). See template below.

### Root `.env.example` (copy values into `backend/.env` and `frontend/.env`)



---

## Setup & Run (Local)
- **Prereqs**: Node 18+, Python 3.10+, local Postgres, AWS account (for S3), Git.

### Backend (Django)
1. `cd backend`
2. Create venv and install deps
   - macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`
   - Windows: `py -m venv .venv && .venv\\Scripts\\activate`
3. `pip install -r requirements.txt`
4. Create `backend/.env` using `.env.example` values (ensure `DATABASE_URL` points to local Postgres).
5. `python manage.py migrate`
6. Create superuser (optional): `python manage.py createsuperuser`
7. `python manage.py runserver 0.0.0.0:8000`

### Frontend (React)
1. `cd frontend`
2. `npm install`
3. Create `frontend/.env` with `VITE_API_BASE_URL` and `VITE_DEFAULT_LOCALE=hi`
4. `npm run dev` (Vite at `http://localhost:5173`)

---

## Centralized API Client – `frontend/src/lib/fetchData.js`
- Single place to configure base URL, headers, auth token, language, and error handling.

```js
// frontend/src/lib/fetchData.js
export async function fetchData(path, { method = 'GET', headers = {}, body, auth = true } = {}) {
  const base = import.meta.env.VITE_API_BASE_URL;
  const token = auth ? localStorage.getItem('token') : null;
  const lang = localStorage.getItem('i18nextLng') || import.meta.env.VITE_DEFAULT_LOCALE || 'hi';

  const init = {
    method,
    headers: {
      'Accept': 'application/json',
      'Accept-Language': lang,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    credentials: 'include',
  };

  const res = await fetch(`${base}${path}`, init);
  if (res.status === 401) {
    localStorage.removeItem('token');
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

i18n (Hindi default)
Directory: frontend/public/locales/{hi,en}/translation.json
Initialize i18next early; read current language from localStorage with fallback to hi.
UI provides a simple language switch.
S3 CORS (Bucket Example)

[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]


Milestones
M1 – Scaffolds: Monorepo, Vite + Tailwind + i18n, Django + DRF + JWT + S3 config, .envs.
M2 – Auth & Multi-tenancy: Login, memberships, admin/member roles.
M3 – Trucks: CRUD, permissive validation.
M4 – Documents: Sections seed, presign to staging, finalize move to final, metadata CRUD, list/download.
M5 – UI & i18n: Validation toasts, responsive polish, translations.
M6 – Deploy: Frontend (Vercel/Netlify), Backend (Render/Fly/EC2), DB (Neon/RDS or local → managed), S3 CORS.
Future Enhancements
PWA (installable, offline queueing), mobile apps later (reuse API & i18n).
Soft-delete/audit logs, versioning.
Bulk uploads, CSV import for trucks.
Better truck number heuristics and OCR for auto-fill.
Notes
Keep secrets out of git. Use .env files locally and environment variables in deployment.
Limits and AWS settings are fully configurable in .env.
After finalize, documents cannot be hard-deleted per policy.

