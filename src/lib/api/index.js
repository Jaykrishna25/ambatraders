// Picks the data backend once:
//   • Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (.env / Vercel)
//   • otherwise the in-browser demo backend
// Both expose the same functions, loaded lazily so the unused one is never downloaded.

export const isDemo = !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

let implPromise;
const impl = () => (implPromise ??= isDemo ? import('./demoImpl.js') : import('./supabaseImpl.js'));

export const api = new Proxy(
  {},
  {
    get: (_, name) =>
      async (...args) => {
        const mod = await impl();
        if (typeof mod[name] !== 'function') throw new Error(`api.${String(name)} is not available`);
        return mod[name](...args);
      },
  },
);
