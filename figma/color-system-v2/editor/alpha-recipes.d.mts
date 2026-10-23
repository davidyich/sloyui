import type {Accent,Color,PaletteStep} from './model.mjs';
export type AlphaRecipe={fills:Record<string,Color>;references:Record<string,string>;backings:Color[];contentBackings:Color[];diagnostics:{algorithm:string;polarity:string;backingCount:number;minimumContrast:number;minimumTextContrast:number;pigmentCount:number;limited:boolean;issues:string[];roles:Record<string,any>;activeDelta:Record<string,any>;referenceChroma:Record<string,unknown>|null}};
export type NeutralAlphaRecipe=AlphaRecipe&{roles:Record<string,Color>};
export type AlphaRecipeOptions={backings:(Color|{id?:string;base:Color})[];dark?:boolean;minimumContrast?:number;neutral?:boolean;maxAlpha?:number;ink?:Color;contentReserve?:number;referenceBase?:Color};
export function solveAlphaRecipe(accent:Accent|{hue:number;softChroma?:number;opacityScale?:number},steps:Pick<PaletteStep,'name'|'value'>[],options:AlphaRecipeOptions):AlphaRecipe;
export function solveNeutralAlphaRecipe(options:Pick<AlphaRecipeOptions,'backings'|'dark'|'minimumContrast'>):NeutralAlphaRecipe;

export function alphaRecipeFamily(theme:string,surface:string,base:Color):string;

export const neutralFillVisibilityPolicy:{tertiaryContrast:number;secondaryContrast:number;tertiaryDelta:number;secondaryDelta:number;stateContrast:number;stateDelta:number;stateMaximumDelta:number};
