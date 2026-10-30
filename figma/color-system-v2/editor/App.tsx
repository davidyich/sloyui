import {t,PaletteLocaleProvider,usePaletteLocale} from './Locale';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ColorPicker, Input, Select, SegmentedControl, Switch, Dialog, Drawer, Icon, Tabs, Accordion, Tooltip, Counter, ScrollArea } from '../../../src/index';
import { Download, Undo2, SwatchBook, Image } from 'lucide-react';
import { createAccent, createNeutralSystem, resetAccentRecommendations, updateSeed, validateProject, generatePalette, primaryPair, effectiveContextTheme, color, schema, defaultRules, presets, css, toHex, surfaces, type Accent, type Project, type Context } from './model.mjs';
import { Numeric, FillSlider, CharacterPad, Workspace } from './Controls';
import { NeutralSurfaces } from './NeutralSurfaces';
import {dictionary} from './translations';
import { usePaletteComputer } from './usePaletteComputer';
import { EnvironmentControls } from './EnvironmentControls';
import { Preview, Matrix, Palettes, Ramps, valueOf } from './Views';
import { Overview, PaletteCollection, SurfaceCollection, MaterialStudy } from './CollectionViews';
import '../../../src/styles/styles.css';
import '../../../src/styles/fonts.css';
import './editor.css';
const storageKey = 'sloy-palette-lab-v5', legacyKey = 'sloy-palette-lab-v1', prefsKey = 'sloy-palette-lab-view';
const initial = (): Project => ({ schema, accents: presets.map(p => createAccent(p.name, p.hex)), backgrounds: { Light: '#F1EEF8', Dark: '#221D2C' }, rules: { ...defaultRules, balanceSecondary:true }, neutral:createNeutralSystem() });
function loadProject() { try {
    const text = localStorage.getItem(storageKey) ?? localStorage.getItem('sloy-palette-lab-v4') ?? localStorage.getItem('sloy-palette-lab-v3') ?? localStorage.getItem('sloy-palette-lab-v2') ?? localStorage.getItem(legacyKey);
    return text ? validateProject(JSON.parse(text)) : initial();
}
catch {
    return initial();
} }
function loadPrefs() { try {
    return JSON.parse(localStorage.getItem(prefsKey) ?? '{}');
}
catch {
    return {};
} }
function pickerHex(value: string) { if (/^#[0-9a-f]{6}$/i.test(value))
    return value.toUpperCase(); if (!CSS.supports('color', value))
    throw new Error(t('Введите корректный цвет.')); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx)
    throw new Error(t('Не удалось прочитать цвет.')); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data; if (a !== 255)
    throw new Error(t('Исходный цвет должен быть непрозрачным.')); return toHex({ r: r / 255, g: g / 255, b: b / 255, a: 1 }); }
