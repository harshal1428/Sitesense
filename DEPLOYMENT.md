# 🚀 SiteSense AI — Deployment Guide

Follow these steps to take your SiteSense AI platform online safely.

## 1. Backend (Railway)
Railway is ideal for the Python backend as it supports Docker and persistent storage.

1.  **Create a New Project**: In Railway, select **"Deploy from GitHub repo"**.
2.  **Add a Volume**:
    *   Go to your Service settings → **Volumes**.
    *   Add a new volume. Set the **Mount Path** to `/app/data`.
    *   *Why?* This ensures your ChromaDB vector store and SQLite user data are saved even when the server restarts.
3.  **Environment Variables**: Add these in the **Variables** tab:
    *   `ENVIRONMENT`: `production`
    *   `CHROMA_PERSIST_PATH`: `/app/data/chroma`
    *   `SQLITE_DB_PATH`: `/app/data/sitesense.db`
    *   `UPLOADS_DIR`: `/app/uploads`
    *   `BACKEND_URL`: `https://your-api-name.up.railway.app`
    *   `FRONTEND_URL`: `https://your-admin-slug.vercel.app`
    *   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` (Copy from your local `.env`)
    *   `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`
    *   `VOYAGE_API_KEY`
    *   `WIDGET_JWT_SECRET`: (A long random string)

## 2. Frontend (Vercel)
The Next.js admin dashboard and chat interface can be deployed to Vercel.

1.  **Create a New Project**: In Vercel, import your repository.
2.  **Environment Variables**: Add these in the project settings:
    *   `NEXT_PUBLIC_API_URL`: `https://your-api-name.up.railway.app` (The Railway URL)
    *   `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase project URL)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase Anon key)
3.  **Deploy**: Vercel will automatically build and deploy the dashboard.

## 3. Supabase Configuration
To allow users to login to the online dashboard:
1.  Go to **Authentication** → **URL Configuration**.
2.  Set **Site URL** to your Vercel URL (e.g., `https://sitesense-admin.vercel.app`).
3.  Add your production URL to the **Redirect URLs** (e.g., `https://sitesense-admin.vercel.app/**`).

## 4. Public Chat & Widget
*   **Shareable Chat**: Once online, anyone visiting `https://your-admin.vercel.app/chat/[bot-id]` can talk to the bot.
*   **Embedding**: Use the widget script provided in the "Integrations" page of your dashboard.

---

### Security Note
*   The CORS policy in `main.py` is now configured to automatically lock down to your `FRONTEND_URL` when `ENVIRONMENT` is set to `production`.
*   Always use `HS256` for widget tokens (already configured).
