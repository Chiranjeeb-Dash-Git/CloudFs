# CloudFS

Cloud media storage: Next.js frontend + Express API. Three visual themes stay distinct (NexaCore landing, Mono dashboard, Studio files).

## Run

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Frontend: http://localhost:3000  
API: http://localhost:8080

Register at `/register`, then use Dashboard / Files / Shared / Security / Settings / Trash.

Apply `backend/sql/schema.sql` in Supabase when you attach Postgres. Until `DATABASE_URL` is set, the API uses in-memory storage (resets on restart).
