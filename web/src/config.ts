// SERVER_URL is read from the VITE_SERVER_URL environment variable at build time.
// • Local dev:  set nothing — falls back to localhost:3001
// • Vercel:     add VITE_SERVER_URL = https://your-app.onrender.com in project settings
export const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