function download(name: string, text: string, mime = 'application/json') { const url = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
const nav = [{ id: 'overview', label: t('Все цвета'), icon: 'grid' }, { id: 'palettes', label: t('Палитры'), icon: SwatchBook }, { id: 'matrix', label: t('Поверхности'), icon: 'layers' }, { id: 'materials', label: t('Материалы'), icon: Image }, { id: 'tokens', label: t('Экспорт'), icon: 'code' }] as const;
const detailTabs = [{value:'specimens',label:t('Образцы')}, {value:'palettes',label:t('Палитра')}, {value:'matrix',label:t('Поверхности')}, {value:'tokens',label:t('Экспорт')}];
const normalizeDetailTab = (tab: string, neutral: boolean) => neutral ? (['surfaces','palettes','tokens'].includes(tab) ? tab : 'surfaces') : (detailTabs.some(item => item.value === tab) ? tab : 'specimens');
const options = (values: string[]) => values.map(value => ({ value, label: value }));
function App() {
    const {locale,setLocale}=usePaletteLocale();
    useEffect(()=>{document.documentElement.dataset.paletteShellMs=String(Math.round(performance.now()));performance.mark('palette-shell-ready');},[]);
    const [project, setProject] = useState<Project>(loadProject), [prefs] = useState(loadPrefs), [selected, setSelected] = useState(() => (prefs.selected==='neutral'?'neutral':project.accents.find(a => a.name === prefs.selected)?.id) ?? project.accents[0].id);
    const [surface, setSurface] = useState(surfaces.includes(prefs.surface) ? prefs.surface : 'Content'), [scheme, setScheme] = useState(prefs.scheme === 'Dimmed' ? 'Dimmed' : 'Standard'), [view, setView] = useState<string>((prefs.page==='color'||nav.some(n=>n.id===prefs.page))?prefs.page:'overview'), [detailTab,setDetailTab] = useState(() => normalizeDetailTab(prefs.detailTab,selected==='neutral')), [themes, setThemes] = useState(['Light', 'Dark'].includes(prefs.themes) ? prefs.themes : (matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'));
    const [density,setDensity]=useState(prefs.density==='compact'?'compact':'default');
    const [resetScope,setResetScope]=useState<'color'|'all'|null>(null);
    const [backgroundErrors,setBackgroundErrors]=useState<Partial<Record<'Light'|'Dark',string>>>({});
    const [deleteId,setDeleteId] = useState<string|null>(null), [borders,setBorders]=useState(prefs.borders==='on'?'on':'off'), [exactFields,setExactFields]=useState(false), [notice, setNotice] = useState(''), [saved, setSaved] = useState(true), [history, setHistory] = useState<Project[]>([]), [paletteView, setPaletteView] = useState('ramps'), [widths, setWidths] = useState({left: Number(prefs.widths?.left) || 224, right: Number(prefs.widths?.right) || 288}), [format, setFormat] = useState('tokens'), [scope, setScope] = useState('current'), [nameDraft, setNameDraft] = useState(''), [nameError, setNameError] = useState(''), [seedError, setSeedError] = useState(''), [addOpen, setAddOpen] = useState(false), [mobilePanel, setMobilePanel] = useState(''), [presetSearch, setPresetSearch] = useState(''), [importDraft, setImportDraft] = useState<Project | null>(null), [importError, setImportError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null), mainRef = useRef<HTMLDivElement>(null), lastCommit = useRef({ key: '', time: 0 });
    const isDetail=view==='color', page=isDetail?detailTab:view, exportScope=format==='project'||!isDetail?'all':scope, canAdd=project.accents.length<128;
    const isNeutral=selected==='neutral';
    const accent = isNeutral?project.neutral.accent:project.accents.find(a => a.id === selected) ?? project.accents[0];
    const allAccents=[project.neutral.accent,...project.accents];
    const activeDetailTabs=isNeutral?[{value:'surfaces',label:t('Подложки')},...detailTabs.filter(t=>t.value!=='specimens'&&t.value!=='matrix')]:detailTabs;
    const showInspector=isDetail;
    const computed=usePaletteComputer({project,accent,page,isDetail,theme:themes,scheme,surface,exportScope,format,paletteView});
    const contexts=isDetail?computed.contexts:[];
    const collectionContexts=isDetail?[]:computed.contexts;
    const collectionProps={accents:allAccents,contexts:collectionContexts,rules:project.rules,surface,onOpen:openColor,onPick:pick,onCopy:copy};
    const effectiveTheme=contexts.find(c=>c.theme===themes&&c.scheme===scheme&&c.surface===surface)?.effectiveTheme??effectiveContextTheme(themes,surface,project.backgrounds);
    const palette = useMemo(() => generatePalette(accent,project.rules), [accent,project.rules]);
    const primaryThemes = [{theme:effectiveTheme,label:effectiveTheme!==themes||['Invert','Custom'].includes(surface)?`${themes} · ${surface}`:themes}];
    const chosen = contexts.filter(c => c.scheme === scheme && themes === c.theme).sort((a, b) => surfaces.indexOf(a.surface) - surfaces.indexOf(b.surface));
    const visible = chosen.filter(c => c.surface === surface);
    const failures = computed.contexts.filter(c => c.issues.length);
    const exportText=computed.text;
    useEffect(() => { setNameDraft(accent.name); setNameError(''); setSeedError(''); }, [accent.id, accent.name]);
    useEffect(() => { try {
        localStorage.setItem(storageKey, JSON.stringify(project));
        setSaved(true);
    }
    catch {
        setSaved(false);
    } }, [project]);
    useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const apply = () => { const theme = themes.toLowerCase(); document.documentElement.dataset.theme = theme; document.documentElement.dataset.surfaceScheme=scheme.toLowerCase(); document.documentElement.dataset.borders=borders; document.documentElement.dataset.radius='default'; document.documentElement.dataset.density=density; document.documentElement.style.colorScheme = theme; }; apply(); media.addEventListener('change', apply); try {
        localStorage.setItem(prefsKey, JSON.stringify({ surface, scheme, themes, uiTheme: themes.toLowerCase(), selected: accent.name, widths, page:view, detailTab, borders, density }));
    }
    catch { } return () => media.removeEventListener('change', apply); }, [surface, scheme, themes, accent.name, widths, view, detailTab, borders, density]);
    useEffect(() => { if (!notice)
        return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
    function commit(next: Project, key = '') { const now = Date.now(); if (!key || lastCommit.current.key !== key || now - lastCommit.current.time > 600)
        setHistory(h => [...h.slice(-39), project]); lastCommit.current = { key, time: now }; setProject(next); }
    function patch(data: Partial<Accent>) { const next = { ...accent, ...data }; if (!data.hex && ['hue', 'primaryChroma', 'lightnessLight'].some(key => key in data))
        next.hex = toHex(color(next.lightnessLight, next.primaryChroma, next.hue)); commit(isNeutral?{...project,neutral:{...project.neutral,accent:{...next,id:'neutral',name:'neutral'}}}:{ ...project, accents: project.accents.map(a => a.id === accent.id ? next : a) }, accent.id + Object.keys(data).join(',')); }
    function changeColor(value: string, kind: 'seed' | 'foregroundLight' | 'foregroundDark') { try {
        const hex = pickerHex(value);
        patch(kind === 'seed' ? updateSeed(accent, hex) : { [kind]: hex });
        setSeedError('');
    }
    catch (e) {
        setSeedError((e as Error).message);
    } }
    function changeBackground(theme: 'Light' | 'Dark', value: string) { try {
        commit({ ...project, backgrounds: { ...project.backgrounds, [theme]: pickerHex(value) } }, 'bg' + theme);
        setBackgroundErrors(errors=>({...errors,[theme]:''}));
    }
    catch (e) {
        setBackgroundErrors(errors=>({...errors,[theme]:(e as Error).message}));
    } }
    function rename() { if(isNeutral)return; const name = nameDraft.trim().toLowerCase(); if (!/^[a-z][a-z0-9-]{0,39}$/.test(name)) {
        setNameError(t('1–40 символов: латиница, цифры и дефис. Начните с буквы.'));
        return;
    } if (name==='neutral'||project.accents.some(a => a.id !== accent.id && a.name === name)) {
        setNameError(t('Такое имя уже есть.'));
        return;
    } setNameError(''); if (name !== accent.name)
        patch({ name }); }
    function add(preset?: {
        name: string;
        hex: string;
    }) { if (!canAdd)
        return; let name = preset?.name ?? 'accent', i = 2; while (project.accents.some(a => a.name === name))
        name = `${preset?.name ?? 'accent'}-${i++}`; const a = createAccent(name, preset?.hex ?? toHex(color(.63, .24, (accent.hue + 47) % 360))); commit({ ...project, accents: [...project.accents, a] }); setSelected(a.id); setView('color'); setDetailTab('specimens'); setAddOpen(false); setMobilePanel(''); }
    function undo() { const previous = history.at(-1); if (!previous)
        return; setProject(previous); setHistory(h => h.slice(0, -1)); lastCommit.current = { key: '', time: 0 }; setNotice(t('Изменение отменено.')); }
    async function importFile(file?: File) { if (!file)
        return; try {
        if (file.size > 2000000)
            throw new Error(t('Файл проекта слишком большой.'));
        setImportDraft(validateProject(JSON.parse(await file.text())));
        setImportError('');
    }
    catch (e) {
        setImportError((e as Error).message);
    } if (fileRef.current)
        fileRef.current.value = ''; }
    async function copy(text: string) { try {
        await navigator.clipboard.writeText(text);
        setNotice(t('Скопировано.'));
    }
    catch {
        setNotice(t('Буфер обмена недоступен. Скачайте файл.'));
    } }
    function saveExport() { const ext = format === 'css' ? 'css' : format === 'figma' ? 'js' : 'json'; download(format === 'project' ? 'palette-lab-project.json' : `palette-${exportScope === 'all' ? 'all' : accent.name}.${format === 'tokens' ? 'tokens.' : ''}${ext}`, exportText, format === 'css' ? 'text/css' : format === 'figma' ? 'text/javascript' : 'application/json'); }
    function openColor(a: Accent, tab='specimens', nextSurface?:string) {setSelected(a.id);setView('color');setDetailTab(normalizeDetailTab(tab,a.id==='neutral'));if(nextSurface)setSurface(nextSurface);setMobilePanel('');mainRef.current?.scrollTo(0,0);}
    function navigate(next: string) { setView(next); setMobilePanel(''); mainRef.current?.scrollTo(0, 0); }
    function pick(c: Context, role: string) { const value = valueOf(c, role); void copy(value.a < 1 ? css(value) : toHex(value)); }
    const rules = (data: Partial<Project['rules']>) => commit({ ...project, rules: { ...project.rules, ...data } }, 'rules' + Object.keys(data).join(','));
    const removeColor = () => { if (!deleteId || project.accents.length<2) return; commit({...project,accents:project.accents.filter(a=>a.id!==deleteId)}); setDeleteId(null); setNotice(t('Цвет удалён. Можно отменить изменение.')); };
    const contrastRules = <div className="cap-pl-contrast-rules" role="group" aria-label={t("Правила контраста")}>
      <Select label={t("Контраст")} aria-label={t("Минимальный контраст текста")} appearance="parameter" size="md" value={String(project.rules.minimumContrast)} onValueChange={n=>rules({minimumContrast:Number(n)})} options={[{value:'4.5',label:'4.5:1',meta:'AA'},{value:'5',label:'5:1'},{value:'6',label:'6:1'},{value:'7',label:'7:1',meta:'AAA'}]}/>
      <Tooltip variant="inverse" content={t("Подбор заливки")} description={t("Сдвигает Primary к ближайшей ступени палитры, на которой выбранный текст проходит заданный контраст. Если выключить, исходная заливка сохраняется, а нехватка контраста отмечается в образце.")}>
        <Switch className="cap-pl-adapt-fill" size="sm" variant="neutral" label={t("Подбор заливки")} checked={project.rules.adaptPrimary} onChange={e=>rules({adaptPrimary:e.target.checked})}/>
      </Tooltip>
    </div>;
    function replaceAccent(next:Accent){commit(isNeutral?{...project,neutral:{...project.neutral,accent:next}}:{...project,accents:project.accents.map(a=>a.id===accent.id?next:a)});}
    function resetRecommended(){
      if(resetScope==='all')commit({...project,accents:project.accents.map(resetAccentRecommendations),neutral:{...createNeutralSystem(),accent:resetAccentRecommendations(project.neutral.accent)},rules:{...project.rules,balanceSecondary:true}});
      else if(isNeutral)commit({...project,neutral:{...createNeutralSystem(),accent:resetAccentRecommendations(accent)}});
      else replaceAccent(resetAccentRecommendations(accent));
      setResetScope(null);setNotice(t('Рекомендованные значения восстановлены. Можно отменить.'));
    }
    const left = <><nav aria-label={t("Разделы редактора")}>{nav.map(n=><Button key={n.id} size="md" variant="ghost" className="cap-pl-nav-item" aria-current={view===n.id?'page':undefined} leading={<Icon name={n.icon} size={18}/>} onClick={()=>navigate(n.id)}>{t(n.label)}</Button>)}</nav>
      <section className="cap-pl-color-section"><div className="cap-pl-section-title"><h2>{t("Цвета ")}<span>{allAccents.length}</span></h2><Button size="md" variant="ghost" aria-label={t("Добавить цвет")} disabled={!canAdd} onClick={()=>setAddOpen(true)}><Icon name="plus" size={18}/></Button></div><div className="cap-pl-color-list">{allAccents.map(a=><div className="cap-pl-color-row" key={a.id} data-selected={isDetail&&a.id===accent.id||undefined}><Button size="md" variant="ghost" className="cap-pl-color-item" aria-current={isDetail&&a.id===accent.id?'page':undefined} onClick={()=>openColor(a)} leading={<i style={{background:a.id==='neutral'?'#000000':a.hex}}/>}><span className="cap-pl-color-name" title={a.id==='neutral'?'Neutral':a.name}>{a.id==='neutral'?'Neutral':a.name}</span></Button>{a.id!=='neutral'&&<Button className="cap-pl-delete-color" variant="ghost" size="md" aria-label={t(`Удалить ${a.name}`)} disabled={project.accents.length===1} onClick={()=>setDeleteId(a.id)}><Icon name="close" size={14}/></Button>}</div>)}</div></section>
      <div className="cap-pl-bottom"><section className="cap-pl-global">{contrastRules}<Button variant="ghost" size="md" className="cap-pl-reset-all" onClick={()=>setResetScope('all')}>{t("Сбросить все цвета")}</Button></section><div className="cap-pl-left-footer"><div className="cap-pl-file-actions"><Button variant="ghost" size="md" aria-label={t("Отменить изменение")} disabled={!history.length} onClick={undo}><Icon name={Undo2} size={16}/></Button><Button variant="ghost" size="md" aria-label={t("Импорт проекта")} onClick={()=>fileRef.current?.click()}><Icon name="folder" size={16}/></Button><Button variant="ghost" size="md" aria-label={t("Скачать проект")} onClick={()=>download('palette-lab-project.json',JSON.stringify(project,null,2))}><Icon name={Download} size={16}/></Button><div className="cap-pl-language"><Button variant="ghost" size="md" aria-label={locale==='ru'?'Switch to English':'Переключить на русский'} onClick={()=>setLocale(locale==='ru'?'en':'ru')}>{locale==='ru'?'EN':'RU'}</Button></div></div>{importError&&<p className="cap-pl-error" role="alert">{t(importError)}</p>}{!saved&&<p className="cap-pl-error">{t("Скачайте проект: автосохранение недоступно.")}</p>}</div></div></>;
    const resetColorButton = <Button className="cap-pl-reset-color" variant="secondary" size="md" onClick={()=>setResetScope('color')} leading={<Icon name={Undo2} size={14}/>}>{t("Сбросить цвет")}</Button>;
    const inspectorFields = <>
      <section className="cap-pl-panel-section"><div className="cap-pl-name-row"><Input aria-label={t("Имя токена")} className="cap-pl-name-input" size="md" readOnly={isNeutral} value={isNeutral?'Neutral':nameDraft} onChange={e=>setNameDraft(e.target.value)} onBlur={rename} onKeyDown={e=>{if(e.key==='Enter')rename();if(e.key==='Escape'){setNameDraft(accent.name);setNameError('');}}} error={t(nameError)}/></div>
      <div className="cap-pl-seed-picker"><ColorPicker label={t("Базовый цвет")} size="md" value={accent.hex} onValueChange={v=>changeColor(v,'seed')} error={seedError?t(seedError):undefined}/></div>
      <FillSlider label={t("Тон")} value={accent.hue} min={0} max={360} suffix="°" onChange={hue=>patch({hue})}/>
      <FillSlider description={t("Задаёт цветность единой растяжки. Все роли используют её ступени в Light и Dark.")} label={t("Насыщенность")} value={(accent.vividness??project.rules.vividness)*100} min={50} max={150} suffix="%" onChange={n=>patch({vividness:n/100})}/>
      <FillSlider description={t("Амплитуда цветности единой растяжки в OKLCH. За пределами sRGB цветность уменьшается без сдвига тона.")} label={t("Цветность основы")} value={accent.primaryChroma} min={isNeutral?0:.005} max={isNeutral?.05:.35} step={.005} onChange={primaryChroma=>patch({primaryChroma})}/>
      <Select label={t("Ступени")} aria-label={t("Число ступеней палитры")} appearance="parameter" size="md" value={String(accent.paletteSteps)} onValueChange={n=>patch({paletteSteps:Number(n)})} options={[21,25,33,41,49].map(n=>({value:String(n),label:String(n)}))}/></section>
      {!isNeutral&&<><section className="cap-pl-panel-section"><div className="cap-pl-fill-heading"><Tooltip variant="inverse" content={t("Мягкие заливки")} description={t("Цветность и плотность вторичных заливок. Генератор подбирает ступень палитры и прозрачность под каждую поверхность.")}><h2 tabIndex={0}>{t("Мягкие заливки")}</h2></Tooltip><Button className="cap-pl-exact-toggle" size="md" variant="ghost" aria-label={t("Точные значения заливок")} aria-pressed={exactFields} onClick={()=>setExactFields(!exactFields)}>{t("Значения")}</Button></div><CharacterPad chroma={accent.softChroma} density={accent.opacityScale} showFields={exactFields} onChange={(softChroma,opacityScale)=>patch({softChroma,opacityScale})}/></section>
      <Accordion chevronPosition="end" title={t("Основная заливка")} className="cap-pl-disclosure cap-pl-panel-section"><div className="cap-pl-stack"><div className="cap-pl-duo cap-pl-single">{primaryThemes.map(({theme,label})=><Numeric key={theme} label={t(`Светлота ${label}`)} short={t("Светлота")} value={(theme==='Light'?accent.lightnessLight:accent.lightnessDark)*100} min={theme==='Light'?25:50} max={theme==='Light'?92:95} step={.5} suffix="%" onChange={n=>patch(theme==='Light'?{lightnessLight:n/100}:{lightnessDark:n/100})}/>)}</div>
      <Select label={t("Текст")} aria-label={t("Текст на Primary")} appearance="parameter" size="md" value={accent.foregroundMode} onValueChange={foregroundMode=>patch({foregroundMode})} options={[{value:'auto',label:t('Авто')},{value:'light',label:t('Светлый')},{value:'dark',label:t('Тёмный')},{value:'custom',label:t('По образцу')}]}/>
      {accent.foregroundMode==='custom'?<div className="cap-pl-stack">{primaryThemes.map(({theme,label})=><ColorPicker key={theme} label={t(`Образец текста · ${label}`)} value={theme==='Light'?accent.foregroundLight:accent.foregroundDark} size="md" onValueChange={v=>changeColor(v,theme==='Light'?'foregroundLight':'foregroundDark')}/>)}<p className="cap-pl-view-note">{t("Текст использует ближайшую подходящую ступень палитры.")}</p></div>:<FillSlider label={t("Тонирование текста")} value={accent.foregroundTint*100} min={0} max={100} suffix="%" onChange={n=>patch({foregroundTint:n/100})}/>}
      <div className="cap-pl-foreground-pair">{primaryThemes.map(({theme,label})=>{const p=primaryPair(accent,theme,project.rules);return <div key={theme}><span>{label}</span><i style={{background:css(p.foreground)}}/><code>{toHex(p.foreground)}</code></div>;})}</div></div></Accordion>
      <Accordion chevronPosition="end" title={t("Текст и состояния")} className="cap-pl-disclosure cap-pl-panel-section"><div className="cap-pl-stack">
        {effectiveTheme==='Dark'&&<FillSlider description={t("Запрос цветности ролей в тёмном окружении относительно Light. Генератор выбирает подходящие ступени общей палитры; сами цвета палитры не меняются.")} label={t("Цветность ролей Dark")} value={(accent.darkChromaMultiplier??.9)*100} min={50} max={120} suffix="%" onChange={n=>patch({darkChromaMultiplier:n/100})}/>}
        <FillSlider description={t("Запрос цветности для текста. Генератор подбирает ступень общей палитры и прозрачность с учётом контраста.")} label={t("Цветность текста")} value={accent.textChroma*100} min={30} max={180} suffix="%" onChange={n=>patch({textChroma:n/100})}/>
        <FillSlider description={t("Разница светлоты между Normal и Active у Primary. У Secondary и Tertiary переход рассчитывается отдельно, чтобы сохранить рекомендованную светимость.")} label={t("Шаг Primary")} value={accent.stateDelta*100} min={1.5} max={9} step={.5} suffix="%" onChange={n=>patch({stateDelta:n/100})}/>
      </div></Accordion></>}
    </>;
    const inspector = <><div className="cap-pl-inspector-scroll">{inspectorFields}</div><footer className="cap-pl-inspector-footer">{resetColorButton}</footer></>;
    const detailContent=<>{isNeutral&&page==='surfaces'&&<NeutralSurfaces minimumContrast={project.rules.minimumContrast} settings={project.neutral.settings} steps={palette[0].steps} theme={themes as 'Light'|'Dark'} scheme={scheme} onChange={settings=>commit({...project,neutral:{...project.neutral,settings}},'neutral-surfaces')}/>}{page === 'specimens' && <div className="cap-pl-previews cap-pl-one-theme">{visible.map(c => <Preview key={c.theme} c={c} onPick={pick}/>)}</div>}{page === 'matrix' && <Matrix contexts={chosen} onPick={pick}/>}{page === 'palettes' && <><div className="cap-pl-palette-toolbar"><SegmentedControl label={t("Вид палитры")} value={paletteView} onValueChange={setPaletteView} options={[{value:'ramps',label:t('Растяжка')},{value:'contexts',label:t('Роли')}]}/></div>{paletteView === 'ramps' ? <Ramps scales={palette} contexts={chosen} onCopy={copy}/> : <Palettes contexts={chosen} onPick={pick}/>}</>}
{page === 'tokens' && <section className="cap-pl-export"><div className="cap-pl-export-toolbar"><Select aria-label={t("Формат экспорта")} size="md" value={format} onValueChange={setFormat} options={[{ value: 'tokens', label: t('Токены JSON') }, { value: 'css', label: 'CSS' }, { value: 'figma', label: 'Figma · JS' }, { value: 'project', label: t('Проект') }]}/><Select aria-label={t("Область экспорта")} size="md" value={exportScope} onValueChange={setScope} disabled={format === 'project'||!isDetail} options={[{ value: 'current', label: t('Этот цвет') }, { value: 'all', label: t(`Все цвета · ${project.accents.length}`) }]}/><Button size="md" variant="primary" disabled={computed.pending||!!computed.error} onClick={saveExport} leading={<Icon name={Download} size={16}/>}>{t("Скачать")}</Button><Button size="md" variant="ghost" aria-label={t("Копировать экспорт")} disabled={computed.pending||!!computed.error} onClick={() => copy(exportText)}><Icon name="copy" size={16}/></Button></div><p className="cap-pl-view-note">{format === 'tokens' ? t('Единая палитра → роли → поверхности. Цвет и прозрачность связаны отдельными aliases.') : format === 'figma' ? t('Код для main-файла локального плагина Figma. Коллекции Palette Lab обновляются по именам.') : format === 'project' ? t('Все цвета и общие настройки. Можно открыть в этом редакторе.') : t('28 контекстов: темы, схемы и поверхности. Пигмент и opacity — отдельные CSS-переменные.')}</p>{failures.length > 0 && <p className="cap-pl-error">{t("В палитрах есть замечания. Проверьте их перед использованием экспорта.")}</p>}<pre tabIndex={0} aria-label={t("Предпросмотр экспорта")}>{exportText.slice(0, 22000)}{exportText.length > 22000 ? t('\n… Полный файл доступен при скачивании.') : ''}</pre></section>}{page === 'tokens' && failures.length > 0 && <Accordion className="cap-pl-issues" title={t(`${failures.length} контекстов требуют проверки`)}>{failures.map((c, i) => <div key={i}><strong>{c.accent} / {c.theme} / {c.scheme} / {c.surface}</strong><ul>{c.issues.slice(0, 6).map((issue, j) => <li key={j}>{t(issue)}</li>)}</ul></div>)}</Accordion>}</>;
    return <div className="cap-pl-app" data-surface="shell"><a className="cap-pl-skip" href="#palette-canvas">{t("К содержимому")}</a><input className="cap-pl-hidden" type="file" ref={fileRef} accept=".json,application/json" aria-label={t("Импорт проекта JSON")} onChange={e => importFile(e.target.files?.[0])}/><Workspace left={left} right={showInspector?inspector:undefined} widths={widths} onWidths={setWidths}><div className="cap-pl-center" data-surface="content"><ScrollArea ref={mainRef} className="cap-pl-canvas-scroll" label={t("Содержимое палитры")} fade="vertical" fadeSize={48} fadeReveal={32} floating={<EnvironmentControls surface={surface} onSurface={setSurface} themes={themes} onThemes={setThemes} scheme={scheme} onScheme={setScheme} density={density} onDensity={setDensity} borders={borders} onBorders={setBorders} backgroundErrors={backgroundErrors} backgrounds={project.backgrounds} onBackground={changeBackground} onEditNeutrals={()=>openColor(project.neutral.accent)}/>}><main id="palette-canvas" tabIndex={-1} className="cap-pl-workspace" data-surface="content"><header className="cap-pl-workspace-heading"><div className="cap-pl-heading-title"><Button className="cap-pl-mobile-menu" variant="ghost" size="md" aria-label={t("Навигация")} onClick={() => setMobilePanel('left')}><Icon name="panelLeft" size={18}/></Button><div className="cap-pl-title-line"><h1>{isDetail?(isNeutral?'Neutral':accent.name):t(nav.find(n=>n.id===view)?.label??'')}</h1>{!isDetail&&<Counter value={allAccents.length}/>}</div></div>{isDetail?(showInspector&&<Button className="cap-pl-mobile-inspect" variant="ghost" size="md" onClick={() => setMobilePanel('right')} leading={<Icon name="sliders" size={18}/>}>{t("Параметры")}</Button>):<Button className="cap-pl-add-button" aria-label={t("Добавить цвет")} size="md" variant="primary" disabled={!canAdd} title={!canAdd?t('Максимум 128 цветов'):undefined} onClick={()=>setAddOpen(true)} leading={<Icon name="plus" size={16}/>}><span className="cap-pl-add-label">{t("Добавить цвет")}</span></Button>}</header>
      <div className="cap-pl-canvas-content" aria-busy={computed.pending} data-compute-ms={computed.elapsedMs} data-context-count={computed.contexts.length}>{computed.pending&&(page==='tokens'?!computed.text:!computed.contexts.length&&page!=='palettes'&&page!=='surfaces')&&<p className="cap-pl-computing" role="status" aria-live="polite">{t("Вычисление цветов…")}</p>}{computed.error&&<p className="cap-pl-error" role="alert">{t(computed.error)}</p>}{isDetail?<Tabs variant="pills" label={t(`Разделы цвета ${accent.name}`)} className="cap-pl-detail-tabs" value={detailTab} onValueChange={setDetailTab} items={activeDetailTabs.map(t=>({...t,label:locale==='en'?dictionary[t.label]??t.label:t.label,content:t.value===detailTab?detailContent:null}))}/>:<>{view==='overview'&&<Overview {...collectionProps} contexts={collectionContexts.filter(c=>c.surface===surface)}/>}{view==='palettes'&&<PaletteCollection {...collectionProps}/>}{view==='matrix'&&<SurfaceCollection {...collectionProps}/>}{view==='materials'&&<MaterialStudy {...collectionProps}/>}{view==='tokens'&&detailContent}</>}</div>
    </main></ScrollArea></div></Workspace><Drawer open={!!mobilePanel} onOpenChange={open => { if (!open)
        setMobilePanel(''); }} className={mobilePanel==='right'?'cap-pl-inspector-drawer':undefined} footer={mobilePanel==='right'?resetColorButton:undefined} title={mobilePanel === 'left' ? t('Навигация') : t('Параметры цвета')} side={mobilePanel === 'left' ? 'left' : 'right'}><div className={`cap-pl-drawer-content${mobilePanel==='left'?' cap-pl-drawer-navigation':''}`}>{mobilePanel === 'left' ? left : inspectorFields}</div></Drawer><Dialog open={!!resetScope} onOpenChange={open=>{if(!open)setResetScope(null);}} title={resetScope==='all'?t('Сбросить все цвета?'):t(`Сбросить ${isNeutral?'нейтральную палитру':accent.name}?`)} description={resetScope==='all'?t(`Настройки ${project.accents.length} цветов и нейтральной палитры вернутся к рекомендациям. Ручные правки ступеней и подложек будут сброшены. Имена и тона сохранятся. Действие можно отменить.`):t('Настройки и ручные правки этого цвета вернутся к рекомендациям. Выбранный тон сохранится. Действие можно отменить.')} footer={<><Button onClick={()=>setResetScope(null)}>{t("Отмена")}</Button><Button variant="primary" onClick={resetRecommended}>{resetScope==='all'?t('Сбросить все цвета'):t('Сбросить цвет')}</Button></>}>{null}</Dialog><Dialog open={!!deleteId} onOpenChange={open=>{if(!open)setDeleteId(null);}} title={t("Удалить цвет?")} description={t(`Цвет ${project.accents.find(a=>a.id===deleteId)?.name??''} и его ручные правки исчезнут из проекта. Действие можно отменить.`)} footer={<><Button onClick={()=>setDeleteId(null)}>{t("Оставить")}</Button><Button variant="primary" onClick={removeColor}>{t("Удалить цвет")}</Button></>}>{null}</Dialog><Dialog open={addOpen} onOpenChange={setAddOpen} title={t("Добавить цвет")} size="md"><Input aria-label={t("Найти пресет")} placeholder={t("Найти пресет…")} value={presetSearch} onChange={e => setPresetSearch(e.target.value)} size="md"/><div className="cap-pl-presets">{presets.filter(p => p.name.includes(presetSearch.toLowerCase())).map(p => <Button key={p.name} variant="ghost" size="md" disabled={!canAdd} onClick={() => add(p)} leading={<i style={{ background: p.hex }}/>}>{p.name}</Button>)}</div><Button size="md" variant="ghost" onClick={()=>{const missing=presets.filter(p=>!project.accents.some(a=>a.name===p.name)).slice(0,128-project.accents.length);if(!missing.length)return;commit({...project,accents:[...project.accents,...missing.map(p=>createAccent(p.name,p.hex))]});setAddOpen(false);setView("overview");}} disabled={!canAdd||presets.every(p=>project.accents.some(a=>a.name===p.name))}>{t("Добавить недостающие пресеты")}</Button><Button size="md" disabled={!canAdd} onClick={() => add()} leading={<Icon name="plus" size={16}/>}>{t("Свой цвет")}</Button></Dialog><Dialog open={!!importDraft} onOpenChange={open => { if (!open)
        setImportDraft(null); }} title={t("Открыть проект")} description={t(`Заменить текущие ${project.accents.length} цвета на ${importDraft?.accents.length ?? 0} из файла? Текущие изменения можно отменить.`)} footer={<><Button onClick={() => setImportDraft(null)}>{t("Отмена")}</Button><Button variant="primary" onClick={() => { if (importDraft) {
        commit(importDraft);
        setSelected(importDraft.accents[0].id);
    } setImportDraft(null); setNotice(t('Проект открыт.')); }}>{t("Открыть")}</Button></>}>{null}</Dialog><div className={`cap-pl-notice${notice ? ' cap-pl-notice-visible' : ''}`} role="status">{notice}</div></div>;
}
createRoot(document.getElementById('root')!).render(<PaletteLocaleProvider><App /></PaletteLocaleProvider>);
