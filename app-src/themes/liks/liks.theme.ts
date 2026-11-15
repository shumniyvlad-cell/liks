// The liks theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in liks.settings.json and the generated liks.settings.ts;
// change them with `astryx experimental theme editor set liks ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {liksSettings} from './liks.settings';

export const liksTheme = defineTheme({
  extends: liksSettings,
  name: 'liks',
});
