// Logical keys and code syntax are permanent identities. Picker groups start
// with the role. Surface keeps hues together in each semantic group.
// Keep both functions self-contained: native importer scripts embed toString().
export function figmaName(collection,name){
  if(!['surface','theme','scheme'].includes(collection))return name;
  // Public Surface paths keep all hues in the same semantic group.
  // Logical keys, IDs and the internal mode-routing names stay unchanged.
  if(collection==='surface'){
    if(name==='surface/bg'||['content/on-primary','content/on-bright-primary'].includes(name))return name;
    const onPrimary=/^content\/accent\/([^/]+)\/on-primary$/.exec(name);
    if(onPrimary)return `content/on-primary-${onPrimary[1]}`;
    let match=/^surface\/accent\/([^/]+)\/(primary|secondary|tertiary)\/(normal|active)$/.exec(name);
    if(match)return `surface/${match[2]}/${match[1]}-${match[3]}`;
    match=/^surface\/(primary|secondary|tertiary|invert)\/(normal|active)$/.exec(name);
    if(match)return `surface/${match[1]==='invert'?'primary/invert':match[1]+'/neutral'}-${match[2]}`;
  }
  let role=name,suffix='';
  if(collection==='theme'){
    const match=/^(standard|dimmed)\/(shell|workspace|content|overlay|glass|invert)\/(.+)$/.exec(name);
    if(!match)return name;
    role=match[3];suffix=`-${match[1]}-${match[2]}`;
  }else if(collection==='scheme'){
    const match=/^(shell|workspace|content|overlay|glass|invert)\/(.+)$/.exec(name);
    if(!match)return name;
    role=match[2];suffix=`-${match[1]}`;
  }
  if(role==='surface/bg')role='surface/primary/bg';
  else if(role==='content/strong')role='compat/content-strong';
  else if(role.startsWith('surface/invert/'))role=role.replace('surface/invert/','surface/primary/invert-');
  else role=role
    .replace(/^surface\/accent\/([^/]+)\/([^/]+)\/([^/]+)$/,'surface/$2/$1-$3')
    .replace(/^surface\/(primary|secondary|tertiary)\/(normal|active)$/,'surface/$1/neutral-$2')
    .replace(/^content\/accent\/([^/]+)\/([^/]+)$/,'content/$2/$1')
    .replace(/^content\/([^/]+)$/,'content/$1/neutral')
    .replace(/^border\/accent\/([^/]+)$/,'border/$1');
  return role+suffix;
}

export function logicalName(collection,name){
  if(!['surface','theme','scheme'].includes(collection))return name;
  if(collection==='surface'){
    if(['content/on-primary','content/on-bright-primary'].includes(name))return name;
    const onPrimary=/^content\/on-primary-([a-z][a-z0-9-]*)$/.exec(name);
    if(onPrimary)return `content/accent/${onPrimary[1]}/on-primary`;
    const match=/^surface\/(primary|secondary|tertiary)\/([a-z][a-z0-9-]*)\/(normal|active)$/.exec(name);
    if(match){
      if(match[2]==='neutral')return `surface/${match[1]}/${match[3]}`;
      if(match[1]==='primary'&&match[2]==='invert')return `surface/invert/${match[3]}`;
      return `surface/accent/${match[2]}/${match[1]}/${match[3]}`;
    }
  }
  let role=name,prefix='';
  if(collection==='theme'){
    // Native files may still contain the pre-migration context-first names.
    if(/^(standard|dimmed)\/(shell|workspace|content|overlay|glass|invert)\//.test(name))return name;
    const match=/^(.+)-(standard|dimmed)-(shell|workspace|content|overlay|glass|invert)$/.exec(name);
    if(!match)return name;
    role=match[1];prefix=`${match[2]}/${match[3]}/`;
  }else if(collection==='scheme'){
    if(/^(shell|workspace|content|overlay|glass|invert)\/(surface|content|border|reaction)\//.test(name))return name;
    const match=/^(.+)-(shell|workspace|content|overlay|glass|invert)$/.exec(name);
    if(!match)return name;
    role=match[1];prefix=`${match[2]}/`;
  }
  if(role==='surface/primary/bg')role='surface/bg';
  else if(role==='compat/content-strong')role='content/strong';
  else if(role.startsWith('surface/primary/invert-'))role=role.replace('surface/primary/invert-','surface/invert/');
  else{
    role=role
      .replace(/^surface\/(primary|secondary|tertiary)\/neutral-(normal|active)$/,'surface/$1/$2')
      .replace(/^surface\/(primary|secondary|tertiary)\/([a-z][a-z0-9-]*)-(normal|active)$/,'surface/accent/$2/$1/$3')
      .replace(/^content\/([^/]+)\/neutral$/,'content/$1')
      .replace(/^content\/([^/]+)\/([a-z][a-z0-9-]*)$/,'content/accent/$2/$1');
    if(/^border\/[^/]+$/.test(role)&&!['border/subtle','border/default','border/strong','border/focus'].includes(role))role=role.replace('border/','border/accent/');
  }
  return prefix+role;
}
