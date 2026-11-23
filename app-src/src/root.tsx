import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './app.css';
import {Theme} from '@astryxdesign/core/theme';
import {LayerProvider} from '@astryxdesign/core/Layer';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import ruRU from '@astryxdesign/core/locales/ru-RU.generated.js';
import {themes, defaultThemeSlug} from './astryx-themes';
import {useStore} from './store';
import './ui/motion';
import App from './App';

// Тема: 'system' — как в телефоне; гость меняет её в профиле.
function Root() {
  const {theme} = useStore();
  return (
    <Theme theme={themes[defaultThemeSlug]} mode={theme}>
      <LayerProvider>
        <App />
      </LayerProvider>
    </Theme>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InternationalizationProvider locale="ru-RU" messages={{'ru-RU': ruRU}}>
      <Root />
    </InternationalizationProvider>
  </StrictMode>,
);
