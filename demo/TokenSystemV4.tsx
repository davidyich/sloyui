import { useCatalogText } from './catalog-locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, ComboBox, FileCard, Input, SegmentedControl, Select, Switch, Tag, useTranslate } from '../src';
import './foundations-v10.css';
import { defaultTokenModes, formatTokenValue, resolveTokenChain, resolveTokenValue, tokenColor, tokenGraph, tokenIndex, type TokenModes } from './token-v4-data';
import './token-system-v4.css';

export function useTokenModes() {
  const read = (): TokenModes => {
    if (typeof document === 'undefined') return defaultTokenModes;
    return Object.fromEntries(Object.entries(tokenGraph.axes).map(([key, axis]) => {
      const attribute = `data-${key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
      const selected = document.documentElement.getAttribute(attribute);
      return [key, axis.values.find(mode => mode.toLowerCase() === selected) ?? axis.default];
    }));
  };
  const [modes, setModes] = useState(read);
  useEffect(() => { const observer = new MutationObserver(() => setModes(read())); observer.observe(document.documentElement, { attributes: true }); return () => observer.disconnect(); }, []);
  return modes;
}

export function TokenGraphInspector({ copy, initialPath = 'Theme/surface/secondary/blue-normal', surface }: { copy?: (value: string) => void; initialPath?: string; surface?: string }) {
  const c=useCatalogText();
  const t = useTranslate();
  const inheritedModes = useTokenModes();
  const modes = { ...inheritedModes, ...(surface ? { Surface: surface[0].toUpperCase()+surface.slice(1) } : {}) };
  const [collection,setCollection] = useState(initialPath.split('/')[0]);
  const [path,setPath] = useState(initialPath);
  const [status,setStatus] = useState('');
  const entries = useMemo(()=>[...tokenIndex].filter(([,token])=>token.collection.key===collection),[collection]);
  const chain = resolveTokenChain(path,modes), node=chain[0],resolved=chain.at(-1)!;
  const value=resolveTokenValue(path,modes),formatted=formatTokenValue(value,resolved.variable.unit);
  const chooseCollection=(key:string)=>{setCollection(key);setPath(`${key}/${tokenGraph.collections.find(item=>item.key===key)!.variables[0].name}`);setStatus('');};
  const copyValue=async()=>{try{if(copy)copy(path);else await navigator.clipboard.writeText(path);setStatus(t('Имя скопировано','Name copied'));}catch{setStatus(t('Не удалось скопировать','Could not copy'));}};
  return <section id="color-tokens" className="cap-v4-section cap-v4-inspector" aria-labelledby="v4-graph-title">
    <div className="cap-v4-section-heading"><h2 id="v4-graph-title">{t('Токены','Tokens')}</h2><p>{t('Найдите роль и скопируйте её имя. Значение следует выбранным теме и поверхности.','Find a role and copy its name. Its value follows the selected theme and surface.')}</p></div>
    <div className="cap-v4-token-picker"><Select label={t('Коллекция','Collection')} value={collection} onValueChange={chooseCollection} options={tokenGraph.collections.map(item=>({value:item.key,label:item.key}))}/><ComboBox label={t('Токен','Token')} value={path} clearable={false} onValueChange={value=>{if(value)setPath(value);setStatus('');}} options={entries.map(([key,token])=>({value:key,label:token.variable.name}))} placeholder={t('Найти по имени','Search by name')}/></div>
    <div className="cap-v4-token-result" data-token-node={path}><div>{resolved.variable.type==='COLOR'&&<span className="cap-v4-resolved-swatch" style={{background:formatted}} aria-hidden="true"/>}<code>{formatted}</code></div><Button size="sm" onClick={()=>void copyValue()}>{t('Копировать имя','Copy name')}</Button></div>
    <details className="cap-v4-token-details"><summary>{t('Режимы и источник','Modes and source')}</summary><div className="cap-v4-context-line">{Object.entries(modes).map(([key,value])=><span key={key}>{key} <strong>{value}</strong></span>)}</div><ol className="cap-v4-token-chain" aria-label={t('Цепочка алиасов','Alias chain')}>{chain.map(item=><li key={item.path}><code>{item.path}</code><span>{item.mode}</span></li>)}</ol></details>
    {status&&<p className="cap-v4-copy-status" role="status">{status}</p>}
  </section>;
}

export function TokenCollections({ onChoose }: { onChoose?: (collection: string) => void }) {
  const c=useCatalogText();
  return <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>{c("Коллекции")} · {tokenGraph.collections.length}</h2><p>{c("Surface содержит дизайнерские роли цвета. Theme и SurfaceScheme связывают режимы; Palette и Primitives хранят исходные значения.")}</p></div><div className="cap-v4-collections">{tokenGraph.collections.map(collection => {
    const content = <><strong>{collection.key}<span>{collection.variables.length}</span></strong><small>{collection.modes.join(' / ')}</small></>;
    return onChoose ? <Button variant="ghost" key={collection.key} data-collection={collection.key} onClick={() => onChoose(collection.key)}>{content}</Button> : <div key={collection.key} data-collection={collection.key}>{content}</div>;
  })}</div><p className="cap-v4-note">{tokenGraph.collections.reduce((sum, item) => sum + item.variables.length, 0)}{c("переменных. Цвета Theme сгруппированы по назначению:")}<code>surface</code>, <code>content</code>, <code>border</code>, <code>stable</code>.</p></section>;
}

export function TokenDownloads() {
  const c=useCatalogText();
  const downloads = [
    ['token-system-v4/graph.json', c("Граф JSON")], ['token-system-v4/source.json', c("Исходные правила")], ['token-system-v4/tokens.css', 'CSS'], ['token-system-v4/guide.md', c("Короткий гайд")], ['token-system-v4/explorer.html', c("Автономный пример")],
    ['color-system-v2/native-graph.json', c("Граф Figma Native")], ['color-system-v2/native.css', 'CSS Figma Native'], ['color-system-v2/export-custom.mjs', c("Исходник генератора Custom")], ['color-system-v2/README.md', c("Native и Custom: инструкция")],
  ];
  return <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>{c("Исходники и экспорт")}</h2><p>{c("Runtime, нативный граф Figma и отдельные фоны проекта используют общие цветовые правила. Инструкция описывает назначение файлов и запуск генератора Custom из репозитория.")}</p></div><div className="cap-v4-downloads">{downloads.map(([path, label]) => <a className="cap-v4-download" key={path} href={`${import.meta.env.BASE_URL}${path}`} download>{label}<code>{path.split('/').at(-1)}</code></a>)}</div></section>;
}

export function TokenSystemV4({ copy }: { copy?: (value: string) => void }) {
  const c=useCatalogText();
  const [initialPath, setInitialPath] = useState('Theme/surface/secondary/blue-normal');
  const inspector = useRef<HTMLDivElement>(null);
  const chooseCollection = (key: string) => {
    setInitialPath(`${key}/${tokenGraph.collections.find(collection => collection.key === key)!.variables[0].name}`);
    inspector.current?.scrollIntoView?.({ block: 'start' });
  };
  return <div className="cap-v4-page"><header className="page-intro"><h1>{c("Система токенов v4")}</h1><p>{c("Выберите роль по задаче объекта. Тема, поверхность, плотность и скругления меняют значения через независимые режимы.")}</p></header><TokenCollections onChoose={chooseCollection}/><div ref={inspector}><TokenGraphInspector key={initialPath} initialPath={initialPath} copy={copy}/></div><TokenDownloads/></div>;
}

export function GeometryV4({ embedded = false }: { embedded?: boolean }) {
  const c=useCatalogText();
  const modes = useTokenModes();
  const [density, setDensity] = useState<string | null>(null);
  const [radius, setRadius] = useState<string | null>(null);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [name, setName] = useState(c("Рабочие заметки"));
  const [attachments, setAttachments] = useState(true);
  const [saved, setSaved] = useState('');
  const selectedDensity = density ?? modes.Density;
  const selectedRadius = radius ?? modes.Radius;
  const densityCollection = tokenGraph.collections.find(item => item.key === 'Density')!;
  const radiusCollection = tokenGraph.collections.find(item => item.key === 'Radius')!;
  const context = { ...modes, Density: selectedDensity, Radius: selectedRadius };
  const metric = (path: string) => formatTokenValue(resolveTokenChain(path, context).at(-1)!.value, 'px');
  return <div className="cap-v4-page">{!embedded && <header className="page-intro"><h1>{c("Размеры и форма")}</h1><p>{c("Density меняет адаптивную геометрию. Radius задаёт независимые скругления. Сравните живой пример и значения из графа.")}</p></header>}<section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>{c("Плотность и скругления")}</h2><p>{c("Adaptive использует единицу 4 px в Default и 3 px в Compact. Fixed сохраняет размер. Текст, иконки и область нажатия 44 px не уменьшаются. Radius выбирается независимо.")}</p></div><div className="cap-geometry-playground">
<div className="cap-geometry-settings cap-surface-boundary"><div><h3>{c("Плотность")}</h3><SegmentedControl fullWidth size="sm" label={c("Плотность примера")} value={selectedDensity} onValueChange={setDensity} options={tokenGraph.axes.Density.values.map(value=>({value,label:value}))}/></div><div><h3>{c("Скругления")}</h3><SegmentedControl fullWidth size="sm" label={c("Скругления примера")} value={selectedRadius} onValueChange={setRadius} options={tokenGraph.axes.Radius.values.map(value=>({value,label:value}))}/></div><div><h3>{c("Размер компонентов")}</h3><SegmentedControl fullWidth size="sm" label={c("Размер компонентов примера")} value={size} onValueChange={value=>setSize(value as typeof size)} options={['sm','md','lg'].map(value=>({value,label:value.toUpperCase()}))}/></div><Switch size="sm" label={c("Показать вложение")} checked={attachments} onChange={event=>setAttachments(event.target.checked)}/><Button size="sm" variant="ghost" onClick={()=>{setDensity(null);setRadius(null);setSize('md');}}>{c("Вернуть контекст каталога")}</Button></div>
<div className="cap-geometry-preview"><div className="cap-v4-geometry-sample cap-surface-boundary" data-surface={modes.Surface.toLowerCase()} data-density={selectedDensity.toLowerCase()} data-radius={selectedRadius.toLowerCase()}><div className="cap-geometry-preview-heading"><div><span>{c("КОЛЛЕКЦИЯ")}</span><h3>{name||c("Без названия")}</h3></div><Tag size={size} color="neutral" interactive={false} count={12}>{c("Заметки")}</Tag></div><Card className="cap-geometry-preview-card"><Input size={size} label={c("Название")} value={name} onChange={event=>{setName(event.target.value);setSaved('');}}/><p>{c("Наблюдения, ссылки и идеи для следующего проекта.")}</p>{attachments&&<FileCard size={size} name="research-notes.pdf" sizeLabel="248 KB"/>}<div className="cap-geometry-preview-actions"><Button size={size} disabled={!name.trim()} onClick={()=>setSaved(c("Изменения сохранены"))}>{c("Сохранить")}</Button><Button size={size} variant="secondary" onClick={()=>{setName(c("Рабочие заметки"));setSaved('');}}>{c("Сбросить название")}</Button></div></Card><p className="cap-geometry-status" role="status">{saved||c("Измените название и сохраните пример.")}</p></div><dl className="cap-geometry-metrics"><div><dt>{c("Отступ")}</dt><dd>{metric('Density/adaptive/padding/md')}</dd></div><div><dt>{c("Высота контрола")}</dt><dd>{metric(`Density/adaptive/control/height-${size}`)}</dd></div><div><dt>{c("Радиус")}</dt><dd>{metric('Radius/radius/base')}</dd></div><div><dt>{c("Область нажатия")}</dt><dd>{metric('Density/fixed/size/touch')}</dd></div></dl></div>
</div><p className="cap-v4-note">{c("Отступ:")}<code>round(k × u)</code>{c(". Высота контрола: строка текста + два вертикальных отступа. Скругление:")}<code>round(base × ratio)</code>{c("; база 0 / 4 / 8 / 16 px. Постоянные zero и pill остаются в Primitives.")}</p><div className="cap-v4-table-wrap"><table className="cap-v4-table"><caption>{c("Density · реальные значения двух режимов")}</caption><thead><tr><th>{c("Роль")}</th>{densityCollection.modes.map(mode => <th key={mode}>{mode}</th>)}</tr></thead><tbody>{densityCollection.variables.map(variable => <tr key={variable.name} data-token={variable.name}><td><code>{variable.name}</code></td>{densityCollection.modes.map(mode => <td key={mode}>{formatTokenValue(resolveTokenChain(`Density/${variable.name}`, { ...modes, Density: mode }).at(-1)!.value, variable.unit)}</td>)}</tr>)}</tbody></table></div><div className="cap-v4-table-wrap"><table className="cap-v4-table"><caption>{c("Radius · независимые скругления")}</caption><thead><tr><th>{c("Роль")}</th>{radiusCollection.modes.map(mode => <th key={mode}>{mode}</th>)}</tr></thead><tbody>{radiusCollection.variables.map(variable => <tr key={variable.name}><td><code>{variable.name}</code></td>{radiusCollection.modes.map(mode => <td key={mode}>{formatTokenValue(resolveTokenChain(`Radius/${variable.name}`, { ...modes, Radius: mode }).at(-1)!.value, variable.unit)}</td>)}</tr>)}</tbody></table></div></section></div>;
}

export default TokenSystemV4;
