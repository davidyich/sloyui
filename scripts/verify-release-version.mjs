import {readFileSync,realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const identifier='(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const semver=new RegExp(`^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-(${identifier}(?:\\.${identifier})*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$`);
const reconcile='Reconcile this checkout with the deployed Develop release, bump the package version above it, rebuild, and deploy again.';

export function parseReleaseVersion(value,label='version'){
 const match=typeof value==='string'?semver.exec(value):null;
 if(!match)throw new Error(`Invalid ${label}: ${JSON.stringify(value)}. Expected a complete SemVer version. ${reconcile}`);
 return{core:match.slice(1,4).map(BigInt),prerelease:match[4]?.split('.')??[]};
}
/** SemVer precedence ignores build metadata and compares numeric identifiers exactly. */
export function compareReleaseVersions(incoming,deployed){
 const next=parseReleaseVersion(incoming,'incoming version'),current=parseReleaseVersion(deployed,'deployed version');
 for(let index=0;index<3;index++)if(next.core[index]!==current.core[index])return next.core[index]>current.core[index]?1:-1;
 if(!next.prerelease.length||!current.prerelease.length)return Number(!next.prerelease.length)-Number(!current.prerelease.length);
 for(let index=0;index<Math.max(next.prerelease.length,current.prerelease.length);index++){
  const a=next.prerelease[index],b=current.prerelease[index];
  if(a===undefined||b===undefined)return a===undefined?-1:1;
  if(a===b)continue;
  const numericA=/^[0-9]+$/.test(a),numericB=/^[0-9]+$/.test(b);
  if(numericA&&numericB)return BigInt(a)>BigInt(b)?1:-1;
  if(numericA!==numericB)return numericA?-1:1;
  return a>b?1:-1;
 }
 return 0;
}
/** Read-only gate: only a missing deployed metadata file permits an initial deploy. */
export function verifyReleaseVersion(incoming,metadataPath){
 parseReleaseVersion(incoming,'incoming version');
 let text;
 try{text=readFileSync(metadataPath,'utf8');}
 catch(error){if(error.code==='ENOENT')return{incoming,deployed:null,initial:true};throw new Error(`Cannot read deployed release metadata at ${metadataPath}: ${error.message}. ${reconcile}`);}
 let metadata;
 try{metadata=JSON.parse(text);}
 catch{throw new Error(`Invalid deployed release metadata at ${metadataPath}: malformed JSON. ${reconcile}`);}
 if(!metadata||Array.isArray(metadata)||typeof metadata!=='object'||typeof metadata.version!=='string'||('release'in metadata&&(typeof metadata.release!=='string'||!metadata.release.trim())))throw new Error(`Invalid deployed release metadata at ${metadataPath}: expected an object with a SemVer version. ${reconcile}`);
 parseReleaseVersion(metadata.version,'deployed metadata version');
 if(compareReleaseVersions(incoming,metadata.version)<=0)throw new Error(`Develop deployment rejected: incoming ${incoming} must be strictly newer than deployed ${metadata.version}. ${reconcile}`);
 return{incoming,deployed:metadata.version,initial:false};
}

if(process.argv[1]&&pathToFileURL(realpathSync(process.argv[1])).href===import.meta.url){
 try{
  if(process.argv.length!==4)throw new Error('Usage: node scripts/verify-release-version.mjs <incoming-version> <deployed-release.json>');
  const result=verifyReleaseVersion(process.argv[2],process.argv[3]);
  console.log(result.initial?`Develop version gate: initial release ${result.incoming}; deployed metadata is absent.`:`Develop version gate: ${result.deployed} -> ${result.incoming}.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
