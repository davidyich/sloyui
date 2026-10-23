import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {parseAnnouncementMessage,CatalogAnnouncementMessage,validAnnouncementHref} from '../demo/announcement';
afterEach(cleanup);
it('highlights multiple bracket blocks and keeps unfinished brackets as plain text',()=>{
 expect(parseAnnouncementMessage('New [Button] and [Code Block] — [unfinished')).toEqual([{text:'New ',highlight:false},{text:'Button',highlight:true},{text:' and ',highlight:false},{text:'Code Block',highlight:true},{text:' — [unfinished',highlight:false}]);
 expect(parseAnnouncementMessage('Empty [] is literal')).toEqual([{text:'Empty [] is literal',highlight:false}]);
});
it('renders highlights without HTML execution or visible brackets',()=>{
 const {container}=render(<CatalogAnnouncementMessage message={'New [Code Block] <img src=x onerror=alert(1)>'} actionLabel="Read more" href="#changelog"/>);
 expect(container.querySelector('.cap-tag')).toHaveTextContent('Code Block');expect(container.textContent).not.toContain('[Code Block]');expect(container.querySelector('img')).toBeNull();expect(screen.getByRole('button',{name:'Read more'})).toBeEnabled();
});
it('disables unsafe draft links while allowing site sections, paths and HTTPS',()=>{
 for(const href of ['#changelog','/#installation','https://example.com/docs?q=kit'])expect(validAnnouncementHref(href)).toBe(true);
 for(const href of ['javascript:alert(1)','data:text/html,x','//other.example','/\\other.example','https://owner:password@example.com','#'])expect(validAnnouncementHref(href)).toBe(false);
 render(<CatalogAnnouncementMessage message="Draft" actionLabel="Read more" href="javascript:alert(1)"/>);expect(screen.getByRole('button',{name:'Read more'})).toBeDisabled();
});
