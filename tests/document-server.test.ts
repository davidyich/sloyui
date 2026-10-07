import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { documentStore } from '../scripts/document-server';
const roots:string[]=[];
async function setup(){const root=await realpath(await mkdtemp(join(tmpdir(),'cap-docs-test-')));roots.push(root);await mkdir(join(root,'docs'));await writeFile(join(root,'docs/overview.md'),'# Original\n');return {root,store:documentStore(root)};}
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
describe('local document persistence',()=>{
 it('writes the actual file atomically and rejects a stale editor revision',async()=>{const {root,store}=await setup(),original=await store.read('docs/overview.md');const saved=await store.save(original.path,'# Changed\n',original.revision);expect(await readFile(join(root,original.path),'utf8')).toBe('# Changed\n');expect(saved.revision).not.toBe(original.revision);await expect(store.save(original.path,'stale',original.revision)).rejects.toMatchObject({status:409});expect(await readdir(join(root,'docs'))).toEqual(['overview.md']);});
 it('serializes concurrent saves so exactly one wins',async()=>{const {store}=await setup(),original=await store.read('docs/overview.md');const results=await Promise.allSettled(['First','Second'].map(text=>store.save(original.path,text,original.revision)));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);});
 it('limits writes to listed local files and bounded text',async()=>{const {root,store}=await setup();await expect(store.read('../AGENTS.md')).rejects.toMatchObject({status:404});await expect(store.save('docs/overview.md','x'.repeat(262145),'rev')).rejects.toMatchObject({status:413});await expect(store.save('docs/overview.md',42,'rev')).rejects.toMatchObject({status:400});await writeFile(join(root,'outside.md'),'Keep');await symlink(join(root,'outside.md'),join(root,'AGENTS.md'));await expect(store.read('AGENTS.md')).rejects.toMatchObject({status:403});expect(await readFile(join(root,'outside.md'),'utf8')).toBe('Keep');});
});
