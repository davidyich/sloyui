/** Independent subset of CSS Variables substitution, including empty values and fallbacks. */
export function expandCSSVariables(value:string,lookup:(name:string)=>string|undefined,trail:string[]=[]):string {
 let result='',offset=0;
 while(true){
  const start=value.indexOf('var(',offset);
  if(start<0)return result+value.slice(offset);
  result+=value.slice(offset,start);
  let depth=1,end=start+4,comma=-1;
  for(;end<value.length;end++){
   if(value[end]==='(')depth++;
   else if(value[end]===')'&&!--depth)break;
   else if(value[end]===','&&depth===1&&comma<0)comma=end;
  }
  if(depth)throw Error('Unclosed var()');
  const name=value.slice(start+4,comma<0?end:comma).trim();
  if(trail.includes(name))throw Error(`CSS cycle ${name}`);
  const selected=lookup(name);
  if(selected===undefined||selected.trim()==='initial'){
   if(comma<0)throw Error(`Missing CSS ${name}`);
   result+=expandCSSVariables(value.slice(comma+1,end),lookup,trail);
  }else result+=expandCSSVariables(selected,lookup,[...trail,name]);
  offset=end+1;
 }
}
