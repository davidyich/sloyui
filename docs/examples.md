# Короткие примеры

## Цветные элементы на нужной поверхности

```tsx
import { Tag, Button } from '@personal/capacities-ui';
import '@personal/capacities-ui/styles.css';

<section data-surface="canvas" data-accent="purple"
  style={{ background: 'var(--cap-surface-current)' }}>
  <Tag icon="tag" count={8} size="sm" onClick={select}
    onRemove={remove}>Исследование</Tag>
  <Tag disabled onRemove={remove}>Недоступно</Tag>
  <Button variant="accent" onClick={create}>Создать</Button>
</section>
```

Тему и обводки задайте выше: `data-theme="dark"`, `data-borders="off"`. У вложенного участка можно изменить только поверхность или акцент.

## Поля одного размера

```tsx
<Checkbox size="sm" label="Уведомления" checked={enabled}
  onChange={event => setEnabled(event.target.checked)} />
<Radio size="sm" name="access" value="private" label="Личное" />
<Radio size="sm" name="access" value="team" label="Команда" />
<Slider size="sm" label="Плотность" value={density}
  onChange={event => setDensity(Number(event.target.value))} />
```

## Боковые панели

```tsx
<ContentLayout contentWidth={640}
  left={{ label: 'Коллекции', content: collections, open: leftOpen,
    onOpenChange: setLeftOpen, width: leftWidth, onWidthChange: setLeftWidth }}
  right={{ label: 'Свойства', content: properties, open: rightOpen,
    onOpenChange: setRightOpen, contentWidth: 280 }}>
  {document}
</ContentLayout>
```

## Иконка из Lucide

```tsx
import { BookOpen } from 'lucide-react';
import { Icon, Tag } from '@personal/capacities-ui';

<Icon name={BookOpen} size={20} />
<Tag icon={BookOpen} count={4}>Книги</Tag>
```

Для прямого импорта установите `lucide-react` в приложение. Встроенные имена Icon уже входят в пакет. Полный визуальный выбор — `#IconPicker`.

## Где взять полную композицию

- `recipes.md`: тема без мерцания, формы, окна, коллекции.
- `../examples/ProjectBoard.tsx`: доска проектов.
- `../examples/WorkspaceV2.tsx`: управляемый рабочий экран.

Примеры используют состояние приложения (`select`, `remove`, `create`, `enabled`, `density`). Не копируйте их как фиктивные обработчики без поведения.

## Статичная метка и оформление счётчика

```tsx
<Tag interactive={false} icon="book" count="99+"
  counter={{variant: 'white', shape: 'rounded'}}>Книги</Tag>
<Counter value={128} max={99} variant="accent" shape="rounded" />
<Switch label="Уведомления" color="green" size="sm" defaultChecked />
```

Импортируйте Tag, Counter и Switch из пакета. Для нескольких связанных Select используйте ButtonGroup; клавиатура и подписи каждого поля сохраняются.

## Плавающие действия без обрезанной тени

```tsx
<ScrollArea label="Заметки" style={{ height: 320 }} floating={
  <FloatingActionBar label="Действия" size="xl" position="static"
    trailing={<Button variant="primary" onClick={save}>Сохранить</Button>}>
    <IconButton label="Копировать" icon="copy" variant="ghost" onClick={copy} />
  </FloatingActionBar>
}>
  {notes}
</ScrollArea>
```

Панель — сосед scroll viewport. Оставьте внешнему контейнеру место для тени. Общие настройки каталога используют эту же панель снизу, вне основной прокрутки.

## Параметр с точной настройкой

```tsx
<ValueScrubber label="Масштаб" value={scale} min={50} max={150} step={5}
  onValueChange={setScale} formatValue={value => `${value}%`} />
```

Клавиатура поддерживает стрелки и Home/End; Alt+перетаскивание меняет значение по шагам, Shift делает шаг тоньше.

## JSON-блоки редактора

```tsx
const [note, setNote] = useState<RichTextDocument>({ blocks: [
  createRichTextBlock('heading2', [{ text: 'Заметка' }]),
  createRichTextBlock('paragraph', [{ text: 'Текст для команды.' }]),
] });

<RichTextEditor label="Заметка" value={note} onValueChange={setNote} />
```

Состояние содержит блоки, ID и marks; оно не хранит произвольный HTML. Наведите на строку и перетащите за ручку слева; клик по ней открывает меню. Для клавиатуры: Alt+↑/↓ на ручке или команды перемещения в меню. Escape отменяет drag, Undo восстанавливает порядок и данные пользовательского блока. Цветные врезки собирайте из существующих accent-ролей и добавляйте `cap-surface-boundary` вложенным совпадающим поверхностям.

## Выбор графика по задаче

```tsx
<LineChart label="Посещения" labels={['Пн', 'Вт', 'Ср']}
  series={[{ name: 'Сайт', values: [8, 12, 9] }]} />
<DonutChart label="Задачи по статусу"
  data={[{ label: 'Готово', value: 8 }, { label: 'В работе', value: 3 }]} />
```

