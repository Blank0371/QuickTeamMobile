// Fetch every row of a query, past PostgREST's per-response row cap (Supabase
// default: 1000). The first page also asks for the exact count; the remaining
// pages are then requested in parallel. The page size follows what the server
// actually returned, so a lower `max_rows` setting is handled too.
//
// `page(from, to, count)` must build the same query each time with a stable
// order (e.g. `.order("id")`), applying `.range(from, to)` and, when `count` is
// set, `{ count }` in its select.
type PageResult<T> = { data: T[] | null; error: any; count?: number | null };

export async function fetchAll<T>(
  page: (from: number, to: number, count?: "exact") => PromiseLike<PageResult<T>>,
  size = 1000,
): Promise<{ data: T[]; error: any }> {
  const first = await page(0, size - 1, "exact");
  if (first.error) return { data: [], error: first.error };
  const rows = first.data ?? [];
  const total = first.count ?? rows.length;
  if (rows.length === 0 || rows.length >= total) return { data: rows, error: null };

  const step = rows.length; // the server's effective page size
  const rest: PromiseLike<PageResult<T>>[] = [];
  for (let from = step; from < total; from += step) rest.push(page(from, from + step - 1));
  const pages = await Promise.all(rest);
  const failed = pages.find((p) => p.error);
  if (failed) return { data: [], error: failed.error };
  return { data: rows.concat(...pages.map((p) => p.data ?? [])), error: null };
}
