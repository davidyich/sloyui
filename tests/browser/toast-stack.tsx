import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, LocaleProvider, NumberField, Select, ToastStack, type ToastStackItem, type ToastStackProps } from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';

function Acceptance() {
  const sequence = useRef(0);
  const [theme, setTheme] = useState('light'), [radius, setRadius] = useState('rounded');
  const [position, setPosition] = useState<ToastStackProps['position']>('bottom-center');
  const [scope, setScope] = useState<ToastStackProps['scope']>('container');
  const [peek, setPeek] = useState(6), [gap, setGap] = useState(8), [corner, setCorner] = useState(17);
  const [result, setResult] = useState('Ready');
  const seed = (): ToastStackItem[] => [
    { id: 'saved', title: 'Changes saved', description: 'Your project is up to date.', duration: Infinity },
    { id: 'archive', title: 'Project archived', description: 'A longer description wraps naturally and keeps the action reachable even when the available width is small.', tone: 'info', duration: Infinity, action: { label: 'Undo archive', onAction() { setResult('Archive restored'); setItems(current => current.filter(item => item.id !== 'archive')); } } },
    { id: 'job', title: 'Publishing project', description: 'Preparing the preview.', loading: true },
  ];
  const [items, setItems] = useState<ToastStackItem[]>(seed);
  const dismiss = (id: string) => { setItems(current => current.filter(item => item.id !== id)); setResult(`Dismissed ${id}`); };
  const add = (short = false) => setItems(current => [...current, { id: `new-${++sequence.current}`, title: short ? 'Short notice' : `New notice ${sequence.current}`, duration: short ? 1200 : Infinity }]);
  return <LocaleProvider locale="en"><main data-theme={theme} data-density="compact" data-radius={radius} data-surface="content" className="cap-surface" style={{ minHeight: '100dvh', padding: 16, boxSizing: 'border-box', fontFamily: 'var(--cap-font-sans)', color: 'var(--cap-content-primary)' }}>
    <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>ToastStack acceptance</h1>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle theme</Button>
      <Button onClick={() => setRadius(radius === 'none' ? 'rounded' : 'none')}>Toggle radius context</Button>
      <Button onClick={() => setItems(seed())}>Reset notices</Button>
      <Button onClick={() => add()}>Add notice</Button>
      <Button onClick={() => add(true)}>Add short notice</Button>
      <Button onClick={() => setItems(current => current.map(item => item.id === 'job' ? { ...item, title: 'Published successfully', loading: false, duration: 1200 } : item))}>Complete job</Button>
      <Button onClick={() => setItems([])}>Clear notices</Button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 16 }}>
      <Select label="Position" value={position} onValueChange={value => setPosition(value as typeof position)} options={['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'inline'].map(value => ({ value, label: value }))}/>
      <Select label="Scope" value={scope} onValueChange={value => setScope(value as typeof scope)} options={['container', 'viewport'].map(value => ({ value, label: value }))}/>
      <NumberField label="Peek" value={peek} min={0} max={24} onValueChange={setPeek}/>
      <NumberField label="Gap" value={gap} min={0} max={32} onValueChange={setGap}/>
      <NumberField label="Corner" value={corner} min={0} max={48} onValueChange={setCorner}/>
    </div>
    <p role="status">{result} · {items.length} notices</p>
    <section aria-label="Bounded stage" style={{ position: 'relative', height: 'min(380px,55dvh)', borderRadius: 'var(--cap-radius-xl)', background: 'var(--cap-control-bg)' }}>
      <ToastStack items={items} onDismiss={dismiss} position={position} scope={scope} peek={peek} gap={gap} corner={corner} limit={5} showExpandHint={false}/>
    </section>
    <Button style={{ marginTop: 16 }}>After the stack</Button>
  </main></LocaleProvider>;
}
createRoot(document.getElementById('root')!).render(<Acceptance/>);
