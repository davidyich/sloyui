import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, FileCard, Input, SegmentedControl, Select, Switch, Tag } from '../src';
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

export function TokenGraphInspector({ copy, initialPath = 'Theme/surface/secondary/blue-normal' }: { copy?: (value: string) => void; initialPath?: string }) {
  const modes = useTokenModes();
  const [collection, setCollection] = useState(initialPath.split('/')[0]);
  const [path, setPath] = useState(initialPath);
  const [query, setQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(0);
  const [surface, setSurface] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const context = { ...modes, ...(surface ? { Surface: surface } : {}) };
  const entries = useMemo(() => [...tokenIndex].filter(([key, token]) => token.collection.key === collection && `${key} ${token.variable.description}`.toLowerCase().includes(query.toLowerCase())), [collection, query]);
  const chain = resolveTokenChain(path, context);
  const node = chain[Math.min(selectedNode, chain.length - 1)];
  const resolved = chain.at(-1)!;
  const resolvedValue=resolveTokenValue(path,context);
  const selectPath = (next: string) => { setPath(next); setSelectedNode(0); };
  const selectCollection = (next: string) => { setCollection(next); setQuery(''); selectPath(`${next}/${tokenGraph.collections.find(item => item.key === next)!.variables[0].name}`); };
  const copyPath = async () => {
    try {
      if (copy) copy(node.path);
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(node.path);
      else { setStatus('Копирование недоступно. Выделите имя токена.'); return; }
      setStatus(`Скопировано: ${node.path}`);
    } catch { setStatus('Не удалось скопировать. Выделите имя токена.'); }
  };
  return <section className="cap-v4-section cap-v4-inspector" aria-labelledby="v4-graph-title">
    <div className="cap-v4-section-heading"><h2 id="v4-graph-title">От роли к значению</h2><p>Выберите токен. Нажмите узел, чтобы увидеть его режим, описание и точное значение. Цвет меняется вместе с общей темой и схемой каталога.</p></div>
    <div className="cap-v4-graph-controls">
      <Select label="Коллекция графа" value={collection} onValueChange={selectCollection} options={tokenGraph.collections.map(item => ({ value: item.key, label: `${item.key} · ${item.variables.length}` }))}/>
      <Input label="Найти токен" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Имя или назначение"/>
      <Select label="Поверхность графа" value={surface ?? modes.Surface} onValueChange={setSurface} options={tokenGraph.axes.Surface.values.map(value => ({ value, label: value }))}/>
    </div>
    <div className="cap-v4-graph-layout">
      <div className="cap-v4-token-list" aria-label="Токены выбранной коллекции">{entries.slice(0, 80).map(([key, token]) => <Button variant="ghost" key={key} aria-pressed={path === key} onClick={() => selectPath(key)}><code>{token.variable.name}</code>{token.variable.type === 'COLOR' && <span className="cap-v4-swatch" style={{ background: tokenColor(key, context) }} aria-hidden="true"/>}</Button>)}{entries.length > 80 && <p>Показаны первые 80 из {entries.length}. Уточните поиск.</p>}{entries.length === 0 && <p role="status">Нет токенов с таким именем.</p>}</div>
      <div className="cap-v4-graph-detail">
        <div className="cap-v4-context-line">{Object.entries(context).map(([key, value]) => <span key={key}>{key} <strong>{value}</strong></span>)}</div>
        <ol className="cap-v4-chain" aria-label="Цепочка алиасов">{chain.map((item, index) => <li key={item.path}><Button variant={index === Math.min(selectedNode, chain.length - 1) ? 'secondary' : 'ghost'} aria-pressed={index === Math.min(selectedNode, chain.length - 1)} onClick={() => setSelectedNode(index)}><strong>{item.collection.key}</strong><code>{item.variable.name}</code><small>{item.mode}</small></Button>{index < chain.length - 1 && <span aria-hidden="true">→</span>}</li>)}</ol>
        <div className="cap-v4-node" data-token-node={node.path}>
          <div className="cap-v4-node-heading"><code>{node.path}</code><Button size="sm" variant="secondary" onClick={() => void copyPath()}>Копировать имя</Button></div>
          <p>{node.variable.description}</p>
          {typeof node.value==='object'&&'color' in node.value&&<div className="cap-v4-state-row"><Button size="sm" variant="secondary" onClick={()=>selectPath((node.value as {color:{alias:string}}).color.alias)}>Пигмент</Button><Button size="sm" variant="secondary" onClick={()=>selectPath((node.value as {opacity:{alias:string}}).opacity.alias)}>Opacity</Button></div>}<dl><div><dt>Режим</dt><dd>{node.mode}</dd></div><div><dt>Тип</dt><dd>{node.variable.type}</dd></div><div><dt>{typeof node.value === 'object' && 'alias' in node.value ? 'Ссылка' : 'Значение'}</dt><dd><code>{formatTokenValue(node.value, node.variable.unit)}</code></dd></div></dl>
          {resolved.variable.type === 'COLOR' && <p className="cap-v4-exact"><code>RGBA {JSON.stringify(resolvedValue)}</code></p>}<div className="cap-v4-resolved">{resolved.variable.type === 'COLOR' && <span className="cap-v4-resolved-swatch" style={{ background: formatTokenValue(resolvedValue) }} aria-hidden="true"/>}<span>Итоговое значение <strong>{formatTokenValue(resolvedValue, resolved.variable.unit)}</strong></span></div>
        </div>
        <p className="cap-v4-copy-status" role="status">{status}</p>
      </div>
    </div>
  </section>;
}

export function TokenCollections({ onChoose }: { onChoose?: (collection: string) => void }) {
  return <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Девять коллекций, один источник</h2><p>Для цвета выбирайте Theme. Density задаёт размеры и отступы, Radius — скругления. Palette и Primitives хранят исходные значения; остальные коллекции ссылаются на них.</p></div><div className="cap-v4-collections">{tokenGraph.collections.map(collection => {
    const content = <><strong>{collection.key}<span>{collection.variables.length}</span></strong><small>{collection.modes.join(' / ')}</small><p>{collection.description}</p></>;
    return onChoose ? <Button variant="ghost" key={collection.key} data-collection={collection.key} onClick={() => onChoose(collection.key)}>{content}</Button> : <div key={collection.key} data-collection={collection.key}>{content}</div>;
  })}</div><p className="cap-v4-note">{tokenGraph.collections.reduce((sum, item) => sum + item.variables.length, 0)} переменных. Цвета Theme сгруппированы по назначению: <code>surface</code>, <code>content</code>, <code>border</code>, <code>stable</code>.</p></section>;
}

export function TokenDownloads() {
  const downloads = [
    ['token-system-v4/graph.json', 'Граф JSON'], ['token-system-v4/source.json', 'Исходные правила'], ['token-system-v4/tokens.css', 'CSS'], ['token-system-v4/guide.md', 'Короткий гайд'], ['token-system-v4/explorer.html', 'Автономный пример'],
    ['color-system-v2/native-graph.json', 'Граф Figma Native'], ['color-system-v2/native.css', 'CSS Figma Native'], ['color-system-v2/export-custom.mjs', 'Исходник генератора Custom'], ['color-system-v2/README.md', 'Native и Custom: инструкция'],
  ];
  return <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Исходники и экспорт</h2><p>Runtime, нативный граф Figma и отдельные фоны проекта используют общие цветовые правила. Инструкция описывает назначение файлов и запуск генератора Custom из репозитория.</p></div><div className="cap-v4-downloads">{downloads.map(([path, label]) => <a className="cap-v4-download" key={path} href={`${import.meta.env.BASE_URL}${path}`} download>{label}<code>{path.split('/').at(-1)}</code></a>)}</div></section>;
}

export function TokenSystemV4({ copy }: { copy?: (value: string) => void }) {
  const [initialPath, setInitialPath] = useState('Theme/surface/secondary/blue-normal');
  const inspector = useRef<HTMLDivElement>(null);
  const chooseCollection = (key: string) => {
    setInitialPath(`${key}/${tokenGraph.collections.find(collection => collection.key === key)!.variables[0].name}`);
    inspector.current?.scrollIntoView?.({ block: 'start' });
  };
  return <div className="cap-v4-page"><header className="page-intro"><h1>Система токенов v4</h1><p>Выберите роль по задаче объекта. Тема, поверхность, плотность и скругления меняют значения через независимые режимы.</p></header><TokenCollections onChoose={chooseCollection}/><div ref={inspector}><TokenGraphInspector key={initialPath} initialPath={initialPath} copy={copy}/></div><TokenDownloads/></div>;
}

export function GeometryV4({ embedded = false }: { embedded?: boolean }) {
  const modes = useTokenModes();
  const [density, setDensity] = useState<string | null>(null);
  const [radius, setRadius] = useState<string | null>(null);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [name, setName] = useState('Рабочие заметки');
  const [attachments, setAttachments] = useState(true);
  const [saved, setSaved] = useState('');
  const selectedDensity = density ?? modes.Density;
  const selectedRadius = radius ?? modes.Radius;
  const densityCollection = tokenGraph.collections.find(item => item.key === 'Density')!;
  const radiusCollection = tokenGraph.collections.find(item => item.key === 'Radius')!;
  const context = { ...modes, Density: selectedDensity, Radius: selectedRadius };
  const metric = (path: string) => formatTokenValue(resolveTokenChain(path, context).at(-1)!.value, 'px');
  return <div className="cap-v4-page">{!embedded && <header className="page-intro"><h1>Размеры и форма</h1><p>Density меняет адаптивную геометрию. Radius задаёт независимые скругления. Сравните живой пример и значения из графа.</p></header>}<section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Плотность и скругления</h2><p>Adaptive использует единицу 4 px в Default и 3 px в Compact. Fixed сохраняет размер. Текст, иконки и область нажатия 44 px не уменьшаются. Radius выбирается независимо.</p></div><div className="cap-geometry-playground">
<div className="cap-geometry-settings cap-surface-boundary"><div><h3>Плотность</h3><SegmentedControl fullWidth size="sm" label="Плотность примера" value={selectedDensity} onValueChange={setDensity} options={tokenGraph.axes.Density.values.map(value=>({value,label:value}))}/></div><div><h3>Скругления</h3><SegmentedControl fullWidth size="sm" label="Скругления примера" value={selectedRadius} onValueChange={setRadius} options={tokenGraph.axes.Radius.values.map(value=>({value,label:value}))}/></div><div><h3>Размер компонентов</h3><SegmentedControl fullWidth size="sm" label="Размер компонентов примера" value={size} onValueChange={value=>setSize(value as typeof size)} options={['sm','md','lg'].map(value=>({value,label:value.toUpperCase()}))}/></div><Switch size="sm" label="Показать вложение" checked={attachments} onChange={event=>setAttachments(event.target.checked)}/><Button size="sm" variant="ghost" onClick={()=>{setDensity(null);setRadius(null);setSize('md');}}>Вернуть контекст каталога</Button></div>
<div className="cap-geometry-preview"><div className="cap-v4-geometry-sample cap-surface-boundary" data-surface={modes.Surface.toLowerCase()} data-density={selectedDensity.toLowerCase()} data-radius={selectedRadius.toLowerCase()}><div className="cap-geometry-preview-heading"><div><span>КОЛЛЕКЦИЯ</span><h3>{name||'Без названия'}</h3></div><Tag size={size} color="neutral" interactive={false} count={12}>Заметки</Tag></div><Card className="cap-geometry-preview-card"><Input size={size} label="Название" value={name} onChange={event=>{setName(event.target.value);setSaved('');}}/><p>Наблюдения, ссылки и идеи для следующего проекта.</p>{attachments&&<FileCard size={size} name="research-notes.pdf" sizeLabel="248 KB"/>}<div className="cap-geometry-preview-actions"><Button size={size} disabled={!name.trim()} onClick={()=>setSaved('Изменения сохранены')}>Сохранить</Button><Button size={size} variant="secondary" onClick={()=>{setName('Рабочие заметки');setSaved('');}}>Сбросить название</Button></div></Card><p className="cap-geometry-status" role="status">{saved||'Измените название и сохраните пример.'}</p></div><dl className="cap-geometry-metrics"><div><dt>Отступ</dt><dd>{metric('Density/adaptive/padding/md')}</dd></div><div><dt>Высота контрола</dt><dd>{metric(`Density/adaptive/control/height-${size}`)}</dd></div><div><dt>Радиус</dt><dd>{metric('Radius/radius/base')}</dd></div><div><dt>Область нажатия</dt><dd>{metric('Density/fixed/size/touch')}</dd></div></dl></div>
</div><p className="cap-v4-note">Отступ: <code>round(k × u)</code>. Высота контрола: строка текста + два вертикальных отступа. Скругление: <code>round(base × ratio)</code>; база 0 / 4 / 8 / 16 px. Постоянные zero и pill остаются в Primitives.</p><div className="cap-v4-table-wrap"><table className="cap-v4-table"><caption>Density · реальные значения двух режимов</caption><thead><tr><th>Роль</th>{densityCollection.modes.map(mode => <th key={mode}>{mode}</th>)}</tr></thead><tbody>{densityCollection.variables.map(variable => <tr key={variable.name} data-token={variable.name}><td><code>{variable.name}</code></td>{densityCollection.modes.map(mode => <td key={mode}>{formatTokenValue(resolveTokenChain(`Density/${variable.name}`, { ...modes, Density: mode }).at(-1)!.value, variable.unit)}</td>)}</tr>)}</tbody></table></div><div className="cap-v4-table-wrap"><table className="cap-v4-table"><caption>Radius · независимые скругления</caption><thead><tr><th>Роль</th>{radiusCollection.modes.map(mode => <th key={mode}>{mode}</th>)}</tr></thead><tbody>{radiusCollection.variables.map(variable => <tr key={variable.name}><td><code>{variable.name}</code></td>{radiusCollection.modes.map(mode => <td key={mode}>{formatTokenValue(resolveTokenChain(`Radius/${variable.name}`, { ...modes, Radius: mode }).at(-1)!.value, variable.unit)}</td>)}</tr>)}</tbody></table></div></section></div>;
}

export default TokenSystemV4;
