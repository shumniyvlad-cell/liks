// Вход приложения. С сервером сначала берём меню с ценами кассы и только потом грузим экраны:
// корзина и карточки сразу видят настоящие цены. Нет ответа за 4 секунды — показываем меню из кода.
import {online} from './api';
import {setMenu, type Item} from './business';

async function boot() {
  if (online) {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/menu`, {signal: AbortSignal.timeout(4000)});
      const j = (await r.json()) as {items: Item[] | null};
      if (r.ok && j.items?.length) setMenu(j.items);
    } catch {
      // меню из кода
    }
  }
  await import('./root');
}
void boot();
