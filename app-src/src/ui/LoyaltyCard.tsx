// Карта гостя по айдентике: лес, огромный росчерк знака, как на футболке бариста, и знак «Ликс кофейня».
// Пять фирменных стаканчиков наливаются по одному за заказ, шестое — пирожное в подарок.
// Мышью карта наклоняется до 7° и ловит блик; нажатие переворачивает её к QR для кассы.

import {useEffect, useMemo, useRef, useState, type PointerEvent} from 'react';
import qrcode from 'qrcode-generator';
import {level, plural, useStore, vibrate} from '../store';
import {motionOn} from './motion';
import {useUI} from './ctx';
import {ART, LogoFull, LogoScript} from './brand';

export function qrSvg(text: string) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({cellSize: 4, margin: 0, scalable: true});
}

/** Штамп: фирменный стаканчик из айдентики наливается снизу; шестой — пирожное в подарок. */
function Cup({fill, gift, delay}: {fill: number; gift?: boolean; delay: number}) {
  const id = useMemo(() => 'c' + Math.random().toString(36).slice(2, 8), []);
  const a = ART[gift ? 'cupcake' : 'togo'];
  const [x, y, w, h] = a.vb.split(' ').map(Number);
  return (
    <svg className={`cup${gift ? ' cup--gift' : ''}${gift && fill ? ' is-ready' : ''}`} viewBox={a.vb} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={a.d} />
        </clipPath>
      </defs>
      <path className="cup__empty" d={a.d} />
      <g clipPath={`url(#${id})`}>
        <rect className="cup__liquid" x={x} y={y} width={w} height={h} style={{['--fill' as string]: fill, ['--delay' as string]: `${delay}s`}} />
      </g>
    </svg>
  );
}

export function LoyaltyCard() {
  const {user} = useStore();
  const {open} = useUI();
  const [flipped, setFlipped] = useState(false);
  const [poured, setPoured] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);
  const stamps = user?.stamps ?? 0;
  const lv = level(user);

  // Чашки наливаются после показа карты, а не сразу полными.
  useEffect(() => {
    if (!motionOn()) return setPoured(stamps);
    const t = setTimeout(() => setPoured(stamps), 260);
    return () => clearTimeout(t);
  }, [stamps]);

  const tilt = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || !motionOn() || flipped) return;
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('is-tilting');
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.style.setProperty('--glare', '1');
  };
  const untilt = () => {
    const el = ref.current!;
    el.classList.remove('is-tilting');
    ['--rx', '--ry'].forEach((p) => el.style.setProperty(p, '0deg'));
    el.style.setProperty('--glare', '0');
  };

  const onClick = () => {
    if (!user) return open({k: 'auth'});
    untilt();
    setFlipped((f) => !f);
    vibrate(6);
  };

  return (
    <div className="loyal-wrap">
      <button
        ref={ref}
        type="button"
        className={`loyal${flipped ? ' is-flipped' : ''}`}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        onClick={onClick}
        aria-label={user ? (flipped ? 'Карта гостя, код для кассы. Нажмите, чтобы вернуть' : 'Карта гостя. Нажмите, чтобы показать код на кассе') : 'Карта гостя. Войдите по номеру'}>
        <span className="loyal__face loyal__front">
          <LogoScript className="loyal__script" />
          <span className="loyal__top">
            <span className="loyal__level">{user ? `${lv.name}, кешбэк ${lv.cash}%` : 'Карта гостя'}</span>
            <span className="loyal__pts">
              {user ? (
                <>
                  <b>{user.points}</b>
                  <small>{plural(user.points, 'балл', 'балла', 'баллов')}</small>
                </>
              ) : (
                <span className="loyal__login">Войти по номеру</span>
              )}
            </span>
          </span>
          <span className="loyal__bottom">
            <LogoFull className="loyal__logo" />
            <span className="cups" role="img" aria-label={`${stamps} из 5 чашек, шестая в подарок`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Cup key={i} fill={i < poured ? 1 : 0} delay={i * 0.12} />
              ))}
              <Cup gift fill={poured >= 5 ? 1 : 0} delay={0.7} />
            </span>
          </span>
        </span>
        <span className="loyal__face loyal__back" aria-hidden={!flipped}>
          <span className="qr" dangerouslySetInnerHTML={{__html: qrSvg(user?.code ?? 'LIKS-GUEST')}} />
          <span className="loyal__back-t">
            <b>Покажите на кассе</b>
            <span>Баллы и чашки начислятся сами. Код {user?.code}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
