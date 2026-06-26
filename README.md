# Poornima CMS

Poornima CMS is a **Complaint Management System** built for Poornima College Of Engineering. The application enables faculty to register complaints, admins to coordinate assignments, and vendors to resolve maintenance tasks. It includes a real-time push notification system (via Firebase Cloud Messaging) and an SOS emergency broadcast feature.

## Project Structure

- **`/frontend`**: Next.js (React) application styled with Tailwind CSS, authenticated with NextAuth (Firebase Credentials), and connected to Supabase.
- **`/backend`**: FastAPI (Python) REST API service backed by Supabase PostgreSQL database.

---

## Getting Started

### 1. Database Setup (Supabase)
Before running the applications, apply the database schema definitions in your Supabase project:
1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Copy and run the SQL script in [backend/supabase/schema.sql](file:///x:/My_Workspace/poornimacms/backend/supabase/schema.sql).

---

### 2. Backend Setup (`/backend`)

#### Environment Variables
Create a `.env` file inside `/backend` and fill in the values:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000

# Firebase Cloud Messaging credentials (for push notifications)
# Set the Base64 encoded string of your service account key JSON file
FIREBASE_SERVICE_ACCOUNT_JSON=your-base64-encoded-key-json
```

#### Run Backend Locally
1. Navigate to `/backend`.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the API service using uvicorn:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`.

---

### 3. Frontend Setup (`/frontend`)

#### Environment Variables
Create a `.env.local` file inside `/frontend`:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
AUTH_SECRET=your-next-auth-secret
AUTH_TRUST_HOST=true

# Firebase Client Configuration (for auth & messaging registration)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

# Firebase Cloud Messaging VAPID Certificate Key
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-public-key
```

#### Run Frontend Locally
1. Navigate to `/frontend`.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## Features & Roles

- **Faculty**: Can submit complaints, upload images of issues, track statuses, verify solutions, and trigger SOS alerts.
- **Admin**: Can prioritize complaints, assign work to specific vendors, verify completions, and manage departments.
- **Vendor**: View assigned tasks, mark jobs as finished, upload completion images, and report blocking issues.
- **Super Admin**: Monitor analytics, manage users/vendors, verify pending registrations, and handle system configurations.
- **SOS Emergency System**: Anyone can trigger SOS alerts from their dashboard which broadcast immediate push notifications to all active devices.
