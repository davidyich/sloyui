import ts from 'typescript';
import path from 'node:path';

// Public API is read from the exported TypeScript signature, never from demo controls.
export function addComponentReference(manifest) {
  const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.build.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(path.resolve('src/index.ts')) ?? program.getSourceFile('src/index.ts');
  const exported = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(entry)).map(symbol => [symbol.name, symbol]));
  const declarations = new Map();
  for (const source of program.getSourceFiles().filter(file => file.fileName.includes('/src/') || file.fileName.startsWith('src/'))) {
    const visit = node => {
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) declarations.set(node.name.text, node);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const [name, record] of Object.entries(manifest.components)) {
    let symbol = exported.get(name);
    if (!symbol) throw new Error(`Missing exported API: ${name}`);
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration ?? symbol.declarations[0]);
    const signature = type.getCallSignatures()[0];
    const parameter = signature?.getParameters()[0];
    const props = parameter ? checker.getTypeOfSymbolAtLocation(parameter, parameter.valueDeclaration ?? signature.declaration) : undefined;
    const defaults = {};
    const impl = declarations.get(name);
    const binding = impl?.parameters[0]?.name;
    if (binding && ts.isObjectBindingPattern(binding)) for (const item of binding.elements) {
      if (item.initializer) defaults[(item.propertyName ?? item.name).getText()] = item.initializer.getText().replace(/\s+/g, ' ');
    }
    // Components accepting a named props object may destructure defaults in their body.
    if (binding && ts.isIdentifier(binding) && impl?.body) for (const statement of impl.body.statements ?? []) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const decl of statement.declarationList.declarations) if (ts.isObjectBindingPattern(decl.name) && decl.initializer?.getText() === binding.text) for (const item of decl.name.elements) {
        if (item.initializer) defaults[(item.propertyName ?? item.name).getText()] = item.initializer.getText().replace(/\s+/g, ' ');
      }
    }
    if (name === 'IconButton') Object.assign(defaults, {variant:"'secondary'",size:"'md'"});
    const properties = props ? checker.getPropertiesOfType(props) : [];
    const usefulNative = new Set(['children','className','style','id','aria-label', ...(['Button','IconButton','TextAction','ObjectCard','CollectionRow','SidebarItem'].includes(name) ? ['disabled','onClick','type','href'] : []), ...(['Input','Textarea','Select','NumberField','Checkbox','Radio','Switch','Slider','FloatingField'].includes(name) ? ['value','defaultValue','onChange','name','disabled','readOnly','placeholder','required','type','checked','defaultChecked','rows','min','max','step'] : [])]);
    record.api = properties.filter(prop => usefulNative.has(prop.name) || prop.declarations?.some(decl => !decl.getSourceFile().fileName.includes('node_modules'))).map(prop => {
      const decl = prop.valueDeclaration ?? prop.declarations[0];
      const type = checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, decl), decl, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope).replace(/ \| undefined\b/g, '');
      const deprecated = prop.getJsDocTags(checker).find(tag=>tag.name==='deprecated');
      const description = (deprecated ? `Deprecated. ${ts.displayPartsToString(deprecated.text)}` : '') || (decl.getSourceFile().fileName.includes('node_modules') ? '' : ts.displayPartsToString(prop.getDocumentationComment(checker))) || describe(prop.name);
      return {name:prop.name, type, required:!(prop.flags & ts.SymbolFlags.Optional), default:defaults[prop.name] ?? null, description};
    }).sort((a,b) => priority(a.name)-priority(b.name));
    const native = properties.some(prop => prop.declarations?.some(decl => decl.getSourceFile().fileName.includes('@types/react')));
    if (native) record.api.push({name:'…props',type:'Native element attributes',required:false,default:null,description:'Стандартные HTML/ARIA-атрибуты и обработчики базового элемента. Исключения заданы публичным TypeScript-типом.'});
    record.usage = guidance[name] ?? groupGuidance[record.primaryGroup] ?? 'Размещайте элемент в явном контексте поверхности. Содержимое и действия передавайте через публичные props.';
    record.agentNotes = record.behavior ?? `Use the exported ${name} component. ${record.purpose}. Read its typed API and example; bind referenced data and callbacks in the consumer. Preserve accessible labels, keyboard behavior and reduced motion.`;
    const preferred = related[name] ?? [];
    record.related = Object.keys(manifest.components).filter(other => other !== name && manifest.components[other].status !== 'archived').sort((a,b) => score(b)-score(a) || a.localeCompare(b)).slice(0,4);
    function score(other) { return (preferred.includes(other) ? 100-preferred.indexOf(other) : 0) + record.groups.filter(group => manifest.components[other].groups.includes(group)).length*3 + Number(manifest.components[other].primaryGroup === record.primaryGroup); }
  }
}
const priority = name => ({size:0,variant:1,children:2,value:3,defaultValue:4,onValueChange:5}[name] ?? 10);
const descriptions = {size:'Размер элемента по общей шкале.',variant:'Визуальный вариант компонента.',children:'Содержимое компонента.',label:'Видимая или доступная подпись.',title:'Заголовок.',description:'Дополнительное описание.',className:'Дополнительный класс корневого элемента.',value:'Текущее значение в управляемом режиме.',defaultValue:'Начальное значение в неуправляемом режиме.',onValueChange:'Вызывается при изменении значения.',open:'Открытое состояние в управляемом режиме.',defaultOpen:'Начальное открытое состояние.',onOpenChange:'Запрос на изменение открытого состояния.',disabled:'Блокирует взаимодействие.',color:'Локальный цвет или наследование акцента.',surface:'Поверхность и её контекст вторичных цветов.',icon:'Иконка из набора или импортированный Lucide-компонент.',items:'Элементы со стабильными уникальными идентификаторами.',options:'Варианты выбора.',loading:'Ожидание выполнения действия.',leading:'Слот перед основным содержимым.',trailing:'Слот после основного содержимого.',actions:'Дополнительные действия.',focusRing:'Толщина и отступ фокусной рамки в пикселях.',onClick:'Обработчик активации.',onRemove:'Обработчик удаления элемента.',onDismiss:'Обработчик закрытия.',shape:'Форма элемента.',count:'Количество или короткий счётчик.',error:'Сообщение об ошибке и состояние поля.',hint:'Подсказка к полю.',placeholder:'Подсказка при пустом значении.',labelPlacement:'Положение подписи снаружи или внутри поля.',orientation:'Направление композиции.',selected:'Состояние выбора.',expanded:'Состояние раскрытия.',onExpandedChange:'Запрос на раскрытие или сворачивание.',name:'Имя для формы или идентификатор иконки.',renderCard:'Функция отображения содержимого карточки.',tone:'Смысловой статус сообщения.',contrast:'Усиливает контраст выбранного стиля.',appearance:'Стиль заливки сообщения.',ref:'Ссылка на базовый DOM-элемент.',id:'Идентификатор элемента.'};
function describe(name) { return descriptions[name] ?? (name.startsWith('on') ? `Обработчик события ${name.slice(2)}.` : name.startsWith('render') ? `Слот отображения ${name.slice(6)}.` : name.startsWith('show') ? `Управляет отображением ${name.slice(4)}.` : name.startsWith('default') ? `Начальное значение ${name.slice(7)}.` : `Настройка ${name}; допустимые значения указаны в типе.`); }
const groupGuidance = {
 actions:'Назовите действие глаголом. Оставляйте одно главное действие в группе; иконочным кнопкам задавайте доступную подпись.',
 fields:'Используйте одну подпись, hint для пояснения и error для ошибки. Храните введённое значение в форме; размер задавайте до настройки внешнего вида.',
 selection:'Задавайте стабильные значения вариантов и доступную подпись. При управляемом выборе обновляйте value через соответствующий обработчик.',
 navigation:'Разделяйте временное наведение и текущий раздел. У элементов должны быть стабильные идентификаторы и понятные подписи.',
 layout:'Задавайте контекст поверхности в композиции. Внутренний контент должен сжиматься по ширине; не скрывайте функциональные элементы через overflow.',
 content:'Используйте слоты для содержимого и действий. Не вкладывайте кнопки в другие кнопки; выбор карточки включайте только когда он нужен.',
 editing:'Храните документ в приложении и сохраняйте его явно. Поддерживайте клавиатурное редактирование, пустое значение и режим только чтения.',
 data:'Передавайте стабильные ID строк и подписи данных. Ограничивайте прокрутку контейнером таблицы; не обрезайте действия и длинные значения.',
 feedback:'Выберите тон по смыслу сообщения. Поверхность задавайте по месту размещения; важные действия оставляйте доступными до явного закрытия.',
 overlays:'Управляйте open и onOpenChange в приложении. Используйте встроенную клавиатурную навигацию; не добавляйте второй focus trap.',
 motion:'Сохраняйте понятное состояние без анимации. Используйте существующие настройки движения и системный reduced motion.',
 charts:'Давайте графику содержательную подпись, единицы и реальные данные. Проверяйте пустую выборку и узкий контейнер.',
 utilities:'Используйте общие размеры и семантические цвета. Декоративные элементы не должны заменять доступные подписи содержимого.'
};
const guidance = {
 Button:'Primary — нейтральное контрастное главное действие. Accent — цветное главное, accent-secondary — мягкое цветное. Цвет задаётся через data-accent на ближайшем контейнере.',
 IconButton:'Задавайте короткий label, описывающий действие. Подбирайте размер как у соседних кнопок; Primary остаётся нейтральным при любом акценте.',
 Chip:'Используйте для нейтрального выбора и облака тегов. onRemove добавляет отдельное действие; акцентные объектные метки оформляйте через Tag.',
 Tag:'Используйте для типа объекта, статуса и акцентной метки. interactive=false отключает все действия; нейтральное облако выбранных значений собирайте через Chip.',
 ContentLayout:'Изменяйте панели за разделитель или стрелками после Tab. В горизонтальной композиции регулируется ширина, в вертикальной — высота. На узком контейнере панели складываются.',
 ResizableCard:'Потяните за нижний правый угол или сфокусируйте ручку и используйте стрелки. Ограничьте размеры под содержимое; карточка не должна выходить за ширину родителя.',
 CodeBlock:'Передавайте исходник строкой: копирование сохраняет его без изменений. Имя файла необязательно; номера строк удобны для длинных примеров. editor встраивает редактируемый блок.',
 Accordion:'Раскрывайте связанную подробность одним заголовком. Не прячьте обязательные действия; используйте open/onOpenChange для управляемого раскрытия.',
 Select:'Подходит для одного значения. Задавайте label или aria-label; options хранит подписи, value — стабильный ключ. Для нескольких значений используйте MultiSelect.',
 MultiSelect:'Передавайте массив стабильных значений и onValueChange. Выбранные значения отображаются нейтральными Chip; цветные точки опциональны.',
 CardStack:'Используйте для последовательного просмотра или разбора. Выбирайте направление раскрытия под свободное место; сохраняйте решения в приложении через callback.',
 ToastStack:'Размещайте в ограниченной области с запасом под выбранное направление. Жизненным циклом и удалением уведомлений управляет приложение.',
 Calendar:'Храните локальные даты в формате YYYY-MM-DD. Выберите одиночный или диапазонный режим; сохраняйте доступ к переключению месяца с клавиатуры.',
 DatePicker:'Задавайте label и сохраняйте выбранную локальную дату. Используйте компонент вместо системного date input; календарь наследует тему и скругления.',
 RichTextEditor:'Храните JSON-блоки и стабильные ID. Для Markdown используйте markdownToRichText/richTextToMarkdown, сохраняя metadata; неподдерживаемый синтаксис остаётся исходником.',
 ReorderableList:'Храните порядок в приложении. Передавайте уникальные ID; ручка поддерживает перетаскивание, клавиатуру и альтернативные действия.',
 SidebarPanel:'Выберите surface под контекст навигации. Размещайте последовательные SidebarItem и Accordion; нижние действия передавайте отдельным footer.',
 SegmentedControl:'Используйте для короткого взаимоисключающего выбора. Передавайте value/onValueChange и общую доступную подпись; длинные наборы лучше оформить Tabs.',
 Tabs:'Каждой вкладке задавайте уникальный value и содержимое. value должен существовать и быть доступным; длинные заголовки прокручиваются внутри полосы.',
 DataTable:'Задавайте getRowId и столбцы с устойчивыми ID. Сортировка и выбор управляются через публичные props; проверяйте длинные ячейки на выбранной поверхности.',
 ContentCard:'Собирайте карточку из blocks со стабильными ID. blockOrder и hiddenBlocks управляют композицией; selectable включайте только для сценария массового выбора.',
 TaskCard:'Завершение задачи, открытие заголовка и меню — отдельные действия. Массовый выбор опционален; completed хранится в приложении.',
 ColorPicker:'Используйте value/onValueChange для цвета. Последние цвета включайте только при необходимости; предустановленная палитра не является обязательной частью выбора.'
};
const related = {Button:['IconButton','ButtonGroup','SplitButton','FloatingActionBar'],IconButton:['Button','Tooltip','ButtonGroup'],Input:['Textarea','NumberField','Select','Field'],Chip:['MultiSelect','TagInput','Tag','Button'],CodeBlock:['RichTextEditor','MarkdownPreview','Accordion'],ContentLayout:['ResizableCard','SidebarPanel','ScrollArea','Card'],ResizableCard:['Card','ContentCard','ContentLayout','ScrollArea'],CardStack:['ContentCard','TaskCard','ToastStack'],SidebarPanel:['SidebarItem','TreeView','ContentLayout','FloatingActionBar']};
