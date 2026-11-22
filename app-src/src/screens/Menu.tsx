import {useEffect, useRef, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {CATS, MENU, MODES} from '../business';
import {nowH, T, useStore} from '../store';
import {useUI} from '../ui/ctx';
import {DishRow, Me, TopBar} from '../ui/parts';
import {motionOn} from '../ui/motion';

export function Menu() {
  const s = useStore();
  const {go} = useUI();
  const [cat, setCat] = useState<string>(CATS[0].id);
  const chips = useRef<HTMLDivElement>(null);
  const morning = nowH() < 12;

  // Категория подсвечивается сама, пока листаешь меню.
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setCat((e.target as HTMLElement).dataset.sec!)),
      {rootMargin: '-150px 0px -60% 0px'},
    );
    document.querySelectorAll('[data-sec]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    chips.current?.querySelector('[aria-current="true"]')?.scrollIntoView({inline: 'nearest', block: 'nearest'});
  }, [cat]);

  const jump = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) scrollTo({top: el.getBoundingClientRect().top + scrollY - 130, behavior: motionOn() ? 'smooth' : 'auto'});
  };

  return (
    <>
      <TopBar>
        <Heading level={1}>Меню</Heading>
        <HStack gap={2} vAlign="center">
          <button type="button" className="cat" onClick={() => go('home')} aria-label={`Как забрать: ${MODES[s.mode].name}. Изменить`}>
            {MODES[s.mode].name}
          </button>
          <Me />
        </HStack>
      </TopBar>
      <div className="col">
        <div className="cats" ref={chips} role="navigation" aria-label="Разделы меню">
          {CATS.map((c) => (
            <button key={c.id} type="button" className="cat" aria-current={cat === c.id} onClick={() => jump(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <VStack gap={6} paddingBlockStart={2}>
          {CATS.map((c) => {
            const items = MENU.filter((m) => m.cat === c.id && (!m.morning || morning));
            return (
              <section key={c.id} id={`cat-${c.id}`} data-sec={c.id} aria-labelledby={`h-${c.id}`}>
                <Heading level={2} id={`h-${c.id}`}>
                  {c.name}
                </Heading>
                {c.id === 'breakfast' && (
                  <Text color="secondary" size="sm" display="block">
                    {T('Завтраки подаём весь день.')}
                  </Text>
                )}
                <div className="menu-list">
                  {items.map((m) => (
                    <DishRow key={m.id} m={m} />
                  ))}
                </div>
              </section>
            );
          })}
        </VStack>
      </div>
    </>
  );
}
