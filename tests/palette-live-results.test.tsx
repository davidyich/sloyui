import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {createPaletteResultStore} from '../figma/color-system-v2/editor/palette-results.mjs';
import { usePaletteComputer } from '../figma/color-system-v2/editor/usePaletteComputer';

class WorkerStub {
  static instance: WorkerStub;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: { id: number }[] = [];
  constructor() { WorkerStub.instance = this; }
  postMessage(message: { id: number }) { this.messages.push(message); }
  terminate() {}
  reply(data: object) { act(() => this.onmessage?.({ data } as MessageEvent)); }
  get lastId() { return this.messages.at(-1)!.id; }
}
const context = (surface: string, paint: string) => ({ accent: 'blue', theme: 'Light', scheme: 'Standard', surface, paint });
const request = (page: string, hue: number) => ({
  page, isDetail: true, accent: { id: 'blue', name: 'blue', hue },
  project: { neutral: { accent: { id: 'neutral', name: 'neutral' } }, accents: [] },
  theme: 'Light', scheme: 'Standard', surface: 'Content', exportScope: 'current', format: 'tokens', paletteView: 'ramps'
});
function Preview({ page, hue }: { page: string; hue: number }) {
  const result = usePaletteComputer(request(page, hue) as never);
  return <><div data-testid="samples">{result.contexts.map((c: any) => <span key={c.surface} data-testid={c.surface}>{c.paint}</span>)}</div><button disabled={result.pending}>Export</button><output>{result.text}</output></>;
}
beforeEach(() => {
  vi.stubGlobal('__PALETTE_WORKER__', '');
  vi.stubGlobal('Worker', WorkerStub);
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:worker', revokeObjectURL: () => {} });
});
afterEach(() => vi.unstubAllGlobals());

it('keeps samples mounted and accepts progressive same-view paint without regressing to older results', () => {
  const view = render(<Preview page="matrix" hue={1}/>), worker = WorkerStub.instance, first = worker.lastId;
  worker.reply({ id: first, contexts: [context('Content', 'one'), context('Shell', 'shell')], done: true });
  const sample = screen.getByTestId('Content');
  view.rerender(<Preview page="matrix" hue={2}/>); const second = worker.lastId;
  expect(screen.getByTestId('Content')).toBe(sample);
  expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  view.rerender(<Preview page="matrix" hue={3}/>); const third = worker.lastId;
  worker.reply({ id: second, append: [context('Content', 'two')], done: true });
  expect(screen.getByTestId('Content')).toBe(sample);
  expect(sample).toHaveTextContent('two');
  expect(screen.getByTestId('Shell')).toHaveTextContent('shell');
  expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  worker.reply({ id: third, append: [context('Content', 'three')], done: true, text: 'latest' });
  worker.reply({ id: second, contexts: [context('Content', 'stale')], done: true });
  expect(sample).toHaveTextContent('three');
  expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  expect(screen.getByText('latest')).toBeInTheDocument();
});

it('rejects a previous page result and reuses a completed page immediately on return', () => {
  const view = render(<Preview page="matrix" hue={1}/>), worker = WorkerStub.instance, first = worker.lastId;
  worker.reply({ id: first, contexts: [context('Content', 'matrix')], done: true });
  view.rerender(<Preview page="palettes" hue={1}/>); const second = worker.lastId;
  worker.reply({ id: first, contexts: [context('Content', 'wrong page')], done: true });
  expect(screen.queryByText('wrong page')).not.toBeInTheDocument();
  worker.reply({ id: second, contexts: [context('Content', 'palette')], done: true });
  const posted = worker.messages.length;
  view.rerender(<Preview page="matrix" hue={1}/>);
  expect(screen.getByTestId('Content')).toHaveTextContent('matrix');
  expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  expect(worker.messages).toHaveLength(posted);
});

it('invalidates a full-export presentation when project color membership changes', () => {
  const store=createPaletteResultStore(), first={...request('tokens',1),exportScope:'all',project:{neutral:{accent:{id:'neutral',name:'neutral'}},accents:[{id:'blue',name:'blue'},{id:'green',name:'green'}]}};
  const start=store.start(first as never);
  store.receive({id:start.id,contexts:[{...context('Content','old'),accent:'green'}] as never,done:true,text:'old export'});
  const next={...first,project:{...first.project,accents:[first.project.accents[0]]}};
  expect(store.read(next as never).contexts).toEqual([]);
  const current=store.start(next as never);
  expect(current.cached).toBe(false);
  expect(current.result.pending).toBe(true);
  expect(store.receive({id:start.id,contexts:[context('Content','removed')] as never,done:true})).toBeNull();
});
