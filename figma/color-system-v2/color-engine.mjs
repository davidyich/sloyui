// Shared by the V2 token builder and Palette Lab. No file-system or UI dependencies.
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const encode=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function oklchToSRGB(L,C,h){const a=C*Math.cos(h*Math.PI/180),b=C*Math.sin(h*Math.PI/180);const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.2914855480*b)**3;return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s];}
// Identical to scripts/color-model.mjs: reduce chroma, never clip hue or lightness.
export function gamutColor(L,C,h){const inside=rgb=>rgb.every(x=>x>=0&&x<=1);let rgb=oklchToSRGB(L,C,h);if(!inside(rgb)){let low=0,high=C;for(let i=0;i<32;i++){const mid=(low+high)/2;if(inside(oklchToSRGB(L,mid,h)))low=mid;else high=mid;}rgb=oklchToSRGB(L,low,h);}return {colorSpace:'srgb',components:rgb.map(x=>Number(encode(clamp(x,0,1)).toFixed(10))),alpha:1};}
export function color(L,C,h){const {components:[r,g,b]}=gamutColor(clamp(L,0,1),Math.max(0,C),h);return {r,g,b,a:1};}
export function composite(fg,bg){const a=fg.a??1;return {r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a),a:1};}
export function luminance(c){return ['r','g','b'].reduce((sum,k,i)=>sum+linear(c[k])*[.2126,.7152,.0722][i],0);}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function toOklch(c){const [r,g,b]=['r','g','b'].map(k=>linear(c[k]));const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);const a=1.9779984951*l-2.428592205*m+.4505937099*s,bv=.0259040371*l+.7827717662*m-.808675766*s;return {l:.2104542553*l+.793617785*m-.0040720468*s,c:Math.hypot(a,bv),h:(Math.atan2(bv,a)*180/Math.PI+360)%360};}
export const chroma=c=>toOklch(c).c;
export const BLACK={r:0,g:0,b:0,a:1},WHITE={r:1,g:1,b:1,a:1};
export function fromHex(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Нужен HEX из шести цифр, например #7856FF.');const n=parseInt(hex.slice(1),16);return {r:(n>>16)/255,g:((n>>8)&255)/255,b:(n&255)/255,a:1};}
export const toHex=c=>'#'+['r','g','b'].map(k=>Math.round(clamp(c[k],0,1)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export const css=c=>`rgb(${['r','g','b'].map(k=>Number((c[k]*255).toFixed(6))).join(' ')} / ${c.a??1})`;
export function softFill({base,hue,theme,role,state,glass,settings,chromaScale=1,opacityScale=1}){
 const tone=glass?settings.glass[theme]:settings[theme][role];
 const baseL=base.r===base.g&&base.g===base.b?Math.cbrt(linear(base.r)):toOklch(base).l;
 const L=glass?tone.lightness:baseL+tone.lightnessDelta[state];
 const C=(glass?tone.chroma:tone.chroma[state])*chromaScale;
 const {components:rgb}=gamutColor(clamp(L,.005,.995),C,hue);
 let a=glass?settings.glass[role][state]/100:settings[theme][role].layerAlpha[state];
 if(!glass){const channels=['r','g','b'];const minimum=Math.max(...rgb.map((v,i)=>v<base[channels[i]]?1-v/base[channels[i]]:(v-base[channels[i]])/(1-base[channels[i]]||1)));a=Math.max(a,Math.ceil(minimum*1000)/1000);for(let i=0;i<3;i++)rgb[i]=(rgb[i]-(1-a)*base[channels[i]])/a;}
 const [r,g,b]=rgb;return {r,g,b,a:clamp(a*opacityScale,0,1)};
}
export function readableInk({hue,theme,role,settings,backgrounds,primary,chromaScale=1}){
 const s=settings[theme][role];const C=role==='secondary'?Math.min(s.chroma*chromaScale,chroma(primary)*.45):s.chroma*chromaScale;let candidate;
 for(let i=0;i<100;i++){const L=s.lightness+i*(theme==='Dark'?.005:-.005);if(L<=0||L>=1)break;candidate=color(L,C,hue);if(backgrounds.every(bg=>contrast(candidate,bg)>=settings.minimumContrast))return candidate;}
 return candidate??(theme==='Dark'?WHITE:BLACK);
}
