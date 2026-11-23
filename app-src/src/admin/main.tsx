import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '../app.css';
import './admin.css';
import {Theme} from '@astryxdesign/core/theme';
import {LayerProvider} from '@astryxdesign/core/Layer';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import ruRU from '@astryxdesign/core/locales/ru-RU.generated.js';
import {themes, defaultThemeSlug} from '../astryx-themes';
import Admin from './Admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InternationalizationProvider locale="ru-RU" messages={{'ru-RU': ruRU}}>
      <Theme theme={themes[defaultThemeSlug]} mode="system">
        <LayerProvider>
          <Admin />
        </LayerProvider>
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
);
