import {useState} from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CatalogAppearanceControls} from '../demo/CatalogAppearanceControls';
import type {CatalogAppearanceProps} from '../demo/CatalogMobileControls';

function appearance():CatalogAppearanceProps {
 return {theme:'light',onTheme:vi.fn(),surface:'content',onSurface:vi.fn(),accent:'neutral',onAccent:vi.fn(),density:'default',onDensity:vi.fn(),radius:'default',onRadius:vi.fn(),borders:false,onBorders:vi.fn(),focusRing:true,onFocusRing:vi.fn(),surfaceScheme:'standard',onSurfaceScheme:vi.fn()};
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
it('toggles scheme and focus independently without another settings menu',async()=>{
 const user=userEvent.setup(),a=appearance();
 function Harness(){const [surfaceScheme,onSurfaceScheme]=useState<'standard'|'dimmed'>('standard'),[focusRing,onFocusRing]=useState(true);return <CatalogAppearanceControls {...a} radius="none" surfaceScheme={surfaceScheme} onSurfaceScheme={onSurfaceScheme} focusRing={focusRing} onFocusRing={onFocusRing}/>;}
 render(<Harness/>);
 await user.click(screen.getByRole('button',{name:'Развернуть параметры'}));
 const scheme=screen.getByRole('button',{name:'Приглушённая схема'}),focus=screen.getByRole('button',{name:'Контур фокуса'});
 await user.click(scheme);
 expect(scheme).toHaveAttribute('aria-pressed','true');
 expect(focus).toHaveAttribute('aria-pressed','true');
 await user.click(focus);
 await user.click(scheme);
 expect(scheme).toHaveAttribute('aria-pressed','false');
 expect(focus).toHaveAttribute('aria-pressed','false');
 await user.click(screen.getByRole('button',{name:'Максимальное скругление'}));
 expect(a.onRadius).toHaveBeenCalledWith('rounded');
 expect(screen.queryByRole('button',{name:'Дополнительные настройки'})).not.toBeInTheDocument();
 expect(screen.queryByText('Без скруглений')).not.toBeInTheDocument();
 expect(screen.queryByText('Сглаживание Default')).not.toBeInTheDocument();
});
