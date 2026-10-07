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
import { ScrollArea } from '@personal/capacities-ui';

export function Notes({ notes }: { notes: string[] }) {
  return <ScrollArea label="Заметки" scrollbar="auto" style={{ height: 240 }}>
    {notes.map((note, index) => <p key={index}>{note}</p>)}
  </ScrollArea>;
}
```

`scrollbar="hidden"` скрывает полосу, сохраняя wheel/touch/keyboard. Горизонтальный режим по умолчанию hidden, vertical/both — auto. Краевые маски открывают реальный фон по сторонам overflow; `shadows={false}` отключает их. `ref` указывает на внутренний viewport — вызывайте `scrollTo` и измеряйте прокрутку именно у него. Пример: `#ScrollArea`.

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

У каждого из 61 компонента своя страница `#ComponentName`; переходите сразу к нужному примеру по маршруту из agent-manifest. Полная композиция: `examples/WorkspaceV2.tsx`. API контентных блоков: `docs/content-guide.md`. Контракт motion, состояний и адаптива: `docs/behavior.md`.

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
