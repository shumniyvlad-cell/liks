import {createContext, useContext} from 'react';

export type TabId = 'home' | 'menu' | 'promos' | 'profile';
export type Sheet =
  | {k: 'dish'; id: string}
  | {k: 'cart'}
  | {k: 'auth'; then?: Sheet | null}
  | {k: 'code'; phone: string; name: string; then?: Sheet | null}
  | {k: 'pay'; via: 'sbp' | 'card'}
  | {k: 'paying'}
  | {k: 'status'; fresh?: boolean}
  | {k: 'promo'; id: string}
  | {k: 'bday'}
  | {k: 'history'}
  | {k: 'qr'};

export type UI = {
  sheet: Sheet | null;
  open: (s: Sheet) => void;
  close: () => void;
  go: (t: TabId) => void;
  toast: (body: string) => void;
};
export const UICtx = createContext<UI>(null!);
export const useUI = () => useContext(UICtx);
