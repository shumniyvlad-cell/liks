// Свои иконки там, где у heroicons нет нужного смысла: стаканчик, столик, машина у входа.
import type {SVGProps} from 'react';

const base = {viewBox: '0 0 28 28', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true} as const;
type P = SVGProps<SVGSVGElement>;

export const CupIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 13h16v3.5A7.5 7.5 0 0 1 13.5 24h-1A7.5 7.5 0 0 1 5 16.5Z" /><path d="M21 14.5h1.2a2.8 2.8 0 0 1 0 5.6H20" /><path d="M11 4.5c-1.6 1.4 1.6 2.6 0 4.6M15 4.5c-1.6 1.4 1.6 2.6 0 4.6" /></svg>
);
export const CupSolid = (p: P) => (
  <svg {...base} {...p}><path d="M5 13h16v3.5A7.5 7.5 0 0 1 13.5 24h-1A7.5 7.5 0 0 1 5 16.5Z" fill="currentColor" /><path d="M21 14.5h1.2a2.8 2.8 0 0 1 0 5.6H20" /><path d="M11 4.5c-1.6 1.4 1.6 2.6 0 4.6M15 4.5c-1.6 1.4 1.6 2.6 0 4.6" /></svg>
);
export const HallIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 12h16M8 12v11M20 12v11M10 7h8M14 7v5" /></svg>
);
export const TogoIcon = (p: P) => (
  <svg {...base} {...p}><path d="M8 9h12l-1.4 14H9.4Z" /><path d="M7 9h14M10 9l.8-3.5h6.4L18 9" /></svg>
);
export const CarIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 18v-4l2.5-5.5h13L23 14v4" /><path d="M4 18h20v3H4z" /><circle cx="8.5" cy="21.5" r="1.8" /><circle cx="19.5" cy="21.5" r="1.8" /></svg>
);
export const PinIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="14" cy="11" r="4" /><path d="M14 25s-8-7-8-14a8 8 0 0 1 16 0c0 7-8 14-8 14Z" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base} viewBox="0 0 20 20" strokeWidth={2.2} {...p}><path d="M10 4v12M4 10h12" /></svg>
);
export const SbpIcon = (p: P) => (
  <svg {...base} viewBox="0 0 26 26" {...p}><path d="M4 6.5 13 2l9 4.5v13L13 24l-9-4.5Z" /><path d="M13 2v22M4 6.5l18 13M22 6.5l-18 13" /></svg>
);
export const CardIcon = (p: P) => (
  <svg {...base} viewBox="0 0 26 26" {...p}><rect x="3" y="6" width="20" height="14" rx="3" /><path d="M3 11h20M7 16h4" /></svg>
);
export const CashIcon = (p: P) => (
  <svg {...base} viewBox="0 0 26 26" {...p}><rect x="3" y="7" width="20" height="12" rx="2" /><circle cx="13" cy="13" r="2.8" /></svg>
);
export const ShareIcon = (p: P) => (
  <svg {...base} viewBox="0 0 24 24" {...p}><circle cx="17" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="18.5" r="2.5" /><path d="m8.2 10.8 6.6-4M8.2 13.2l6.6 4" /></svg>
);
export const MODE_ICON = {hall: HallIcon, togo: TogoIcon, car: CarIcon, delivery: PinIcon};
