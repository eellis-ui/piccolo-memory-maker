/**
 * Supabase caps every single query at the project's max_rows (1,000) no
 * matter what .limit() asks for, silently truncating the result. Any query
 * that can legitimately exceed that — analytics events over a window — must
 * page through .range() instead. Pages are fetched sequentially; `maxPages`
 * bounds the worst case.
 */
type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
  maxPages = 25,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const from = i * pageSize;
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: all, error: null };
}
