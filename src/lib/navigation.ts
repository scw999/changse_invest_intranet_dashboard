export type QueryValue = string | number | boolean | null | undefined;

export function buildHref(pathname: string, query: Record<string, QueryValue>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) {
      return;
    }

    params.set(key, String(value));
  });

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function buildArchiveHref(query: Record<string, QueryValue>) {
  return buildHref("/archive", query);
}

export function buildFollowUpHref(query: Record<string, QueryValue>) {
  return buildHref("/follow-up", query);
}
