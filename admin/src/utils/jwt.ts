export type Decoded = { sub?: string; email?: string; role?: string; exp?: number; [k: string]: any };

export function decodeJwt(token?: string | null): Decoded | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

