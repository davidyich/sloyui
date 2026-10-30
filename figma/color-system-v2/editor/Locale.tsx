import React,{createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {LocaleProvider,type Locale} from '../../../src/index';
import {dictionary} from './translations';
const phrases=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
let activeLocale:Locale='ru';
const Context=createContext({locale:'ru' as Locale,setLocale:(_value:Locale)=>{},t});
/** UI copy only: authored names, HEX values and exported identifiers are never translated. */
export function t(ru:string,en?:string):string {
 if(activeLocale==='ru')return ru;
 if(en)return en;
 if(dictionary[ru])return dictionary[ru];
 // Dynamic UI messages use the same curated phrases around unchanged authored values.
 let result=ru;
 for(const [from,to] of phrases)result=result.replaceAll(from,to);
 return result;
}
export function usePaletteLocale(){return useContext(Context);}
export function PaletteLocaleProvider({children}:{children:ReactNode}){
 const [locale,setLocale]=useState<Locale>(()=>{try{return localStorage.getItem('cap-kit-locale')==='en'?'en':'ru';}catch{return 'ru';}});
 activeLocale=locale;
 useEffect(()=>{document.documentElement.lang=locale;try{localStorage.setItem('cap-kit-locale',locale);}catch{}},[locale]);
 return <LocaleProvider locale={locale}><Context.Provider value={{locale,setLocale,t}}>{children}</Context.Provider></LocaleProvider>;
}
