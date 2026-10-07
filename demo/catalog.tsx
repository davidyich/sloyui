import { arcComponents } from './catalog-arc';
import type { ComponentType } from 'react';
import manifest from '../agent-manifest.json';
import * as Controls from './stories-controls';
import * as Content from './stories-content';
import * as Composition from './stories-composition';
import { ChipStory } from './stories-selection';
import { BottomSheetStory, FileTreeStory, PreviewRailStory } from './stories-revision';
import * as Feedback from './stories-feedback';
import * as Overlays from './stories-overlays';
import type { StoryProps } from './stories-controls';

export type ComponentName = keyof typeof manifest.components;
export const componentGroups = ['Кнопки и действия','Поля и выбор','Объекты и контент','Навигация','Состояния','Окна и меню','Данные и графики'] as const;
export type ComponentGroup = typeof componentGroups[number];
interface CatalogRecord { group: ComponentGroup; description: string; render: ComponentType<StoryProps> }
const entry = (group: ComponentGroup, description: string, render: ComponentType<StoryProps>): CatalogRecord => ({group,description,render});
/** Every public component has one route and one focused, rendered story. */
export const componentCatalog = {
  ...arcComponents,
  BottomSheet: entry('Окна и меню','Нижняя панель с отступом, фиксированными высотами и ручкой перемещения.',BottomSheetStory),
  FileTree: entry('Навигация','Файлы и папки с клавиатурной навигацией, действиями и предпросмотром.',FileTreeStory),
  PreviewRail: entry('Навигация','Компактная шкала направлений с плавным ховером и плавающим превью.',PreviewRailStory),
  Button: entry('Кнопки и действия','Действие с понятной иерархией, размерами и состояниями.',Controls.ButtonStory),
  IconButton: entry('Кнопки и действия','Компактное действие с иконкой и доступной подписью.',Controls.IconButtonStory),
  Icon: entry('Кнопки и действия','Иконки Lucide с единым штрихом и произвольным размером.',Controls.IconStory),
  ButtonGroup: entry('Кнопки и действия','Связанные кнопки в общей рамке или с небольшим промежутком.',Controls.ButtonGroupStory),
  SplitButton: entry('Кнопки и действия','Основное действие и дополнительные команды в одной кнопке.',Controls.SplitButtonStory),
  ActionBar: entry('Кнопки и действия','Панель инструментов с навигацией по действиям стрелками.',Controls.ActionBarStory),
  FloatingActionBar: entry('Кнопки и действия','Плавающие действия с небольшим отступом от края контейнера.',Controls.FloatingActionBarStory),
  Kbd: entry('Кнопки и действия','Обозначение клавиши или сочетания клавиш.',Controls.KbdStory),
  Input: entry('Поля и выбор','Однострочное поле с вариантами размера и стандартным поведением ввода.',Controls.InputStory),
  FloatingField: entry('Поля и выбор','Текстовое поле с подписью внутри и местом для подсказки.',Controls.FloatingFieldStory),
  Textarea: entry('Поля и выбор','Многострочное поле с изменяемой высотой.',Controls.TextareaStory),
  Select: entry('Поля и выбор','Выбор одного значения в аккуратном меню с группами и поиском с клавиатуры.',Controls.SelectStory),
  Field: entry('Поля и выбор','Связывает подпись, поле, подсказку и ошибку.',Controls.FieldStory),
  Checkbox: entry('Поля и выбор','Независимый выбор с поддержкой промежуточного состояния.',Controls.CheckboxStory),
  Radio: entry('Поля и выбор','Выбор одного значения из группы.',Controls.RadioStory),
  Switch: entry('Поля и выбор','Переключатель настройки с немедленным применением.',Controls.SwitchStory),
  Slider: entry('Поля и выбор','Выбор числового значения в диапазоне.',Controls.SliderStory),
  SegmentedControl: entry('Поля и выбор','Небольшой набор взаимоисключающих вариантов.',Controls.SegmentedControlStory),
  Calendar: entry('Поля и выбор','Календарная сетка с выбором даты, ограничениями и событиями дня.',Controls.CalendarStory),
  DatePicker: entry('Поля и выбор','Выбор даты в привязанном к кнопке календаре.',Controls.DatePickerStory),
  Chip: entry('Поля и выбор','Нейтральная выбранная метка с удалением, счётчиком и действием.',ChipStory),
  Tag: entry('Объекты и контент','Универсальная метка: иконка, счётчик и действие в четырёх размерах.',Composition.TagStory),
  Counter: entry('Объекты и контент','Счётчик с разными заливками, формой и размером.',Composition.CounterStory),
  TextAction: entry('Кнопки и действия','Текстовая ссылка или действие с подсветкой области.',Composition.TextActionStory),
  ContentLayout: entry('Навигация','Панели с изменяемой шириной или высотой и настраиваемым разделителем.',Composition.ContentLayoutStory),
  IconPicker: entry('Кнопки и действия','Визуальный выбор из полной библиотеки Lucide.',Composition.IconPickerStory),
  IconBox: entry('Объекты и контент','Иконка объекта на мягкой акцентной подложке.',Content.IconBoxStory),
  Avatar: entry('Объекты и контент','Изображение человека или инициалы.',Content.AvatarStory),
  Separator: entry('Объекты и контент','Спокойный разделитель соседних групп содержимого.',Content.SeparatorStory),
  Card: entry('Объекты и контент','Контейнер с несколькими уровнями поверхности.',Content.CardStory),
  ObjectCard: entry('Объекты и контент','Карточка, целиком открывающая объект.',Content.ObjectCardStory),
  CollectionRow: entry('Объекты и контент','Компактная строка объекта с типом и дополнительными сведениями.',Content.CollectionRowStory),
  PropertyRow: entry('Объекты и контент','Пара «название — значение» для свойств объекта.',Content.PropertyRowStory),
  Table: entry('Объекты и контент','Семантическая таблица с внутренней горизонтальной прокруткой.',Content.TableStory),
  CodeBlock: entry('Объекты и контент','Блок исходного кода с подписью и прокруткой длинных строк.',Content.CodeBlockStory),
  MarkdownPreview: entry('Объекты и контент','Безопасный просмотр базового Markdown без исполнения HTML.',Content.MarkdownPreviewStory),
  MarkdownEditor: entry('Объекты и контент','Редактирование Markdown, форматирование выделения и предпросмотр.',Content.MarkdownEditorStory),
  ReorderableList: entry('Объекты и контент','Перестановка строк и карточек за ручку, кнопками или с клавиатуры.',Content.ReorderableListStory),
  ContentCard: entry('Объекты и контент','Карточка с настраиваемым составом, порядком блоков и независимыми действиями.',Content.ContentCardStory),
  TaskCard: entry('Объекты и контент','Карточка задачи с завершением, свойствами и меню действий.',Content.TaskCardStory),
  KanbanColumn: entry('Объекты и контент','Колонка карточек с заголовком и пустым состоянием.',Content.KanbanColumnStory),
  KanbanBoard: entry('Объекты и контент','Управляемая доска с перемещением карточек через меню.',Content.KanbanBoardStory),
  DailyHeader: entry('Объекты и контент','Заголовок дня с датой, номером недели и связанными типами объектов.',Content.DailyHeaderStory),
  SidebarItem: entry('Навигация','Пункт боковой навигации с активным состоянием.',Feedback.SidebarItemStory),
  Breadcrumbs: entry('Навигация','Путь от раздела к текущему объекту.',Feedback.BreadcrumbsStory),
  Accordion: entry('Навигация','Раскрывающийся блок для необязательных подробностей.',Feedback.AccordionStory),
  Tabs: entry('Навигация','Переключение связанных панелей с навигацией стрелками.',Feedback.TabsStory),
  SidebarPanel: entry('Навигация','Боковая панель с закреплёнными шапкой и нижними действиями.',Feedback.SidebarPanelStory),
  ScrollArea: entry('Навигация','Прокрутка с тенями у краёв, за которыми остаётся содержимое.',Feedback.ScrollAreaStory),
  Spinner: entry('Состояния','Индикатор неопределённого ожидания.',Feedback.SpinnerStory),
  Skeleton: entry('Состояния','Плейсхолдер, сохраняющий форму загружаемого содержимого.',Feedback.SkeletonStory),
  Progress: entry('Состояния','Измеримый прогресс операции от 0 до 100.',Feedback.ProgressStory),
  Callout: entry('Состояния','Встроенный в содержимое блок примечания.',Feedback.CalloutStory),
  EmptyState: entry('Состояния','Причина отсутствия данных и один полезный следующий шаг.',Feedback.EmptyStateStory),
  Toast: entry('Состояния','Короткое подтверждение завершённого действия.',Feedback.ToastStory),
  StatusBar: entry('Состояния','Строка текущего состояния документа или операции.',Feedback.StatusBarStory),
  Alert: entry('Состояния','Сообщение со смысловым тоном, подробностями и закрытием.',Feedback.AlertStory),
  Dialog: entry('Окна и меню','Модальное окно для одного законченного действия.',Overlays.DialogStory),
  Drawer: entry('Окна и меню','Боковое или нижнее окно для связанных настроек и свойств.',Overlays.DrawerStory),
  Tooltip: entry('Окна и меню','Подсказка при наведении и фокусе, включая сочетания клавиш.',Overlays.TooltipStory),
  Menu: entry('Окна и меню','Контекстные команды с иконками, разделителями и состояниями.',Overlays.MenuStory),
  Popover: entry('Окна и меню','Небольшая панель рядом с действием, которое её открыло.',Overlays.PopoverStory),
  CommandPalette: entry('Окна и меню','Поиск по командам с выбором результата с клавиатуры.',Overlays.CommandPaletteStory),
} satisfies Record<ComponentName,CatalogRecord>;
export const componentNames = (Object.keys(componentCatalog) as ComponentName[]).filter(name=>manifest.components[name].status!=='archived');
export const registryGroups = manifest.registry.groups;
export const componentStatuses: Record<string,string> = manifest.registry.statuses;
export type ComponentStatus = keyof typeof componentStatuses;
export function componentMetadata(name: ComponentName) { return manifest.components[name]; }
export const foundationPages = [
  {id:'colors',label:'Цвета и темы'},
  {id:'typography',label:'Типографика'},
  {id:'geometry',label:'Размеры и форма'},
  {id:'layers',label:'Границы и слои'},
  {id:'behavior',label:'Поведение'},
  {id:'agents',label:'Инструкции'},
] as const;
export type FoundationRoute = typeof foundationPages[number]['id'];
export type CatalogRoute = ComponentName | FoundationRoute;
export function isComponentRoute(route: CatalogRoute): route is ComponentName { return Object.hasOwn(componentCatalog,route); }
const aliases: Record<string,CatalogRoute> = {Badge:'Tag',TypeLabel:'Tag',badge:'Tag','type-label':'Tag',typelabel:'Tag',overview:'Button',buttons:'Button',forms:'Input',content:'ContentCard',feedback:'Alert',overlays:'Dialog',workbench:'ActionBar','content-blocks':'Calendar',patterns:'KanbanBoard',rules:'behavior'};
export function resolveRoute(hash: string): CatalogRoute {
  let value=hash.replace(/^#/,''); try { value=decodeURIComponent(value); } catch { return 'Button'; }
  if(value.toLowerCase().replaceAll('-','')==='markdowneditor') return 'RichTextEditor';
  if (Object.hasOwn(componentCatalog,value)) return value as ComponentName;
  if (foundationPages.some(page=>page.id===value)) return value as FoundationRoute;
  if (Object.hasOwn(aliases,value)) return aliases[value];
  return componentNames.find(name=>name.toLowerCase()===value.toLowerCase()||name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase()===value.toLowerCase())??'Button';
}
export function componentReference(name: ComponentName) { return manifest.components[name]; }
