import {VStack} from '@astryxdesign/core/VStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {PROMOS} from '../business';
import {T} from '../store';
import {Me, PromoTile, TopBar} from '../ui/parts';

export function Promos() {
  return (
    <>
      <TopBar>
        <Heading level={1}>Акции</Heading>
        <Me />
      </TopBar>
      <VStack className="col" gap={3} paddingBlockStart={1}>
        <Text color="secondary">{T('Скидки считаются в корзине сами, промокоды не нужны.')}</Text>
        {PROMOS.map((p) => (
          <PromoTile key={p.id} p={p} wide />
        ))}
      </VStack>
    </>
  );
}
