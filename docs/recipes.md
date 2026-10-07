# Композиции для проектов

Примеры рассчитаны на React 19 и подключённый `@personal/capacities-ui/styles.css`. При обычной работе достаточно этой страницы и записей нужных компонентов в `agent-manifest.json`.

## Тема без мерцания

Задайте `data-theme` на сервере или в исходном HTML до первого рендера. При переключении обновляйте `document.documentElement.dataset.theme`. Сохранение предпочтения и обработка system mode принадлежат приложению. Для root без атрибутов библиотека выбирает Light, поверхность base и borders off. `data-borders="on"` включает декоративные границы; фокус и ошибки сохраняют собственные контуры в обоих режимах.

```tsx
import { IconButton } from '@personal/capacities-ui';
import { useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return <IconButton
    label={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
    icon={theme === 'light' ? 'moon' : 'sun'}
    onClick={() => {
      const next = theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }}
  />;
}
```

## Язык встроенного интерфейса

Без provider встроенный интерфейс русский. LocaleProvider требует locale="ru" или "en"; ближайший provider задаёт язык подписи действий и стандартного Intl-форматирования. Пользовательские подписи и данные не переводятся. Явный locale у Calendar/DatePicker/DailyHeader или поддерживаемый format callback меняет формат данных, сохраняя язык интерфейса.

```tsx
import { DailyHeader, LocaleProvider, useLocale, useTranslate } from '@personal/capacities-ui';

function LocalizedWorkspace() {
  const locale = useLocale();
  const t = useTranslate();
  return <section lang={locale}>
    <h2>{t('Мои заметки', 'My notes')}</h2>
    <DailyHeader date="2026-01-15" locale="de-DE" />
  </section>;
}

export function EnglishWorkspace() {
  return <LocaleProvider locale="en"><LocalizedWorkspace /></LocaleProvider>;
}
```

useTranslate возвращает t(ru, en) для собственных строк приложения. LocaleProvider/useLocale/useTranslate — утилиты; отдельные страницы компонентов им не нужны.

## Поверхность и локальные рамки

Контекст описывает фактический фон контейнера. На собственном `section` задайте заливку через `--cap-surface-current`; встроенная Card создаёт собственный raised-контекст. Переключатель рамок меняет декоративные границы без изменения размеров. Popup сохраняет тему, акцент и режим рамок, а его поверхность остаётся floating.

```tsx
import { Button, Card, Popover, Switch, Tag } from '@personal/capacities-ui';
import { useState } from 'react';

export function ContextExample() {
  const [borders, setBorders] = useState(false);
  return <section data-theme="dark" data-surface="canvas" data-accent="teal"
    data-borders={borders ? 'on' : 'off'}
    style={{ background: 'var(--cap-surface-current)', padding: 24 }}>
    <Switch label="Показывать рамки" checked={borders}
      onChange={event => setBorders(event.target.checked)} />
    <Card>
      <Tag>Текущий проект</Tag>
      <Popover label="Настройки" size="sm">
        <Switch label="Показывать свойства" defaultChecked />
      </Popover>
      <Button variant="secondary" onClick={() => setBorders(value => !value)}>
        Переключить рамки
      </Button>
    </Card>
  </section>;
}
```

Контекст наследуется. Не меняйте фон самостоятельного слота на canvas, оставляя ему raised-контекст. Точное соответствие ролей и поверхностей: [surface-context.md](surface-context.md).

## Единая высота составных действий

`ActionBar.size`, `ButtonGroup.size` и `SplitButton.size` используют одну шкалу. Внутренние отступы группы уже включены в её внешнюю высоту. Вложенная группа может переопределить размер. Поля и сложные Select/Popover сохраняют обычную навигацию, если поставить `rovingFocus={false}`.

