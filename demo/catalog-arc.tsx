import {useCatalogText} from './catalog-locale';
import { useState, type ComponentType } from 'react';
import { MessageCircle } from 'lucide-react';
import { TreeView } from '../src/components/tree-view';
import { HoverPanel, NavigationMenu } from '../src/components/navigation-menu';
import { Button, Icon, Tag } from '../src';
import { StorySection, type StoryProps } from './stories-controls';
import * as Selection from './stories-selection';
import { ValueScrubberStory } from './stories-value-scrubber';
import * as Editor from './stories-editor';
import * as Data from './stories-data';
import * as Messages from './stories-messages';
import * as Comments from './stories-comments';
import * as Charts from './stories-charts';

export type ArcGroup = 'Кнопки и действия' | 'Поля и выбор' | 'Объекты и контент' | 'Навигация' | 'Состояния' | 'Окна и меню' | 'Данные и графики';
export interface ArcCatalogRecord { group: ArcGroup; description: string; render: ComponentType<StoryProps> }
const entry = (group: ArcGroup, description: string, render: ComponentType<StoryProps>): ArcCatalogRecord => ({ group, description, render });

function TreeViewStory() {
 const c=useCatalogText();

  const [selected, setSelected] = useState('garden');
  const nodes = [{ id: 'projects', label: c('Проекты'), icon: 'folder' as const, children: [{ id: 'garden', label: c('Сад идей'), icon: 'page' as const }, { id: 'archive', label: c('Визуальный архив'), icon: 'page' as const }] }, { id: 'notes', label: c('Заметки'), icon: 'book' as const, children: [{ id: 'today', label: c('Сегодня') }, { id: 'drafts', label: c('Черновики') }] }];
  return <StorySection title={c("Дерево разделов")}><div className="catalog-narrow"><TreeView label={c("Разделы проекта")} nodes={nodes} selectedId={selected} defaultExpandedIds={['projects']} onSelect={node => setSelected(node.id)}/><p className="catalog-muted">{c("Выбрано: ")}{selected}{c(". Стрелки перемещают фокус и раскрывают ветки.")}</p></div></StorySection>;
}
function NavigationMenuStory() {
 const c=useCatalogText();

  const resources = <div className="cap-navigation-grid">
    <a href="#RichTextEditor"><Icon name="book"/><span><strong>{c("Документация")}</strong><small>{c("Блоки, форматирование и команды")}</small></span></a>
    <a href="#TreeView"><Icon name="folder"/><span><strong>{c("Структура")}</strong><small>{c("Разделы и вложенные страницы")}</small></span></a>
    <a href="#DataTable"><Icon name="table"/><span><strong>{c("Таблицы")}</strong><small>{c("Фильтры и сортировка данных")}</small></span></a>
    <a href="#CommentThread"><Icon name={MessageCircle}/><span><strong>{c("Обсуждения")}</strong><small>{c("Ответы и комментарии на холсте")}</small></span></a>
  </div>;
  return <StorySection title={c("Ссылки с описаниями")}><NavigationMenu label={c("Разделы рабочего пространства")} activeId="projects" leading={<strong className="cap-navigation-brand">{c("Пространство")}</strong>} trailing={<Button size="sm" variant="accent">{c("Создать")}</Button>} items={[{ id: 'projects', label: c('Проекты'), content: resources }, { id: 'library', label: c('Материалы'), content: resources }, { id: 'calendar', label: c('Календарь'), href: '#Calendar' }]}/></StorySection>;
}
function HoverPanelStory() {
 const c=useCatalogText();

  const [open, setOpen] = useState(false);
  return <StorySection title={c("Предпросмотр объекта")}><HoverPanel label={c("Сад идей: предпросмотр")} summary={c("Сад идей")} open={open} onOpenChange={setOpen}><div className="catalog-stack"><strong>{c("Сад идей")}</strong><p>{c("Наблюдения, решения и заметки проекта.")}</p><Tag interactive={false} size="sm">{c("12 заметок")}</Tag><Button size="sm" onClick={() => setOpen(false)}>{c("Закрыть")}</Button></div></HoverPanel></StorySection>;
}

