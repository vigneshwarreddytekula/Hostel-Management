# Hostel Booking and Rental Management System (Nestora)

Full-stack platform for hostel discovery, room booking, leave-aware rent, Razorpay payments, PDF receipts, maps, and role-based dashboards.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite), React Router, Axios |
| Backend | Spring Boot 4, JWT, Spring Security |
| Database | H2 (default local) or MySQL |
| Payments | Razorpay (or mock when keys absent) |
| Images | Cloudinary (or local `/uploads`) |
| PDF | OpenPDF |
| Maps | Google Maps Embed (or OpenStreetMap fallback) |

## Quick start

### 1. Backend

```bash
cd backend
./mvnw spring-boot:run
```

API: `http://localhost:8080`  
H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:file:./data/hosteldb`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hostel.com | password123 |
| Owner | owner@hostel.com | password123 |
| Tenant | tenant@hostel.com | password123 |

Seeded hostels in Chennai and Bengaluru are ready to browse and book.

## MySQL (optional)

```bash
docker compose up -d
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
```

## Environment

See [`.env.example`](.env.example). Without Razorpay / Cloudinary / Google Maps keys the app runs in mock/fallback mode:

- Payments: **Pay now** completes via mock verify
- Images: stored under `backend/uploads`
- Maps: OpenStreetMap embed

## Main flows

1. Tenant searches hostels → opens detail → requests booking  
2. Owner approves booking → rent record is created  
3. Tenant applies for leave → owner approves → rent recalculated (`base − leave + extras`)  
4. Tenant pays rent (mock or Razorpay) → PDF receipt downloadable  
5. Admin verifies listings and manages users  

## Deploy notes (Render)

**Backend**

- Build: `./mvnw -DskipTests package`
- Start: `java -jar target/hostel-management-0.0.1-SNAPSHOT.jar`
- Set env: `SPRING_PROFILES_ACTIVE=mysql`, `DB_*`, `JWT` secret, Razorpay/Cloudinary keys
- Persist `uploads/` and `receipts/` via disk or object storage

**Frontend**

- Build: `npm run build`
- Publish `frontend/dist`
- Set `VITE_API_BASE_URL` to your backend public URL at build time

**CORS** is open via origin patterns for local/demo; tighten for production.

## API prefix

All REST endpoints live under `/api/v1` (auth, hostels, rooms, bookings, leaves, rents, payments, notifications, owner/admin dashboards).
