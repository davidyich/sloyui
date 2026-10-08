import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { ButtonGroup, FloatingActionBar } from '../src/components/workbench';
import { IconButton } from '../src/components/primitives';
import { SegmentedControl } from '../src/components/forms';

it('connects the shared hover layer after the parent ref exists and tracks nested icons and keyboard focus',async()=>{
 const user=userEvent.setup();
 const {container}=render(<ButtonGroup label="Tools"><IconButton icon="list" label="List"/><IconButton icon="grid" label="Grid"/><IconButton icon="close" label="Disabled" disabled/></ButtonGroup>);
 const highlight=container.querySelector('.cap-moving-highlight')!;
 expect(highlight).not.toHaveAttribute('data-visible');
 await user.hover(screen.getByRole('button',{name:'List'}).querySelector('svg')!);
 expect(highlight).toHaveAttribute('data-visible','true');
 await user.unhover(screen.getByRole('button',{name:'List'}));
 expect(highlight).not.toHaveAttribute('data-visible');
 fireEvent.focusIn(screen.getByRole('button',{name:'Grid'}));
 expect(highlight).toHaveAttribute('data-visible','true');
 fireEvent.pointerOver(screen.getByRole('button',{name:'Disabled'}));
 expect(highlight).not.toHaveAttribute('data-visible');
});
it('initializes and updates the selected segment layer without remounting',()=>{
 const {container,rerender}=render(<SegmentedControl label="View" value="a" onValueChange={()=>{}} options={[{value:'a',label:'A'},{value:'b',label:'B'}]}/>);
 expect(container.querySelector('.cap-moving-highlight')).toHaveAttribute('data-visible','true');
 rerender(<SegmentedControl label="View" value="b" onValueChange={()=>{}} options={[{value:'a',label:'A'},{value:'b',label:'B'}]}/>);
 expect(screen.getByRole('radio',{name:'B'})).toBeChecked();
 expect(container.querySelector('.cap-moving-highlight')).toHaveAttribute('data-visible','true');
});
it('adapts the floating primary action to an accessible icon in vertical orientation',()=>{
 const {container,rerender}=render(<FloatingActionBar label="Tools" orientation="vertical" variant="divided" action={{label:'Done',icon:'check',onClick:()=>{}}}><IconButton icon="list" label="List"/></FloatingActionBar>);
 expect(screen.getByRole('button',{name:'Done'})).toHaveClass('cap-icon-button');
 expect(screen.getByRole('button',{name:'Done'})).not.toHaveTextContent('Done');
 expect(container.querySelectorAll('.cap-floating-segment')).toHaveLength(1);
 rerender(<FloatingActionBar label="Tools" action={{label:'Done',icon:'check',onClick:()=>{}}}/>);
 expect(screen.getByRole('button',{name:'Done'})).toHaveTextContent('Done');
});
