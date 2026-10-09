# Project composition recipes

These examples target React 19 with `sloyui/styles.css` imported. For routine work, this page and the relevant component records in `agent-manifest.json` are sufficient.

## Theme without flicker

Set `data-theme` on the server or in the initial HTML before the first render. On toggle, update `document.documentElement.dataset.theme`. The application owns preference persistence and system mode. Without root attributes, the library selects Light, base surface and borders off. `data-borders="on"` enables decorative boundaries; focus and errors retain their own outlines in both modes.

```tsx
import { IconButton } from 'sloyui';
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

## Built-in interface language

Without a provider, the built-in interface is Russian. LocaleProvider requires locale="ru" or "en"; the nearest provider controls action labels and default Intl formatting. Custom labels and data are not translated. An explicit locale on Calendar/DatePicker/DailyHeader or a supported format callback changes data formatting while preserving interface language.

```tsx
import { DailyHeader, LocaleProvider, useLocale, useTranslate } from 'sloyui';

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

useTranslate returns t(ru, en) for application strings. LocaleProvider/useLocale/useTranslate are utilities and do not need separate component catalogue pages.

## Surface and local borders

Context describes the actual container background. Paint custom `section` elements with `--cap-surface-current`; built-in Card establishes its own raised context. The border toggle changes decorative outlines without changing dimensions. Popups preserve theme, accent and border mode while keeping a floating surface.

```tsx
import { Button, Card, Popover, Switch, Tag } from 'sloyui';
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

Context is inherited. Do not paint a standalone slot as canvas while leaving its context raised. For exact role/surface mappings, see [surface-context.md](surface-context.md).

## Shared height for composite actions

`ActionBar.size`, `ButtonGroup.size` and `SplitButton.size` use one scale. Group padding is included in its outer height. Nested groups can override size. Fields and complex Select/Popover controls retain normal navigation with `rovingFocus={false}`.

```tsx
import { ActionBar, ButtonGroup, IconButton, Popover, Switch } from 'sloyui';
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

Popup geometry does not shrink with the toolbar button. `Popover.size` sets the standalone trigger size outside ActionBar. Catalogue examples: `#ActionBar`, `#ButtonGroup`, `#SplitButton` and `#Popover`.

## Scrolling without an extra background fill

```tsx
import { Button, Card, ScrollArea } from 'sloyui';

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

`scrollbar="hidden"` hides the bar while preserving wheel/touch/keyboard scrolling. Horizontal defaults to hidden; vertical/both defaults to auto. Edge masks reveal the actual background beside overflow; without overflow, content is not dimmed. `fade={false}`/`"none"` disables masks; explicit fade takes precedence over compatibility shadows. fade accepts an axis, physical edge or start/end with RTL awareness. fadeSize is a px number or CSS length, defaulting to min(12%, space-10); fadeReveal is the gradual reveal distance, defaulting to 2 × space-12, with 0 meaning immediate. floating sits outside the mask and preserves its shadow; built-in clearance accounts for its height. `ref` targets the inner viewport: call `scrollTo` and measure scrolling there. Example: `#ScrollArea`.

## Nested resizable panels

ResizablePanelGroup sizes are numeric percentages of the space remaining after handles. Content must not impose a minimum width on the entire composition. Constrain the parent height for vertical groups; use ScrollArea for local scrolling. Groups contain direct Panel/Handle children; nest another group inside a Panel.

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea } from 'sloyui';
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

Panel defaultSize/minSize/maxSize set initial sizes and limits in percentages; unspecified initial sizes share the remainder. Controlled layout requires onLayoutChange; onLayoutCommit can persist completed changes. Arrow keys change step (default 1%), Shift multiplies it by 10, Home/End reach pair limits, and Escape cancels drag. withHandle displays the grip; a hidden grip retains an accessible separator. surface defaults to inherit; add cap-surface-boundary only for intentionally matching nested surfaces. Use ContentLayout for pixel-based side panels with responsive collapse, or ResizableCard for a single card.

## Form validation

```tsx
import { Button, Field, Input } from 'sloyui';
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

`Field` forwards `id`, `required`, `aria-invalid` and `aria-describedby`. Preserve these props when wrapping a field. Buttons default to `type="button"`; set submit explicitly.

## Collection with filtering and creation

The complete compilable composition is `examples/ProjectBoard.tsx`: search, cards, lists, empty state, dialog and object creation. State remains in React and can be replaced with an application API.

## Button with contextual actions

```tsx
import { Menu } from 'sloyui';

export function ObjectActions({ open, archive }: { open: () => void; archive: () => void }) {
  return <Menu label="Действия с объектом" items={[
    { id: 'open', label: 'Открыть', icon: 'external', onSelect: open },
    { id: 'archive', label: 'Архивировать', icon: 'folder', separator: true, onSelect: archive },
  ]} />;
}
```

Menu supports arrow keys, Home/End, Enter/Space selection, first-letter search and Escape. `shortcut` displays a key; it does not register a global shortcut.

## Global search

Pass `CommandPalette` commands shaped as `{ id, label, description?, icon?, shortcut?, onSelect }`. The application registers `Cmd/Ctrl+K` and controls `open`. Search is local and does not access the network. For large server searches, use an application data layer and a separate component.

## Use without React

`tokens.css` is framework-independent. Visual primitive classes in `styles.css` are also plain CSS:

```html
<button class="cap-button" data-size="md" data-variant="primary" type="button">Создать</button>
<span class="cap-tag" data-color="purple"><span class="cap-tag-label">Исследование</span></span>
```

Complex controls require appropriate behavior, ARIA and focus management; a class alone does not turn a div into an accessible dialog or menu.

## Content and catalogue

Wrap a group in `<section data-accent="purple">` for local color. `Tag` and `IconBox` without color inherit the local accent. `Badge` and `TypeLabel` remain compatibility wrappers around Tag. Accent action: `<Button variant="accent">`. Appearance is independently selected through data-theme.

Each canonical component has its own `#ComponentName` page; use the route from agent-manifest to open the relevant example directly. Full composition: `examples/WorkspaceV2.tsx`. Content block API: `docs/content-guide.md`. Motion, state and responsive contracts: `docs/behavior.md`.

## Configurable card and reordering

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

For shared field-family labels: `<Input label="Название" labelPlacement="inside" />`, `<Select label="Тип" labelPlacement="inside" options={types} />`, `<Textarea label="Описание" labelPlacement="inside" />`. Switching to `outside` changes label placement only, not the value or field association.
