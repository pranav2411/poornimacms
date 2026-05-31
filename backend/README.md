# Poornima CMS Backend

FastAPI service backed by Supabase.

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. Apply the SQL in `supabase/schema.sql` to your Supabase project.
3. Create a virtualenv and install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Notes

- Only the backend uses the Supabase service role key. Never expose it to the frontend.
- Configure CORS with `ALLOWED_ORIGINS` to match the frontend URL.
