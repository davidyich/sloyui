import {describe,it,expect} from 'vitest';
import registry from '../source/component-registry.json';
import manifest from '../agent-manifest.json';
import {componentNames,filterComponents,groupCatalogueComponents,navigationGroups,toggleCatalogueGroups} from '../demo/catalog';
import {catalogueText} from '../demo/catalog-locale';

describe('Catalogue presentation groups',()=>{
 it('maps every canonical facet into exactly one of five translated sections',()=>{
   expect(navigationGroups).toHaveLength(5);
   expect(manifest.registry.navigationGroups).toEqual(navigationGroups);
   const facets=navigationGroups.flatMap(group=>group.groups);
   expect(new Set(facets).size).toBe(facets.length);
   expect([...facets].sort()).toEqual(registry.groups.map(group=>group.id).sort());
   expect(navigationGroups.map(group=>catalogueText(group.label,'en'))).toEqual(['Controls','Navigation','Content and data','Layout and overlays','Feedback and motion']);
 });
 it('counts each active page once even when its detailed memberships overlap',()=>{
   const groups=groupCatalogueComponents(componentNames);
   const names=groups.flatMap(group=>group.components);
   expect(groups).toHaveLength(5);
   expect(manifest.catalogue.navigationGroups.map(group=>({id:group.id,components:[...group.components].sort()}))).toEqual(groups.map(group=>({id:group.id,components:[...group.components].sort()})));
   expect(new Set(names).size).toBe(names.length);
   expect([...names].sort()).toEqual([...componentNames].sort());
   expect(groups.find(group=>group.id==='controls')?.components.filter(name=>name==='MultiSelect')).toEqual(['MultiSelect']);
   expect(groupCatalogueComponents(['MultiSelect','MultiSelect']).flatMap(group=>group.components)).toEqual(['MultiSelect']);
 });
 it('keeps all detailed membership matches without duplicating presentation pages',()=>{
   for(const facet of registry.groups){
     const matches=filterComponents({group:facet.id});
     const names=groupCatalogueComponents(matches).flatMap(group=>group.components);
     expect([...names].sort(),facet.id).toEqual([...matches].sort());
     expect(new Set(names).size,facet.id).toBe(names.length);
   }
   expect(filterComponents({group:'fields'})).toContain('MultiSelect');
   expect(filterComponents({group:'selection'})).toContain('MultiSelect');
   const archive=groupCatalogueComponents(filterComponents({status:'archived'}));
   expect(archive).toHaveLength(1);
   expect(archive[0].id).toBe('content-data');
   expect(archive[0].components).toHaveLength(12);
 });
});

describe('Catalogue group expansion state',()=>{
 it('collapses partial or full expansion including Docs and Foundations, then expands all',()=>{
   const groups=['docs','foundations',...navigationGroups.map(group=>group.id)];
   const partial=['docs','controls'];
   expect(toggleCatalogueGroups(groups,partial)).toEqual([]);
   expect(partial).toEqual(['docs','controls']);
   const expanded=toggleCatalogueGroups(groups,[]);
   expect(expanded).toEqual(groups);
   expect(toggleCatalogueGroups(groups,expanded)).toEqual([]);
 });
 it('handles filtered trees independently of hidden groups and leaves component matches intact',()=>{
   const matches=filterComponents({group:'selection',query:'MultiSelect'});
   const visible=groupCatalogueComponents(matches).map(group=>group.id);
   expect(visible).toEqual(['controls']);
   expect(toggleCatalogueGroups(visible,['docs','controls'])).toEqual([]);
   expect(toggleCatalogueGroups(visible,['docs'])).toEqual(['controls']);
   expect(matches).toEqual(['MultiSelect']);
   expect(toggleCatalogueGroups([],['docs'])).toEqual([]);
 });
});