```tsx
import { ActionBar, ButtonGroup, IconButton, Popover, Switch } from '@personal/capacities-ui';
import { useState } from 'react';

export function CollectionActions() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  return <ActionBar label="Представление коллекции" size="md" rovingFocus={false}>
    <ButtonGroup label="Вид" prefix="99+">
      <IconButton label="Карточки" icon="grid" variant="ghost"
        aria-pressed={view === 'grid'} onClick={() => setView('grid')} />
      <IconButton label="Список" icon="list" variant="ghost"
        aria-pressed={view === 'list'} onClick={() => setView('list')} />
    </ButtonGroup>
    <Popover label="Параметры">
      <Switch label="Показывать даты" defaultChecked />
    </Popover>
  </ActionBar>;
}
```

Геометрия popup не уменьшается вместе с кнопкой панели. `Popover.size` задаёт отдельный размер триггера вне ActionBar. Примеры в каталоге: `#ActionBar`, `#ButtonGroup`, `#SplitButton` и `#Popover`.

## Прокрутка без цветной подложки

```tsx
import { Button, Card, ScrollArea } from '@personal/capacities-ui';

export function Notes({ notes }: { notes: string[] }) {
  return <Card>
    <ScrollArea label="Заметки" scrollbar="auto" fade="vertical"
      fadeSize={24} fadeReveal={96} style={{ height: 240 }}
      floating={<Button onClick={() => window.print()}>Печать</Button>}>
      {notes.map((note, index) => <p key={index}>{note}</p>)}
    </ScrollArea>
  </Card>;
}
```

`scrollbar="hidden"` скрывает полосу, сохраняя wheel/touch/keyboard. Горизонтальный режим по умолчанию hidden, vertical/both — auto. Краевые маски открывают реальный фон по сторонам overflow; без overflow содержимое не затемняется. `fade={false}`/`"none"` отключает маски, явный fade имеет приоритет над совместимым shadows. fade принимает ось, физический край или start/end с учётом RTL. fadeSize — число px или CSS length, по умолчанию min(12%, space-10); fadeReveal — расстояние плавного раскрытия, по умолчанию 2 × space-12, 0 — сразу. floating находится вне маски и сохраняет тень; встроенный запас места учитывает его высоту. `ref` указывает на внутренний viewport — вызывайте `scrollTo` и измеряйте прокрутку именно у него. Пример: `#ScrollArea`.

## Вложенные изменяемые панели

Размеры ResizablePanelGroup — числовые проценты доступного места после ручек. Содержимое не должно задавать минимальную ширину всей композиции. Для вертикальной группы ограничьте высоту родителя; локальную прокрутку задавайте через ScrollArea. Группа состоит из прямых Panel/Handle children, другую группу вкладывайте внутрь Panel.

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea } from '@personal/capacities-ui';
import { useState } from 'react';

export function SplitWorkspace() {
  const [layout, setLayout] = useState([30, 70]);
  return <ResizablePanelGroup label="Рабочая область" layout={layout}
    onLayoutChange={setLayout} style={{ height: 420 }}>
    <ResizablePanel label="Навигация" minSize={15} maxSize={45} surface="canvas">
      <ScrollArea label="Список проектов" style={{ height: '100%' }}>Проекты</ScrollArea>
    </ResizablePanel>
    <ResizableHandle withHandle label="Ширина навигации" />
    <ResizablePanel label="Основное содержимое" minSize={35} surface="base">
      <ResizablePanelGroup label="Документ и свойства" orientation="vertical" defaultLayout={[65, 35]}>
        <ResizablePanel label="Документ" minSize={20}>
          <ScrollArea label="Документ" style={{ height: '100%' }}>Содержимое</ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle label="Высота документа" />
        <ResizablePanel label="Свойства" minSize={15}>Свойства документа</ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
  </ResizablePanelGroup>;
}
```

Panel defaultSize/minSize/maxSize задаёт начальный размер и границы в процентах; незаданные начальные размеры делят остаток. Управляемому layout нужен onLayoutChange; onLayoutCommit подходит для сохранения завершённого изменения. Стрелки меняют step (по умолчанию 1%), Shift — ×10, Home/End — границы пары, Escape отменяет drag. withHandle показывает grip; скрытый grip сохраняет доступный separator. surface по умолчанию inherit, собственную структурную границу добавляйте через cap-surface-boundary только для намеренно совпадающих вложенных поверхностей. Для боковых панелей в px с адаптивным складыванием используйте ContentLayout, для одной карточки — ResizableCard.

## Форма с валидацией

```tsx
import { Button, Field, Input } from '@personal/capacities-ui';
import { useState } from 'react';

