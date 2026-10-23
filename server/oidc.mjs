import * as oidc from 'openid-client';
import {readFileSync} from 'node:fs';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {atomicJSON} from './catalog-store.mjs';
import {sendJSON} from './catalog-api.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const opaque=()=>randomBytes(32).toString('base64url');
function cookie(headers,name){return (headers.cookie??'').split(';').map(pair=>pair.trim()).find(pair=>pair.startsWith(`${name}=`))?.slice(name.length+1);}
export async function createIdentity({clientFile,directory,origin,allowLocalQA=false}){
 const client=JSON.parse(await readFile(clientFile,'utf8'));
 if(client.redirect_uri!==`${origin}/api/admin/auth/callback`)throw new Error('OIDC callback does not match site origin');
 const issuerOrigin=new URL(client.issuer).origin;
 const localQA=allowLocalQA&&client.owner_subject==='qa-owner'&&new URL(origin).hostname==='127.0.0.1'&&new URL(issuerOrigin).hostname==='127.0.0.1';
 if((!origin.startsWith('https:')||!issuerOrigin.startsWith('https:'))&&!localQA)throw new Error('HTTPS is required for admin identity');
 const metadata=await fetch(`${issuerOrigin}/.well-known/openid-configuration`,{signal:AbortSignal.timeout(10000)}).then(response=>{if(!response.ok)throw new Error('OIDC discovery failed');return response.json();});
 if(metadata.issuer!==client.issuer||['authorization_endpoint','token_endpoint','jwks_uri','end_session_endpoint'].some(key=>metadata[key]&&new URL(metadata[key]).origin!==issuerOrigin))throw new Error('Unexpected OIDC metadata');
 const config=new oidc.Configuration(metadata,client.client_id,{token_endpoint_auth_method:'client_secret_basic'},oidc.ClientSecretBasic(client.client_secret));
 if(localQA)oidc.allowInsecureRequests(config);
 oidc.enableNonRepudiationChecks(config);
 await mkdir(directory,{recursive:true,mode:0o700});
 const sessionsFile=join(directory,'sessions.json');
 let sessions={};try{sessions=JSON.parse(await readFile(sessionsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const challenges=new Map(),secure=origin.startsWith('https:'),prefix=secure?'__Host-':'';
 const sessionName=`${prefix}sloy-admin`,challengeName=`${prefix}sloy-login`;
 const setCookie=(response,name,value,age)=>response.setHeader('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`);
 const session=headers=>{try{sessions=JSON.parse(readFileSync(sessionsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')return null;}const token=cookie(headers,sessionName),record=token?sessions[hash(token)]:undefined;return record&&record.expires>Date.now()&&record.subject===client.owner_subject?record:null;};
 const redirect=(response,url)=>{response.writeHead(302,{'Location':String(url),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});response.end();};
 return {session,async handle(request,response,url){
  if(url.pathname==='/api/admin/auth/login'&&request.method==='GET'){
   for(const [id,item] of challenges)if(item.expires<Date.now())challenges.delete(id);
   if(challenges.size>=1000)return sendJSON(response,429,{message:'Повторите вход позже'});
   const id=opaque(),state=oidc.randomState(),nonce=oidc.randomNonce(),verifier=oidc.randomPKCECodeVerifier();
   challenges.set(hash(id),{state,nonce,verifier,returnTo:url.searchParams.get('returnTo')==='develop'?'/develop/':'/',expires:Date.now()+600000});
   setCookie(response,challengeName,id,600);
   return redirect(response,oidc.buildAuthorizationUrl(config,{redirect_uri:client.redirect_uri,response_type:'code',scope:'openid profile email',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256'}));
  }
  if(url.pathname==='/api/admin/auth/callback'&&request.method==='GET'){
   const id=cookie(request.headers,challengeName),key=id?hash(id):'',challenge=challenges.get(key);challenges.delete(key);
   if(!challenge||challenge.expires<Date.now())return sendJSON(response,400,{message:'Вход истёк. Вернитесь в каталог и повторите.'});
   try{
    const tokens=await oidc.authorizationCodeGrant(config,url,{pkceCodeVerifier:challenge.verifier,expectedState:challenge.state,expectedNonce:challenge.nonce,idTokenExpected:true});
    const claims=tokens.claims();
    if(claims?.sub!==client.owner_subject||!Array.isArray(claims[client.role_claim])||!claims[client.role_claim].includes(client.role))return sendJSON(response,403,{message:'Нет доступа к управлению сайтом'});
    const token=opaque();
    const previous=cookie(request.headers,sessionName);if(previous)delete sessions[hash(previous)];
    for(const [key,record] of Object.entries(sessions))if(record.expires<Date.now())delete sessions[key];
    sessions[hash(token)]={subject:claims.sub,expires:Date.now()+8*60*60*1000,idToken:tokens.id_token};
    await atomicJSON(sessionsFile,sessions);setCookie(response,sessionName,token,8*60*60);
    response.setHeader('Set-Cookie',[response.getHeader('Set-Cookie'),`${challengeName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`]);
    return redirect(response,`${origin}${challenge.returnTo}#overview`);
   }catch(error){console.error('OIDC callback rejected:',error.name);return sendJSON(response,400,{message:'Не удалось завершить вход. Вернитесь в каталог и повторите.'});}
  }
  if(url.pathname==='/api/admin/auth/logout'&&request.method==='POST'){
   const record=session(request.headers),token=cookie(request.headers,sessionName);if(token)delete sessions[hash(token)];
   await atomicJSON(sessionsFile,sessions);setCookie(response,sessionName,'',0);
   const target=record?.idToken&&metadata.end_session_endpoint?oidc.buildEndSessionUrl(config,{id_token_hint:record.idToken,post_logout_redirect_uri:`${origin}/`}):`${origin}/`;
   return sendJSON(response,200,{url:String(target)});
  }
  return sendJSON(response,404,{message:'Не найдено'});
 }};
}
