import { mkdtemp, mkdir, symlink, readFile, writeFile, copyFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const root = process.cwd(), tarball = resolve(process.argv[2] ?? `artifacts/personal-capacities-ui-${version}.tgz`);
await access(tarball);
const temp = await mkdtemp(join(tmpdir(), 'capacities-consumer-'));
try {
  const target = join(temp, 'node_modules/@personal/capacities-ui');
  await mkdir(target, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', target]);
  for (const name of ['react', 'react-dom', '@types']) await symlink(join(root, 'node_modules', name), join(temp, 'node_modules', name));
  await writeFile(join(temp, 'package.json'), '{"type":"module"}');
  const examples = ['ProjectBoard', 'WorkspaceV2', 'IntegratedWorkspace', 'CalendarSchedule'];
  for (const example of examples) await copyFile(join(target, `examples/${example}.tsx`), join(temp, `${example}.tsx`));
  const packedPackage = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  for (const entry of ['types', 'import']) {
    const path = packedPackage.exports?.['.']?.[entry];
    if (typeof path !== 'string' || !path.startsWith('./dist/') || !resolve(target, path).startsWith(resolve(target, 'dist') + sep)) throw new Error('Archive ' + entry + ' export must resolve inside dist');
    await access(join(target, path));
  }
  await writeFile(join(temp, 'consumer.tsx'), String.raw`
import {
  Alert, AnnouncementBar, BottomSheet, Button, CardStack, Chip, ColorPicker,
  ContentCard, ContentLayout, ResizableCard, DataTable, Dialog, Field, FileTree, Input, KanbanColumn,
  Popover, PreviewRail, RichTextEditor, Slider, StatusBar, Toast, ToastStack,
  markdownToRichText, richTextToMarkdown, preserveMarkdownSourceEdit,
  type BottomSheetProps, type ChipProps, type Color, type ContentLayoutProps,
  type FeedbackStyleProps, type FileTreeNode, type PreviewRailItem, type Size,
  type SliderProps, type ToastStackItem,
} from '@personal/capacities-ui';
import { IntegratedWorkspace } from './IntegratedWorkspace.js';
import '@personal/capacities-ui/styles.css';

const color: Color = 'teal'; const size: Size = 'xl';
const feedback = { tone: 'success', color, appearance: 'soft', contrast: true, surface: 'raised' } satisfies FeedbackStyleProps;
const chip = { size, shape: 'pill', icon: 'folder', count: 3, selected: true, onClick: () => {}, action: { icon: 'close', label: 'Remove chip', onClick: () => {} } } satisfies ChipProps;
const sheet = { title: 'Consumer sheet', open: false, onOpenChange: (open: boolean) => { void open; }, snapPoints: [0.3, 0.8], snap: 0, onSnapChange: (index: number) => { void index; }, variant: 'edge', edgeGap: 8, dismissThreshold: 100, draggable: true } satisfies BottomSheetProps;
const files: FileTreeNode[] = [{ id: 'src', name: 'src', type: 'folder', children: [{ id: 'app', name: 'App.tsx', type: 'file', preview: <p>File preview</p>, actions: [{ id: 'open', label: 'Open', onSelect: file => { const id: string = file.id; void id; } }] }] }];
const rail: PreviewRailItem[] = [{ id: 'overview', label: 'Overview', preview: <p>Overview preview</p> }, { id: 'details', label: 'Details', description: 'More detail' }];
const layout = { orientation: 'vertical', divider: 'none', stretch: true, left: { label: 'Before', content: <p>Outline</p>, height: 120, minHeight: 100, maxHeight: 300, onHeightChange: (height: number) => { void height; } }, right: { label: 'After', content: <p>Properties</p>, defaultHeight: 140 } } satisfies ContentLayoutProps;
const slider = { label: 'Density', value: 0.5, min: 0, max: 1, step: 0.1, formatValue: (value: number) => value * 100 + '%', onValueChange: (value: number) => { void value; }, onValueCommit: (value: number) => { void value; }, focusRing: { width: 1, offset: 2 } } satisfies SliderProps;
const markdown = '# Consumer\n\n**Archive** contract.\n';
const document = markdownToRichText(markdown);
const saved: string = richTextToMarkdown(document);
const preserved: string = preserveMarkdownSourceEdit(saved, saved);
const notifications: ToastStackItem[] = [{ id: 'saved', title: 'Saved', description: 'Archive consumer', duration: Infinity, ...feedback }];
const rows = [{ id: 'task', title: 'Task' }];

export const demo = <Dialog size="xl" open={false} onOpenChange={() => {}} title="Test"><Field label="Title">{props => <Input {...props} size={size}/>}</Field><Button variant="outline" size={size}>{color}</Button></Dialog>;
export const components = <>
  <Chip {...chip}>Archive chip</Chip><BottomSheet {...sheet}>Closed sheet body</BottomSheet>
  <FileTree label="Files" nodes={files} selectedId="app" expandedIds={['src']} onSelect={file => { const id: string = file.id; void id; }} onExpandedChange={ids => { const values: string[] = ids; void values; }}/>
  <PreviewRail label="Sections" items={rail} orientation="horizontal" previewSide="before" highlightActive onValueChange={id => { const value: string = id; void value; }}/>
  <ResizableCard defaultSize={{width:320,height:200}}>Resize me</ResizableCard>
  <ContentLayout {...layout} style={{height:640}}><ContentCard title="Main" selectable={false}/></ContentLayout>
  <Slider {...slider}/><ColorPicker label="Color" showRecent/>
  <Popover label="Filter" triggerIcon="filter"><Input label="Search" data-radius="compact" data-borders="off"/></Popover>
  <KanbanColumn title="Active" count={1} color={color}><ContentCard title="Task" selectable onSelectedChange={selected => { const value: boolean = selected; void value; }}/></KanbanColumn>
  <DataTable surface="base" label="Rows" rows={rows} rowId={row => row.id} columns={[{id:'title',header:'Title',value:row => row.title}]}/>
  <Alert {...feedback} title="Saved" expandable expanded onExpandedChange={expanded => { void expanded; }}>Alert detail</Alert>
  <StatusBar {...feedback} variant="surface" busy={false}>Ready</StatusBar><Toast {...feedback} title="Saved" onDismiss={() => {}}/>
  <ToastStack items={notifications} position="inline" expandDirection="left" expanded onExpandedChange={expanded => { void expanded; }} onDismiss={id => { void id; }}/>
  <AnnouncementBar surface="canvas" messages={[{id:'news',message:'News',action:{label:'Read',href:'#news'}}]} id="archive-news" autoPlay={false} controls onAction={message => { void message.id; }}/>
  <CardStack items={rows} getKey={row => row.id} renderCard={row => <ContentCard title={row.title}/>} expandDirection="right" expanded review onDecide={(row,decision) => { const value: 'left' | 'right' = decision; void row.id; void value; }} onReset={() => {}}/>
  <RichTextEditor label="Markdown note" value={document} onValueChange={next => { const source: string = richTextToMarkdown(next); void source; }}/>
</>;
export const integrated = <IntegratedWorkspace/>;
void preserved;
`);
  await writeFile(join(temp, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2022', 'DOM', 'DOM.Iterable'] }, include: ['*.tsx'] }));
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(temp, 'tsconfig.json')], { stdio: 'pipe' });
  const serverRenderedExports = ['Button', 'ComboBox', 'MultiSelect', 'TagInput', 'RadioGroup', 'ColorPicker', 'NumberField', 'ValueScrubber', 'NavigationMenu', 'HoverPanel', 'TreeView', 'LineChart', 'BarChart', 'RichTextEditor', 'DataTable', 'ToastStack', 'Chip', 'BottomSheet', 'FileTree', 'PreviewRail', 'ContentLayout', 'ResizableCard', 'ContentCard', 'KanbanColumn', 'Slider', 'Alert', 'StatusBar', 'Toast', 'AnnouncementBar', 'CardStack'];
  const markdownBridgeExports = ['markdownToRichText', 'richTextToMarkdown', 'preserveMarkdownSourceEdit'];
  await writeFile(join(temp, 'render.mjs'), String.raw`
import React from 'react';
import { renderToString } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import {
  Alert, AnnouncementBar, BarChart, BottomSheet, Button, CardStack, Chip, ColorPicker,
  ComboBox, ContentCard, ContentLayout, ResizableCard, DataTable, FileTree, HoverPanel, KanbanColumn,
  LineChart, MultiSelect, NavigationMenu, NumberField, PreviewRail, RadioGroup,
  RichTextEditor, Slider, StatusBar, TagInput, Toast, ToastStack, TreeView, ValueScrubber,
  markdownToRichText, richTextToMarkdown, preserveMarkdownSourceEdit,
} from '@personal/capacities-ui';
const packageEntry = fileURLToPath(import.meta.resolve('@personal/capacities-ui'));
const archiveDist = resolve(fileURLToPath(new URL('./node_modules/@personal/capacities-ui/dist/', import.meta.url))) + sep;
if (!packageEntry.startsWith(archiveDist)) throw Error('SSR did not resolve the extracted archive dist: ' + packageEntry);
const node = React.createElement, noop = () => {}, rows = [{id:'a',name:'Task',value:2}];
const columns = [{id:'name',header:'Name',value:row=>row.name},{id:'value',header:'Value',value:row=>row.value}];
const markdown = '# Archive\n\n**Exact** source.\n\n~~~ts\nconst answer = 42;\n~~~\n';
const document = markdownToRichText(markdown);
if (richTextToMarkdown(document) !== markdown) throw Error('Archive Markdown bridge changed untouched source');
if (preserveMarkdownSourceEdit(markdown, markdown) !== markdown) throw Error('Archive source-edit bridge changed untouched source');
const feedback = { tone:'success', color:'teal', appearance:'soft', contrast:true, surface:'raised' };
const closedSheet = renderToString(node(BottomSheet,{open:false,onOpenChange:noop,title:'Closed archive sheet',snapPoints:[0.3,0.8],snap:0,onSnapChange:noop},'Closed sheet body'));
if (/cap-bottom-sheet|role="dialog"|Closed sheet body/.test(closedSheet)) throw Error('Closed BottomSheet rendered its modal body during SSR');
const html = renderToString(node(React.Fragment,null,
  node(Button,{variant:'primary'},'Hello'),
  node(ComboBox,{label:'Project',options:[{value:'a',label:'Alpha'}]}),
  node(MultiSelect,{label:'Topics',options:[{value:'a',label:'Alpha',group:'Work',color:'blue'}],defaultValue:['a']}),
  node(TagInput,{label:'Tags'}),node(RadioGroup,{label:'Layout',options:[{value:'grid',label:'Grid'}]}),
  node(ColorPicker,{label:'Color',showRecent:true}),node(NumberField,{label:'Zoom'}),
  node(ValueScrubber,{label:'Scrubber',value:5,onValueChange:noop}),
  node(NavigationMenu,{label:'Navigation',items:[{id:'a',label:'A',content:node('a',{href:'#a'},'Link')}]}),
  node(HoverPanel,{label:'Preview',summary:'Preview'},'Body'),node(TreeView,{label:'Tree',nodes:[{id:'a',label:'Alpha'}]}),
  node(LineChart,{label:'Line',series:[{name:'A',values:[1,2]}]}),node(BarChart,{label:'Bars',data:[{label:'A',value:1}]}),
  node(RichTextEditor,{label:'Note',value:document,onValueChange:noop}),
  node(DataTable,{label:'Tasks',rows,columns,rowId:row=>row.id,surface:'base'}),
  node(Chip,{selected:true,onClick:noop,onRemove:noop},'Archive chip'),
  node(FileTree,{label:'Files',selectedId:'app',defaultExpandedIds:['src'],nodes:[{id:'src',name:'src',type:'folder',children:[{id:'app',name:'App.tsx',type:'file',preview:'Archive file preview'}]}]}),
  node(PreviewRail,{label:'Sections',orientation:'horizontal',highlightActive:true,items:[{id:'overview',label:'Overview'},{id:'details',label:'Details'}]}),
  node(ResizableCard,{defaultSize:{width:320,height:200},label:'Resizable note'},'Content'),
  node(ContentLayout,{orientation:'vertical',divider:'none',left:{label:'Before',height:120,onHeightChange:noop,content:'Outline'},right:{label:'After',defaultHeight:140,content:'Properties'}},node(ContentCard,{title:'Main',selectable:false})),
  node(KanbanColumn,{title:'Active',count:1,color:'blue'},node(ContentCard,{title:'Task',selectable:true})),
  node(Slider,{label:'Density',defaultValue:0.5,min:0,max:1,step:0.1,formatValue:value=>value*100+'%',onValueChange:noop,onValueCommit:noop}),
  node(Alert,{...feedback,title:'Saved',expandable:true,expanded:true,onExpandedChange:noop},'Alert detail'),
  node(StatusBar,{...feedback,variant:'surface'},'Ready'),node(Toast,{...feedback,title:'Saved',onDismiss:noop}),
  node(ToastStack,{items:[{id:'saved',title:'Saved',duration:Infinity,...feedback}],position:'inline',expandDirection:'left',expanded:true,onExpandedChange:noop,onDismiss:noop}),
  node(AnnouncementBar,{surface:'canvas',id:'archive-news',autoPlay:false,controls:true,messages:[{id:'news',message:'News'}]}),
  node(CardStack,{items:rows,getKey:row=>row.id,renderCard:row=>node(ContentCard,{title:row.name}),expandDirection:'right',expanded:true,review:true,onDecide:noop,onReset:noop}),
));
for (const token of ['cap-button','cap-selection-field','cap-value-scrubber','cap-navigation-menu','cap-tree','cap-chart','cap-rich-editor','cap-data-table','cap-toast-stack','cap-chip','cap-file-tree','cap-preview-rail','cap-content-layout','cap-content-card','cap-kanban-column','cap-slider','cap-alert','cap-status-bar','cap-toast','cap-announcement-bar','cap-card-stack']) {
  if (!html.includes(token)) throw Error('SSR smoke missing '+token);
}
for (const marker of ['data-orientation="vertical"','aria-label="Высота: Before"','aria-valuetext="50%"','Archive file preview','data-feedback-appearance="soft"']) {
  if (!html.includes(marker)) throw Error('SSR contract missing '+marker);
}
console.log('Archive dist SSR and Markdown bridge passed, including closed BottomSheet');
`);
  execFileSync(process.execPath, [join(temp, 'render.mjs')], { stdio: 'pipe' });
  const fontCss = await readFile(join(target, 'dist/fonts.css'), 'utf8');
  const fontPaths = [...fontCss.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]);
  for (const path of fontPaths) await access(join(target, 'dist', path));
  const manifest = JSON.parse(await readFile(join(target, 'agent-manifest.json'), 'utf8'));
  const packed = await build({ stdin: { contents: "export { Button } from '@personal/capacities-ui';", resolveDir: temp }, bundle: true, write: false, minify: true, format: 'esm', external: ['react','react-dom','react/jsx-runtime'] });
  const report = { package: manifest.package, componentCount: manifest.componentCount, isolatedArchiveConsumer: true, nodeNextTypes: true, exampleTypecheck: examples, serverRenderImport: true, serverRenderedExports, markdownBridgeExports, closedBottomSheet: true, packageEntryInsideArchiveDist: true, verticalContentLayout: true, sliderNumericCallbacks: true, feedbackStyleApi: true, fontAssets: fontPaths.length, buttonGzipBytes: gzipSync(packed.outputFiles[0].contents).length };
  await writeFile(join(root, 'docs/package-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally { await rm(temp, { recursive: true, force: true }); }
