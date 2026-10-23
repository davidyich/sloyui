// One-time compatibility bridge for the already published catalogue.
// Removed naturally when the owner publishes a complete Develop build.
let owner=false;
function render(){
 const settings=document.querySelector('.catalog-admin-layout');
 const existing=document.querySelector('[data-develop-link]');
 if(!owner||!settings){existing?.remove();return;}
 if(existing)return;
 const english=document.documentElement.lang==='en';
 const card=document.createElement('section');card.className='cap-card cap-surface-boundary';card.dataset.surface='raised';card.dataset.developLink='true';
 const heading=document.createElement('h2');heading.textContent=english?'Test version':'Тестовая версия';
 const link=document.createElement('a');link.className='cap-button';link.dataset.variant='ghost';link.dataset.size='sm';link.href='/develop/';link.target='_blank';link.rel='noreferrer';link.textContent=english?'View Develop':'Посмотреть Develop';
 card.append(heading,link);settings.prepend(card);
}
async function refresh(){try{const response=await fetch('/api/catalog/session',{cache:'no-store'});owner=response.ok&&(await response.json()).admin===true;}catch{owner=false;}render();}
new MutationObserver(render).observe(document.getElementById('root'),{childList:true,subtree:true});
window.addEventListener('focus',()=>void refresh());void refresh();
