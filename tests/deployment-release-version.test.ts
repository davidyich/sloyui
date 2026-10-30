import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync,existsSync,readlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const helper=resolve('scripts/verify-release-version.mjs');
let directory:string;
beforeEach(()=>{directory=mkdtempSync(join(tmpdir(),'sloy-release-version-'));});
afterEach(()=>{rmSync(directory,{recursive:true,force:true});});
function check(incoming:string,metadata:unknown={version:'0.19.1',release:'deployed-release'}){
 const file=join(directory,'release.json');
 if(metadata!==undefined)writeFileSync(file,JSON.stringify(metadata));
 return spawnSync(process.execPath,[helper,incoming,file],{encoding:'utf8'});
}

describe('Develop deployment version gate',()=>{
 it.each(['0.18.18','0.19.1','0.19.1+different-build'])('rejects incoming %s over deployed 0.19.1',incoming=>{
  const result=check(incoming);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('strictly newer');
  expect(result.stderr).toContain('deployed 0.19.1');
  expect(result.stderr).toContain('Reconcile this checkout');
  expect(result.stderr).toContain('bump the package version');
  expect(readdirSync(directory)).toEqual(['release.json']);
 });
 it('allows 0.19.2 after 0.19.1 without modifying deployed metadata',()=>{
  const metadata={version:'0.19.1',release:'deployed-release'},result=check('0.19.2',metadata);
  expect(result.status).toBe(0);expect(result.stdout).toContain('0.19.1 -> 0.19.2');
  expect(JSON.parse(readFileSync(join(directory,'release.json'),'utf8'))).toEqual(metadata);
 });
 it('allows the first deployment only when deployed metadata is absent',()=>{
  const file=join(directory,'absent.json'),result=spawnSync(process.execPath,[helper,'0.19.2',file],{encoding:'utf8'});
  expect(result.status).toBe(0);expect(result.stdout).toContain('initial release 0.19.2');
  expect(readdirSync(directory)).toEqual([]);
 });
 it.each(['0.019.2','v0.19.2','0.19','0.19.2-01','0.19.2+bad..build',''])('rejects invalid incoming SemVer %j even without deployed metadata',incoming=>{
  const result=spawnSync(process.execPath,[helper,incoming,join(directory,'absent.json')],{encoding:'utf8'});
  expect(result.status).toBe(1);expect(result.stderr).toContain('Invalid incoming version');
 });
 it.each([null,[],{}, {version:19},{version:'0.019.1'},{version:'0.19.1',release:null}])('fails closed for malformed metadata %j',metadata=>{
  const result=check('0.19.2',metadata);expect(result.status).toBe(1);expect(result.stderr).toContain('deployed');
 });
 it('rejects malformed JSON and non-ENOENT read failures',()=>{
  const file=join(directory,'release.json');writeFileSync(file,'{"version":');
  const malformed=spawnSync(process.execPath,[helper,'0.19.2',file],{encoding:'utf8'});
  expect(malformed.status).toBe(1);expect(malformed.stderr).toContain('malformed JSON');
  const unreadable=spawnSync(process.execPath,[helper,'0.19.2',directory],{encoding:'utf8'});
  expect(unreadable.status).toBe(1);expect(unreadable.stderr).toContain('Cannot read deployed release metadata');
 });
 it.each([
  ['0.19.2-rc.10','0.19.2-rc.9',0],
  ['0.19.2','0.19.2-rc.10',0],
  ['0.19.2-rc.1','0.19.2',1],
  ['0.19.2-beta','0.19.2-1',0],
  ['0.19.2+new','0.19.2+old',1],
  ['9007199254740993.0.0','9007199254740992.0.0',0]
 ])('compares SemVer precedence %s vs %s', (incoming,deployed,status)=>{
  expect(check(String(incoming),{version:deployed}).status).toBe(status);
 });
});

/** Execute the real remote pre-mutation block with filesystem/network/service commands isolated. */
function runRemotePrefix(incoming:string,channel='develop'){
 const script=readFileSync(resolve('scripts/deploy-devos.sh'),'utf8'),remote=script.split("<<'REMOTE'\n")[1].split('\nREMOTE')[0];
 const end=remote.indexOf("\nnode -e 'require(\"fs\").writeFileSync(process.argv[1]");
 expect(end).toBeGreaterThan(0);
 const prefix=remote.slice(0,end).replace(/^base=\/srv\/sloyui$/m,'base="$RELEASE_TEST_BASE"').replace(/^node=.*$/m,'node="$RELEASE_TEST_NODE"');
 const base=join(directory,'server'),deployed=join(base,'releases','existing'),trace=join(directory,'trace');
 mkdirSync(deployed,{recursive:true});mkdirSync(join(base,'backups'));
 writeFileSync(join(deployed,'release.json'),JSON.stringify({version:'0.19.1',release:'existing'}));
 symlinkSync(deployed,join(base,'current'));symlinkSync(deployed,join(base,'develop'));
 const isolated=`sudo(){ if [ "$1" = -n ] && [ "$2" = install ] && [ "$3" = -d ]; then return 0; fi; printf 'active-sudo\\n' >> "$RELEASE_TEST_TRACE"; }
flock(){ printf 'locked\\n' >> "$RELEASE_TEST_TRACE"; }
install(){ printf 'active-install\\n' >> "$RELEASE_TEST_TRACE"; }
tar(){ /bin/mkdir -p "$base/releases/$release/scripts"; /bin/cp "$RELEASE_TEST_HELPER" "$base/releases/$release/scripts/verify-release-version.mjs"; printf 'extracted\\n' >> "$RELEASE_TEST_TRACE"; }
`;
 const result=spawnSync('bash',['-s','--','candidate',channel,incoming],{input:isolated+prefix,encoding:'utf8',env:{...process.env,RELEASE_TEST_BASE:base,RELEASE_TEST_NODE:process.execPath,RELEASE_TEST_TRACE:trace,RELEASE_TEST_HELPER:helper}});
 return{result,trace:readFileSync(trace,'utf8'),base,deployed};
}

describe('Deploy script mutation boundary',()=>{
 it.each(['0.18.18','0.19.1'])('rejects %s under the lock before private/data/service changes',incoming=>{
  const {result,trace,base,deployed}=runRemotePrefix(incoming);
  expect(result.status).toBe(1);expect(result.stderr).toContain('strictly newer');
  expect(trace).toBe('locked\nextracted\n');
  expect(existsSync(join(base,'private'))).toBe(false);expect(existsSync(join(base,'data'))).toBe(false);
  expect(readlinkSync(join(base,'develop'))).toBe(deployed);
  expect(JSON.parse(readFileSync(join(deployed,'release.json'),'utf8')).version).toBe('0.19.1');
 });
 it('allows the newer release to reach setup after the gate',()=>{
  const {result,trace}=runRemotePrefix('0.19.2');expect(result.status).toBe(0);
  expect(trace).toContain('active-install');expect(result.stdout).toContain('0.19.1 -> 0.19.2');
 });
 it('keeps the explicit bootstrap path independent of the Develop version gate',()=>{
  const {result,trace}=runRemotePrefix('0.18.18','bootstrap');expect(result.status).toBe(0);
  expect(trace).toContain('active-install');expect(result.stdout).not.toContain('version gate');
 });
});