/** Independent routes for every additional public component. The root catalogue merges this map. */
export const arcComponents = {
  TreeView: entry('Навигация', 'Иерархия разделов с выбором и управлением стрелками.', TreeViewStory),
  NavigationMenu: entry('Навигация', 'Разделы с раскрываемыми панелями и обычными ссылками.', NavigationMenuStory),
  HoverPanel: entry('Окна и меню', 'Предпросмотр по наведению, фокусу и нажатию.', HoverPanelStory),
  ComboBox: entry('Поля и выбор', 'Поиск одного значения в списке с сохранением значения формы.', Selection.ComboBoxStory),
  MultiSelect: entry('Поля и выбор', 'Выбор нескольких значений с поиском и удалением.', Selection.MultiSelectStory),
  TagInput: entry('Поля и выбор', 'Ввод меток с разделителем и удалением с клавиатуры.', Selection.TagInputStory),
  RadioGroup: entry('Поля и выбор', 'Связанный набор вариантов в обычном или карточном виде.', Selection.RadioGroupStory),
  ColorPicker: entry('Поля и выбор', 'Цветовая плоскость, прозрачность и точный ввод с опциональными последними цветами.', Selection.ColorPickerStory),
  NumberField: entry('Поля и выбор', 'Числовое поле с шагом, границами и единицами.', Selection.NumberFieldStory),
  ValueScrubber: entry('Поля и выбор', 'Настройка числа клавишами или Alt-перетаскиванием с точным шагом.', ValueScrubberStory),
  RichTextEditor: entry('Объекты и контент', 'Блочный редактор с форматированием, slash-командами и пользовательскими блоками.', Editor.RichTextEditorStory),
  DataTable: entry('Данные и графики', 'Сортировка, выбор строк и страницы таблицы с типизированными колонками.', Data.DataTableStory),
  FilterToolbar: entry('Данные и графики', 'Поиск и фильтры по полям с управляемым состоянием.', Data.FilterToolbarStory),
  JsonViewer: entry('Данные и графики', 'Дерево JSON с поиском, раскрытием, страницами и копированием.', Data.JsonViewerStory),
  ToastStack: entry('Состояния', 'Стек уведомлений с действиями и закрытием.', Messages.ToastStackStory),
  AnnouncementBar: entry('Состояния', 'Лента важных сообщений с переключением и действием.', Messages.AnnouncementBarStory),
  CardStack: entry('Объекты и контент', 'Стопка карточек для последовательного разбора.', Messages.CardStackStory),
  TextShimmer: entry('Состояния', 'Ненавязчивый индикатор фоновой работы в тексте.', Messages.TextShimmerStory),
  CommentThread: entry('Объекты и контент', 'Обсуждение с ответами, реакциями и завершением.', Comments.CommentThreadStory),
  InlineComments: entry('Объекты и контент', 'Комментарии, закреплённые на содержимом.', Comments.InlineCommentsStory),
  LineChart: entry('Данные и графики', 'Линии нескольких рядов с выбором точки.', Charts.LineChartStory),
  BarChart: entry('Данные и графики', 'Столбцы категорий с положительными и отрицательными значениями.', Charts.BarChartStory),
  DonutChart: entry('Данные и графики', 'Доли общего значения с доступными сегментами.', Charts.DonutChartStory),
  Streamgraph: entry('Данные и графики', 'Потоки нескольких рядов с выделением слоя.', Charts.StreamgraphStory),
  BrushChart: entry('Данные и графики', 'Изменяемый диапазон длинного ряда.', Charts.BrushChartStory),
  WaffleChart: entry('Данные и графики', 'Состав общего значения на сетке.', Charts.WaffleChartStory),
  SlopeChart: entry('Данные и графики', 'Сравнение значений до и после.', Charts.SlopeChartStory),
  Sparkline: entry('Данные и графики', 'Компактная линия изменения для соседства с метрикой.', Charts.SparklineStory),
  Gauge: entry('Данные и графики', 'Круговой показатель прогресса.', Charts.GaugeStory),
  ActivityHeatmap: entry('Данные и графики', 'Календарная карта активности.', Charts.ActivityHeatmapStory),
  AnimatedCounter: entry('Данные и графики', 'Анимированное числовое значение с доступной подписью.', Charts.AnimatedCounterStory),
  Ridgeline: entry('Данные и графики', 'Сравнение формы нескольких распределений.', Charts.RidgelineStory),
  Treemap: entry('Данные и графики', 'Иерархическое сравнение площади.', Charts.TreemapStory),
} satisfies Record<string, ArcCatalogRecord>;
export type ArcComponentName = keyof typeof arcComponents;
