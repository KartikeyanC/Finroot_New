// How the web dashboard (and the Windows app, which wraps it) stays in step
// with changes made on the phone or in another window.
//
// Realtime pushes transactions, budgets and goals instantly (the tables in
// the supabase_realtime publication; see useRealtimeSync). Everything else is
// re-read: every query on screen refreshes once a minute while the window is
// visible, and again when the window regains focus. React Query pauses the
// interval for a hidden window and only refetches queries that are mounted,
// so the cost is one request per visible data source per minute.
//
// Adding a table to the realtime publication (a migration) would make it
// instant; this needs nothing on the server.

export const LIVE_REFRESH_MS = 60_000;

export const liveQueryDefaults = {
  staleTime: 60_000, // navigation within a minute reuses the cached copy
  gcTime: 5 * 60_000,
  retry: 1,
  refetchInterval: LIVE_REFRESH_MS,
  refetchOnWindowFocus: true,
} as const;
