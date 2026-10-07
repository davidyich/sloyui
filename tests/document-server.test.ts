import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { documentStore, readDocumentBody } from '../scripts/document-server';
const roots:string[]=[];
async function setup(){const root=await realpath(await mkdtemp(join(tmpdir(),'cap-docs-test-')));roots.push(root);await mkdir(join(root,'docs'));await writeFile(join(root,'docs/component-guidelines.md'),'# Original\n');return {root,store:documentStore(root)};}
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
describe('local document persistence',()=>{
 it('writes the actual file atomically and rejects a stale editor revision',async()=>{const {root,store}=await setup(),original=await store.read('docs/component-guidelines.md');const saved=await store.save(original.path,'# Changed\n',original.revision);expect(await readFile(join(root,original.path),'utf8')).toBe('# Changed\n');expect(saved.revision).not.toBe(original.revision);await expect(store.save(original.path,'stale',original.revision)).rejects.toMatchObject({status:409});expect(await readdir(join(root,'docs'))).toEqual(['component-guidelines.md']);});
 it('serializes concurrent saves so exactly one wins',async()=>{const {store}=await setup(),original=await store.read('docs/component-guidelines.md');const results=await Promise.allSettled(['First','Second'].map(text=>store.save(original.path,text,original.revision)));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);});
 it('limits writes to listed local files and bounded text',async()=>{const {root,store}=await setup();await expect(store.read('../AGENTS.md')).rejects.toMatchObject({status:404});await expect(store.save('docs/component-guidelines.md','x'.repeat(262145),'rev')).rejects.toMatchObject({status:413});await expect(store.save('docs/component-guidelines.md',42,'rev')).rejects.toMatchObject({status:400});await writeFile(join(root,'outside.md'),'Keep');await symlink(join(root,'outside.md'),join(root,'AGENTS.md'));await expect(store.read('AGENTS.md')).rejects.toMatchObject({status:403});expect(await readFile(join(root,'outside.md'),'utf8')).toBe('Keep');});
 it('creates, lists, edits and deletes custom instructions with revisions',async()=>{const {store}=await setup();const path='docs/instructions/project-rules.md';const original=await store.create(path,'# Rules');expect((await store.list()).find(file=>file.path===path)).toMatchObject({protected:false});await expect(store.create(path,'duplicate')).rejects.toMatchObject({status:409});const saved=await store.save(path,'# Updated',original.revision);await expect(store.remove(path,original.revision)).rejects.toMatchObject({status:409});await store.remove(path,saved.revision);expect((await store.list()).some(file=>file.path===path)).toBe(false);await expect(store.read(path)).rejects.toMatchObject({code:'ENOENT'});});
 it('protects core files and rejects traversal, invalid names and symlink directories',async()=>{const {root,store}=await setup();await expect(store.remove('AGENTS.md','revision')).rejects.toMatchObject({status:403});for(const path of ['docs/instructions/../other.md','../outside.md','docs/instructions/nested/file.md','docs/instructions/.hidden.md'])await expect(store.create(path,'content')).rejects.toMatchObject({status:400});await mkdir(join(root,'outside'));await symlink(join(root,'outside'),join(root,'docs/instructions'));await expect(store.create('docs/instructions/rules.md','content')).rejects.toMatchObject({status:403});expect(await readdir(join(root,'outside'))).toEqual([]);});
 it('serializes delete with saves to prevent stale destructive operations',async()=>{const {store}=await setup();const doc=await store.create('docs/instructions/race.md','initial');const results=await Promise.allSettled([store.save(doc.path,'updated',doc.revision),store.remove(doc.path,doc.revision)]);expect(results[0].status).toBe('fulfilled');expect(results[1]).toMatchObject({status:'rejected',reason:{status:409}});expect((await store.read(doc.path)).content).toBe('updated');});
});


async function* requestChunks(chunks: Uint8Array[]) { for (const chunk of chunks) yield chunk; }

it('preserves Russian and emoji document text when request chunks split every UTF-8 sequence', async () => {
 const { store } = await setup();
 const expected = '# Правила 📝\nТекст для редактора';
 const payload = Buffer.from(JSON.stringify({ content: expected }));
 const body = await readDocumentBody(requestChunks(Array.from(payload, byte => Uint8Array.of(byte))));
 const data = JSON.parse(body);
 const saved = await store.create('docs/instructions/utf8.md', data.content);
 expect(saved.content).toBe(expected);
 expect((await store.read(saved.path)).content).toBe(expected);
});

it('limits request bytes independently of decoded character count', async () => {
 const exact = Buffer.from('😀'.repeat((256 * 1024 + 4096) / 4));
 expect(await readDocumentBody(requestChunks([exact]))).toBe(exact.toString('utf8'));
 await expect(readDocumentBody(requestChunks([exact, Uint8Array.of(0x20)]))).rejects.toMatchObject({ status: 413 });
});
