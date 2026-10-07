import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import manifest from '../agent-manifest.json';
import {catalogueText,localizedChangelog} from '../demo/catalog-locale';

describe('curated catalogue translations',()=>{
 it('translates component usage and API descriptions without changing identifiers',()=>{
  for(const [name,record]of Object.entries(manifest.components)){
   for(const text of [record.usage,...record.api.map(row=>row.description)].filter(Boolean))expect(catalogueText(text,'en'),name+': '+text).not.toMatch(/[А-Яа-яЁё]/);
  }
  for(const record of Object.values(manifest.components))if('composition' in record){
   for(const child of record.composition)for(const row of child.api)expect(catalogueText(row.description,'en'),child.name+': '+row.description).not.toMatch(/[А-Яа-яЁё]/);
  }
  for(const [name,utility]of Object.entries(manifest.utilities))for(const row of utility.api)expect(catalogueText(row.description,'en'),name+': '+row.description).not.toMatch(/[А-Яа-яЁё]/);
  expect(catalogueText('ContentLayout','en')).toBe('ContentLayout');
 });
 it('preserves unknown text and source whitespace',()=>{
  expect(catalogueText('My private project','en')).toBe('My private project');
  expect(catalogueText('Пользовательский текст без перевода','en')).toBe('Пользовательский текст без перевода');
  expect(catalogueText(' Настройки ','en')).toBe(' Settings ');
  expect(catalogueText('Настройки','ru')).toBe('Настройки');
 });
});

 it('localizes registered release history while preserving source and unknown changes',()=>{
 const source=readFileSync('CHANGELOG.md','utf8'),english=localizedChangelog(source,'en'),russian=localizedChangelog(source,'ru');
 expect(english).not.toMatch(/[А-Яа-яЁё]/);
 expect(russian).toContain('## 0.6.0');
 expect(russian).toContain('Активные инструкции сокращены');
 expect(english.split('\n').filter(line=>line.startsWith('- '))).toHaveLength(source.split('\n').filter(line=>line.startsWith('- ')).length);
 expect(localizedChangelog('# New\n\n- My custom edit\n','ru')).toBe('# New\n\n- My custom edit\n');
 expect(readFileSync('CHANGELOG.md','utf8')).toBe(source);
 });