export function ProjectForm({ save }: { save: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form onSubmit={async e => {
    e.preventDefault();
    if (!title.trim()) { setError('Введите название'); return; }
    setError(''); setBusy(true);
    try { await save(title.trim()); }
    catch { setError('Не удалось сохранить. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }}>
    <Field label="Название проекта" error={error} required>
      {props => <Input {...props} value={title} onChange={e => setTitle(e.target.value)} />}
    </Field>
    <Button type="submit" variant="primary" loading={busy}>Сохранить</Button>
  </form>;
}
```

`Field` передаёт `id`, `required`, `aria-invalid` и `aria-describedby`. Не теряйте эти props при оборачивании поля. Кнопка по умолчанию имеет `type="button"`; submit указывайте явно.

## Коллекция с фильтром и созданием

Полная компилируемая композиция — `examples/ProjectBoard.tsx`: поиск, карточки, списки, empty state, диалог и создание объекта. Состояние остаётся в React и легко заменяется собственным API.

## Кнопка с контекстными действиями

```tsx
import { Menu } from '@personal/capacities-ui';

export function ObjectActions({ open, archive }: { open: () => void; archive: () => void }) {
  return <Menu label="Действия с объектом" items={[
    { id: 'open', label: 'Открыть', icon: 'external', onSelect: open },
    { id: 'archive', label: 'Архивировать', icon: 'folder', separator: true, onSelect: archive },
  ]} />;
}
```

Menu поддерживает стрелки, Home/End, выбор Enter/Space, поиск по первой букве и Escape. `shortcut` — отображение клавиши, а не регистрация глобального сочетания.

## Глобальный поиск

Передавайте `CommandPalette` массив команд `{ id, label, description?, icon?, shortcut?, onSelect }`. Приложение само регистрирует `Cmd/Ctrl+K` и управляет `open`. Поиск локальный, без обращения к сети. Для большого серверного поиска используйте собственный слой данных и отдельный компонент.

## Подключение без React

`tokens.css` не зависит от фреймворка. Классы визуальных примитивов в `styles.css` тоже обычный CSS:

```html
<button class="cap-button" data-size="md" data-variant="primary" type="button">Создать</button>
<span class="cap-tag" data-color="purple"><span class="cap-tag-label">Исследование</span></span>
```

Сложные контролы требуют соответствующего поведения, ARIA и фокуса; один класс не превращает div в доступный диалог или меню.

## Контент и каталог

Для локального цвета оберните группу в `<section data-accent="purple">`. `Tag` и `IconBox` без color наследуют локальный акцент. `Badge` и `TypeLabel` сохранены только как совместимые обёртки Tag. Акцентное действие: `<Button variant="accent">`. Свет/темнота задаются независимо через data-theme.

У каждого канонического компонента своя страница `#ComponentName`; переходите сразу к нужному примеру по маршруту из agent-manifest. Полная композиция: `examples/WorkspaceV2.tsx`. API контентных блоков: `docs/content-guide.md`. Контракт motion, состояний и адаптива: `docs/behavior.md`.

## Настраиваемая карточка и перестановка

```tsx
const [items, setItems] = useState(projects); // unique stable id per item
<ReorderableList label="Проекты" items={items} onOrderChange={setItems}
  getItemLabel={item => item.title} handlePlacement="custom"
  renderItem={(item, { handle }) => <ContentCard title={item.title}
    dragHandle={handle} onOpen={() => open(item.id)}
    blocks={[{ id: 'tags', content: <Tag>{item.tag}</Tag> }]}
    blockOrder={['header', 'title', 'tags', 'description']}
    hiddenBlocks={compact ? ['description'] : []}
    description={item.description} />}
/>
```

Для единой подписи семейства: `<Input label="Название" labelPlacement="inside" />`, `<Select label="Тип" labelPlacement="inside" options={types} />`, `<Textarea label="Описание" labelPlacement="inside" />`. Переключение на `outside` меняет только размещение подписи, не значение и не связь с полем.
