import {useState} from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AppearanceAdvanced,CatalogAppearanceControls} from '../demo/CatalogAppearanceControls';
import type {CatalogAppearanceProps} from '../demo/CatalogMobileControls';

function appearance():CatalogAppearanceProps {
 return {theme:'light',onTheme:vi.fn(),surface:'content',onSurface:vi.fn(),accent:'neutral',onAccent:vi.fn(),density:'default',onDensity:vi.fn(),radius:'default',onRadius:vi.fn(),cornerShape:'round',onCornerShape:vi.fn(),borders:false,onBorders:vi.fn(),focusRing:true,onFocusRing:vi.fn(),surfaceScheme:'standard',onSurfaceScheme:vi.fn()};
}
it('reveals secondary controls and restores the More action on Escape',async()=>{
 const user=userEvent.setup(),a=appearance();render(<CatalogAppearanceControls {...a}/>);
 expect(screen.queryByRole('button',{name:'Компактные отступы'})).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Развернуть параметры'}));
 await user.click(screen.getByRole('button',{name:'Компактные отступы'}));
 expect(a.onDensity).toHaveBeenCalledWith('compact');
 await user.keyboard('{Escape}');
 expect(screen.getByRole('button',{name:'Развернуть параметры'})).toHaveFocus();
 expect(screen.queryByRole('button',{name:'Компактные отступы'})).not.toBeInTheDocument();
});
it('keeps Square independent from focus and makes smooth corners available only at Default',async()=>{
 const user=userEvent.setup(),a=appearance();
 function Harness(){const [radius,onRadius]=useState('default');return <AppearanceAdvanced appearance={{...a,radius,onRadius}}/>;}
 render(<Harness/>);
 expect(screen.getByRole('switch',{name:'Сглаживание Default'})).toBeEnabled();
 await user.click(screen.getByRole('switch',{name:'Без скруглений'}));
 expect(screen.getByRole('switch',{name:'Сглаживание Default'})).toBeDisabled();
 expect(screen.getByRole('switch',{name:'Контур фокуса'})).toBeChecked();
 await user.click(screen.getByRole('switch',{name:'Без скруглений'}));
 expect(screen.getByRole('switch',{name:'Сглаживание Default'})).toBeEnabled();
});
