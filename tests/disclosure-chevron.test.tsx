import {act, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import userEvent from '@testing-library/user-event';
import {Accordion} from '../src/components/layout';
import {DisclosureChevron} from '../src/components/disclosure-chevron';

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('reverses from cached visible points and stops its finite frame loop at the final shape',()=>{
  const frames: FrameRequestCallback[]=[],cancel=vi.fn();
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',cancel);
  const now=vi.spyOn(performance,'now').mockReturnValue(0);
  const {container,rerender}=render(<DisclosureChevron expanded={false} closed="right"/>);
  const line=container.querySelector('polyline')!;
  rerender(<DisclosureChevron expanded closed="right"/>);
  expect(frames).toHaveLength(1);
  act(()=>frames[0](70));
  const mid=line.getAttribute('points');
  expect(mid).not.toBe('9 6 15 12 9 18');expect(mid).not.toBe('18 9 12 15 6 9');
  now.mockReturnValue(70);
  rerender(<DisclosureChevron expanded={false} closed="right"/>);
  expect(line).toHaveAttribute('points',mid!);
  expect(cancel).toHaveBeenCalled();
  act(()=>frames.at(-1)!(210));
  expect(line).toHaveAttribute('points','9 6 15 12 9 18');
  expect(frames).toHaveLength(3);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden','true');
  expect(container.querySelector('svg')).not.toHaveAttribute('transform');
});

it('finishes immediately in reduced motion and stops an active morph on preference change',()=>{
  let reduce=false, changed=()=>{};const frames:FrameRequestCallback[]=[],cancel=vi.fn();
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',cancel);
  vi.spyOn(performance,'now').mockReturnValue(0);
  vi.stubGlobal('matchMedia',()=>({get matches(){return reduce;},addEventListener:(_type:string,listener:()=>void)=>{changed=listener;},removeEventListener:vi.fn()}));
  const {container,rerender}=render(<DisclosureChevron expanded={false}/>);const line=container.querySelector('polyline')!;
  rerender(<DisclosureChevron expanded/>);expect(frames).toHaveLength(1);
  act(()=>frames[0](70));reduce=true;act(()=>changed());
  expect(cancel).toHaveBeenCalled();expect(line).toHaveAttribute('points','6 15 12 9 18 15');
  const count=frames.length;rerender(<DisclosureChevron expanded={false}/>);
  expect(frames).toHaveLength(count);expect(line).toHaveAttribute('points','6 9 12 15 18 9');
});


it('keeps Accordion click and keyboard disclosure semantics with an end chevron that morphs down/up', async()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  const user=userEvent.setup();
  for(const variant of ['default','navigation','bouncy'] as const){
    const change=vi.fn();
    const view=render(<Accordion title="Details" variant={variant} chevronPosition="end" onOpenChange={change}><button>Content action</button></Accordion>);
    const summary=view.container.querySelector('summary')!, details=view.container.querySelector('details')!;
    const line=summary.querySelector('polyline')!, body=view.container.querySelector('.cap-accordion-body')!;
    expect(details).toHaveAttribute('data-chevron-position','end');
    expect(summary).toHaveAttribute('aria-expanded','false');
    expect(line).toHaveAttribute('points','6 9 12 15 18 9');
    await user.click(summary);
    expect(change).toHaveBeenLastCalledWith(true);
    expect(summary).toHaveAttribute('aria-expanded','true');
    expect(body).not.toHaveAttribute('inert');
    expect(line).toHaveAttribute('points','6 15 12 9 18 15');
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenLastCalledWith(false);
    expect(summary).toHaveAttribute('aria-expanded','false');
    expect(body).toHaveAttribute('inert');
    expect(line).toHaveAttribute('points','6 9 12 15 18 9');
    await user.keyboard(' ');
    expect(change.mock.calls.map(([open])=>open)).toEqual([true,false,true]);
    expect(summary).toHaveAttribute('aria-expanded','true');
    expect(line).toHaveAttribute('points','6 15 12 9 18 15');
    expect(summary.querySelector('svg')).not.toHaveAttribute('transform');
    view.unmount();
  }
  const {container}=render(<Accordion title="Legacy">Content</Accordion>);
  expect(container.querySelector('details')).toHaveAttribute('data-chevron-position','start');
  expect(container.querySelector('polyline')).toHaveAttribute('points','9 6 15 12 9 18');
});