Используйте LineChart для тренда, DonutChart для долей с небольшим числом категорий. Каждый график предоставляет доступную таблицу данных; интерактивные значения также выбираются с клавиатуры.


## Код и подробная подсказка

```tsx
const [wrap, setWrap] = useState(false);
<CodeBlock defaultLanguage="tsx" wrap={wrap} onWrapChange={setWrap}
  variant="filled-outline" contextActions={[
    { id: 'download', label: 'Скачать файл', onSelect: downloadSource }
  ]}>{source}</CodeBlock>
<Tooltip caption="Доступ" content="Личный объект"
  description="Только вы можете его просматривать."
  variant="inverse" side="top" align="end" arrow>
  <IconButton label="Доступ к объекту" icon="lock" />
</Tooltip>
```

Имя файла необязательно. Перенос уже есть во встроенном меню; дополнительные пункты передавайте через contextActions. Tooltip содержит неинтерактивное описание.

## Markdown через JSON-блоки

```tsx
const [document, setDocument] = useState(() => markdownToRichText(initialMarkdown));
<RichTextEditor label="Инструкция" value={document} onValueChange={setDocument} />
<Button onClick={() => saveMarkdown(richTextToMarkdown(document))}>Сохранить</Button>
```

Импортируйте helpers и RichTextEditor из пакета. Нетронутые блоки сохраняют исходник; при собственном обновлении блоков сохраняйте metadata `markdown`. Для plain textarea используйте `preserveMarkdownSourceEdit`: [editor-revision.md](editor-revision.md).

## Вертикальные панели и нейтральный статус

```tsx
<ContentLayout orientation="vertical" divider="always" style={{height: 620}}
  left={{label: 'Контекст', content: context, height: contextHeight,
    minHeight: 100, onHeightChange: setContextHeight}}
  right={{label: 'Результат', content: result, defaultHeight: 180}}>
  {documentView}
</ContentLayout>
<Alert title="Сохранено" tone="success" color="teal"
  appearance="neutral" contrast surface="inherit">
  Все изменения записаны.
</Alert>
<ToastStack label="Результаты" items={notifications} onDismiss={dismissNotification} position="inline"
  expandDirection="right" expanded={expanded} onExpandedChange={setExpanded} />
```

Размеры ContentLayout относятся к выбранной оси. У нейтрального Alert цвет и contrast меняют статусную иконку, локальный акцент действий сохраняется. Стек резервирует измеренную геометрию и прокручивается внутри своего viewport.

## Проверка скруглений в композиции

```tsx
<section data-radius="rounded">
  <ContentCard density="compact" title="Исследование" onOpen={openProject}
    description="Заголовок сохраняет место для hover и клавиатурного фокуса." />
  <Select label="Поверхность" labelPlacement="inside" defaultValue="raised"
    options={[{ value: 'raised', label: 'Raised' }, { value: 'canvas', label: 'Canvas' }]} />
</section>
```

Режим наследуется независимо от темы и переносится в Select popup. В Playground Select включите «Длинные значения» и переключите inside/outside и размеры; глобальные скругления меняйте общей кнопкой каталога. У ContentCard проверьте compact/comfortable и фокус заголовка. Правила отступов: [component-guidelines.md](component-guidelines.md).

## XL действия с компактной вложенной группой

```tsx
<ActionBar label="Действия проекта" size="xl">
  <Button variant="outline" leading={<Icon name="plus" />}>Создать</Button>
  <ButtonGroup label="Вид" size="sm">
    <IconButton label="Список" icon="list" />
    <IconButton label="Сетка" icon="grid" />
  </ButtonGroup>
</ActionBar>
```

Кнопка наследует XL (44 px); группа переопределяет высоту, иконки и отступы на SM. Для сенсорного ввода сохраняются отдельные минимальные hit targets.

## SidebarPanel: группы и компактные действия

```tsx
<SidebarPanel label="Пространство" header="Моё пространство"
  style={{ height: 420 }} footerAlign="end"
  footer={<><span>Обновлено сегодня</span>
    <FloatingActionBar label="Действия" position="static" size="sm">
      <IconButton label="Добавить" icon="plus" onClick={createNote} />
      <IconButton label="Настройки" icon="settings" onClick={openSettings} />
    </FloatingActionBar></>}>
  <Accordion title="Работа" variant="navigation" open
    expandLabel="Раскрыть работу" collapseLabel="Свернуть работу">
    <SidebarItem color="purple" count={24} active={page === 'notes'}
      onClick={() => setPage('notes')}>Заметки</SidebarItem>
    <SidebarItem color="blue" count={3} active={page === 'projects'}
      onClick={() => setPage('projects')}>Проекты</SidebarItem>
  </Accordion>
  <Accordion title="Архив" variant="navigation">
    <SidebarItem count={0} onClick={openArchive}>Завершённые</SidebarItem>
  </Accordion>
</SidebarPanel>
```

Контракт компоновки: [component-guidelines.md](component-guidelines.md#боковая-навигация). Группы независимы; обычные кнопки навигации сохраняют `aria-current`, а настоящие Tabs используют `items[].count` и `items[].color`.
