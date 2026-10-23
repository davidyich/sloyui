// Runs only against the isolated Devos Auth QA identity. Never prints credentials.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createIdentity} from '../oidc.mjs';
import {createCatalogStore} from '../catalog-store.mjs';
import {createCatalogHandler} from '../catalog-api.mjs';
const root=process.env.SLOY_OIDC_QA_ROOT;
assert.equal(root,'/home/devos/projects/devos-auth/qa-state');
const client=JSON.parse(await readFile(join(root,'sloy-client.json'),'utf8'));
assert.equal(client.owner_subject,'qa-owner');assert.equal(client.redirect_uri,'http://127.0.0.1:4317/api/admin/auth/callback');assert.equal(client.issuer,'http://127.0.0.1:3201/api/auth');
const credentials=JSON.parse(await readFile(join(root,'qa-identity.json'),'utf8'));
const directory=await mkdtemp(join(tmpdir(),'sloy-oidc-qa-'));
let server;
try{
 await copyFile(new URL('../../source/component-registry.json',import.meta.url),join(directory,'component-registry.json'));
 await copyFile(new URL('../../source/catalog-settings.json',import.meta.url),join(directory,'catalog-settings.json'));
 const origin='http://127.0.0.1:4317',identity=await createIdentity({origin,directory,clientFile:join(root,'sloy-client.json'),allowLocalQA:true}),store=await createCatalogStore(directory);
 server=createServer(createCatalogHandler({store,identity,origin}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const site=`http://127.0.0.1:${server.address().port}`,auth='http://127.0.0.1:3201',siteCookies=new Map(),authCookies=new Map();
 async function request(base,path,jar,body,method){const response=await fetch(new URL(path,base),{method:method??(body?'POST':'GET'),redirect:'manual',headers:{origin:base===site?origin:auth,cookie:[...jar].map(([key,value])=>`${key}=${value}`).join('; '),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],index=pair.indexOf('='),key=pair.slice(0,index),value=pair.slice(index+1);if(value)jar.set(key,value);else jar.delete(key);}let data;try{data=await response.json();}catch{}return {status:response.status,location:response.headers.get('location'),data};}
 assert.equal((await request(site,'/api/catalog/session',siteCookies)).data.admin,false);
 const begin=await request(site,'/api/admin/auth/login',siteCookies);assert.equal(begin.status,302);
 const authorize=await request(auth,begin.location,authCookies);const loginURL=authorize.location??authorize.data?.url;assert.ok(loginURL);
 const oauthQuery=new URL(loginURL,auth).search.slice(1);
 const login=await request(auth,'/api/auth/sign-in/email',authCookies,{email:'qa@example.invalid',password:credentials.password,oauth_query:oauthQuery});assert.equal(login.status,200);assert.equal(login.data.twoFactorRedirect,true);
 assert.equal((await request(site,'/api/catalog/session',siteCookies)).data.admin,false);
 assert.equal((await request(auth,'/api/auth/get-session',authCookies)).data,null);
 const code=execFileSync('sudo',['-n','docker','exec','devos-auth-qa-web-1','node','--input-type=module','-e','import fs from "node:fs";import {createOTP} from "@better-auth/utils/otp";const {secret}=JSON.parse(fs.readFileSync("/state/qa-identity.json","utf8"));process.stdout.write(await createOTP(secret).totp());'],{encoding:'utf8'}).trim();
 const factor=await request(auth,'/api/auth/two-factor/verify-totp',authCookies,{code,trustDevice:false,oauth_query:oauthQuery});assert.equal(factor.status,200);
 const callback=new URL(factor.data?.url??factor.location);const complete=await request(site,callback.pathname+callback.search,siteCookies);assert.equal(complete.status,302);assert.equal(complete.location,origin+'/#overview');
 assert.equal((await request(site,'/api/catalog/session',siteCookies)).data.admin,true);
 const state=(await request(site,'/api/catalog/state',siteCookies)).data;
 assert.equal((await request(site,'/api/catalog/announcement',siteCookies,{revision:state.revision,enabled:false},'PATCH')).status,200);
 const restarted=await createIdentity({origin,directory,clientFile:join(root,'sloy-client.json'),allowLocalQA:true});assert.ok(restarted.session({cookie:[...siteCookies].map(([key,value])=>`${key}=${value}`).join('; ')}));
 assert.equal((await request(site,callback.pathname+callback.search,siteCookies)).status,400);
 const second=await request(site,'/api/admin/auth/login',siteCookies);const secondAuthorize=await request(auth,second.location,authCookies);const secondCallback=new URL(secondAuthorize.location??secondAuthorize.data?.url);secondCallback.searchParams.set('state','tampered');assert.equal((await request(site,secondCallback.pathname+secondCallback.search,siteCookies)).status,400);
 const logout=await request(site,'/api/admin/auth/logout',siteCookies,{});assert.equal(logout.status,200);assert.ok(logout.data.url.startsWith(auth));assert.equal((await request(site,'/api/catalog/session',siteCookies)).data.admin,false);
 console.log('PASS: password requires TOTP; signed OIDC callback, PKCE/state/nonce, owner role, persistence, replay rejection, tampered state and logout');
}finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
