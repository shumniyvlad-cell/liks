// Столбики одной серии: цвет бренда, верх скруглён на 4px, зазор 2px, подсказка при наведении и с клавиатуры.
// Одна серия — без легенды, название даёт заголовок карточки. Под графиком — те же цифры таблицей.
import {useEffect, useId, useRef, useState} from 'react';

export type Bar = {key: string; label: string; value: number; note?: string};

export function Bars({data, format, height = 180, every = 1}: {data: Bar[]; format: (n: number) => string; height?: number; every?: number}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Подписи по оси — не теснее 44px.
  every = Math.max(every, Math.ceil((data.length * 44) / W));
  const H = height;
  const top = 8, bottom = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = W / Math.max(1, data.length);
  const bw = Math.max(4, Math.min(28, step - 2));
  const y = (v: number) => H - bottom - ((H - top - bottom) * v) / max;
  const bar = (x: number, v: number) => {
    const y0 = H - bottom, y1 = y(v);
    const r = Math.min(4, bw / 2, y0 - y1);
    if (y0 - y1 < 0.5) return '';
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y0} Z`;
  };
  const h = hover == null ? null : data[hover];
  return (
    <figure ref={ref} className="adm-chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id} className="adm-chart__svg">
        <title id={id}>{data.map((d) => `${d.label}: ${format(d.value)}`).join('; ')}</title>
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} className="adm-chart__base" />
        {data.map((d, i) => {
          const x = i * step + (step - bw) / 2;
          return (
            <g key={d.key}>
              <rect x={i * step} y={0} width={step} height={H - bottom} className="adm-chart__hit" onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`} />
              <path d={bar(x, d.value)} className={'adm-chart__bar' + (hover === i ? ' is-on' : '')} />
              {(i % every === 0 || i === data.length - 1) && (
                <text x={i * step + step / 2} y={H - 6} textAnchor="middle" className="adm-chart__tick">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {h && (
        <figcaption className="adm-chart__tip" style={{left: `${((hover! + 0.5) / data.length) * 100}%`}}>
          <b>{format(h.value)}</b>
          <span>{h.note ?? h.label}</span>
        </figcaption>
      )}
    </figure>
  );
}
