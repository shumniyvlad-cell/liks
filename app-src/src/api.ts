// Связь с сервером Ликса. Сборка для сервера (VITE_BACKEND=server) ходит в /api на том же адресе;
// демо на GitHub Pages сервера не имеет и всё считает в браузере.

export const online = import.meta.env.VITE_BACKEND === 'server';

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${import.meta.env.BASE_URL}api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : {'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Нет связи с кофейней. Проверьте интернет и попробуйте ещё раз.');
  }
  const data = (await r.json().catch(() => ({}))) as {error?: string; field?: string};
  if (!r.ok) throw new ApiError(r.status, data.error ?? 'Не получилось, попробуйте ещё раз.', data.field);
  return data as T;
}
