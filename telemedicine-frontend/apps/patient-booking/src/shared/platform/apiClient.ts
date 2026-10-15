const BASE = "/api";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "x-correlation-id": crypto.randomUUID(),
      ...(init?.headers ?? {}),
    },
  });
}

export interface ProblemDetail { title?: string; detail?: string; }

export async function parseError(res: Response): Promise<{ message: string }> {
  try {
    const problem = (await res.json()) as ProblemDetail;
    return { message: problem.detail ?? problem.title ?? `Request failed (${res.status})` };
  } catch {
    return { message: `Request failed (${res.status})` };
  }
}
