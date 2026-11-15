// Движение: системная настройка «Уменьшить движение» или флаг ?motion=1 (запоминается).
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let forced = false;
try {
  const q = new URLSearchParams(location.search).get('motion');
  if (q === '1') localStorage.setItem('liks:motion', '1');
  if (q === '0') localStorage.removeItem('liks:motion');
  forced = localStorage.getItem('liks:motion') === '1';
} catch {
  /* приватный режим */
}
export const motionOn = () => forced || !mq.matches;
const sync = () => (document.documentElement.dataset.motion = motionOn() ? 'on' : 'off');
sync();
mq.addEventListener?.('change', sync);
