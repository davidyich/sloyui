export type DocumentLanguage = 'RU' | 'EN' | 'RU/EN';
export type DocumentFile = { path: string; label: string; protected: boolean; language?: DocumentLanguage };
/** Identify prose, excluding examples, filenames and inline identifiers. */
export function documentLanguage(content:string):DocumentLanguage {
 const prose=content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`]*`|https?:\/\/\S+|[\w/-]+\.(?:md|txt|json|tsx?|css|mjs)\b/g,' ');
 const russian=(prose.match(/[а-яё]{2,}/gi)??[]).length>=3;
 const english=(prose.match(/\b(?:the|and|with|use|for|from|to|only|keep|when|this|before|after|not|is|are)\b/gi)??[]).length>=3;
 return russian?english?'RU/EN':'RU':'EN';
}
/** The small canonical instruction set. Detailed audit/reference notes stay outside this editor. */
export const documentFiles: DocumentFile[] = [
 {path:'AGENTS.md',label:'AGENTS.md',protected:true},
 {path:'llms.txt',label:'llms.txt',protected:true},
 {path:'DESIGN.md',label:'DESIGN.md',protected:true},
 {path:'docs/component-guidelines.md',label:'component-guidelines.md',protected:true},
 {path:'docs/surface-context.md',label:'surface-context.md',protected:true},
 {path:'docs/recipes.md',label:'recipes.md',protected:true},
 {path:'docs/catalog-maintenance.md',label:'catalog-maintenance.md',protected:true},
 {path:'docs/github-tasks.md',label:'github-tasks.md',protected:true},
];
