import type {Context} from './model.mjs';
import type {ComputeRequest} from './compute.mjs';
export type PaletteResult={key:string;viewKey:string;contexts:Context[];text:string;pending:boolean;error:string;elapsedMs:number};
export type PaletteReply={id:number;contexts?:Context[];append?:Context[];text?:string;done?:boolean;error?:string};
export function paletteViewKey(request:ComputeRequest):string;
export function createPaletteResultStore():{
 read:(request:ComputeRequest)=>PaletteResult;
 start:(request:ComputeRequest)=>{id:number;request:ComputeRequest;result:PaletteResult;cached:boolean};
 receive:(data:PaletteReply)=>PaletteResult|null;
 fail:(message:string)=>PaletteResult|null;
};
