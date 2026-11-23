// Запросы админки. 401 — сессии нет или истекла: показываем вход.

export class AdminError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let onLogout: () => void = () => {};
export const setOnLogout = (f: () => void) => void (onLogout = f);

export async function adm<T>(path: string, init: {method?: string; body?: unknown; raw?: Blob} = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${import.meta.env.BASE_URL}api/admin${path}`, {
      method: init.method ?? (init.body === undefined && !init.raw ? 'GET' : 'POST'),
      credentials: 'same-origin',
      headers: init.raw ? {'Content-Type': 'image/jpeg'} : init.body === undefined ? {} : {'Content-Type': 'application/json'},
      body: init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
  } catch {
    throw new AdminError(0, 'Нет связи с сервером. Проверьте интернет и повторите.');
  }
  const data = (await r.json().catch(() => ({}))) as {error?: string; field?: string};
  if (r.status === 401 && path !== '/login') onLogout();
  if (!r.ok) throw new AdminError(r.status, data.error ?? 'Не получилось, повторите.', data.field);
  return data as T;
}

export type Sync = {at: number; ok: boolean; error?: string; full?: number; running?: boolean};

export const rub = (n: number) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(Math.round(n)) + ' ₽';
export const int = (n: number) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(n);
export function ago(t: number) {
  if (!t) return 'ещё не было';
  const m = Math.round((Date.now() - t) / 60e3);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  return new Date(t).toLocaleString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
}

/** Фото с телефона → кадр 4:5 по центру, 880×1100, JPEG. Сервер принимает до 3 МБ. */
export async function toMenuPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const W = 880, H = 1100;
  const k = Math.max(W / bmp.width, H / bmp.height);
  const w = W / k, h = H / k;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  cv.getContext('2d')!.drawImage(bmp, (bmp.width - w) / 2, (bmp.height - h) / 2, w, h, 0, 0, W, H);
  return new Promise((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error('Не получилось сжать фото.'))), 'image/jpeg', 0.84));
}
