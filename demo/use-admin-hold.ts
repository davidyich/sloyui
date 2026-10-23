import {useEffect,useRef,type PointerEvent,type KeyboardEvent,type MouseEvent} from 'react';
/** Each press is independent. Releasing, leaving, losing focus or unmounting cancels it. */
export function useAdminHold(onHold:()=>void,onClick:()=>void){
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),fired=useRef(false);
 const callback=useRef(onHold);callback.current=onHold;
 const cancel=()=>{clearTimeout(timer.current);timer.current=undefined;};
 const start=()=>{if(timer.current)return;fired.current=false;timer.current=setTimeout(()=>{timer.current=undefined;fired.current=true;callback.current();},5000);};
 useEffect(()=>{window.addEventListener('blur',cancel);return()=>{cancel();window.removeEventListener('blur',cancel);};},[]);
 return {
  onPointerDown:(event:PointerEvent)=>{if(event.button===0&&event.isPrimary!==false)start();},
  onPointerUp:cancel,onPointerCancel:cancel,onPointerLeave:cancel,onLostPointerCapture:cancel,onBlur:cancel,
  onKeyDown:(event:KeyboardEvent)=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)start();}},
  onKeyUp:(event:KeyboardEvent)=>{if([' ','Enter'].includes(event.key)){event.preventDefault();cancel();if(!fired.current)onClick();}},
  onClick:(event:MouseEvent)=>{event.preventDefault();cancel();if(!fired.current)onClick();fired.current=false;},
 };
}
