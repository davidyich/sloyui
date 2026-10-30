import type { CSSProperties } from 'react';
import publicRoles from '../src/tokens/public-roles.json';
import { canonicalFocusRingColorTokens } from '../src/tokens/focus-roles';
import { PopupSelect } from '../src/components/popup-select';

const roleNames = new Map(publicRoles.map(role => [role.css, role.name]));
const legacyBorderAliases: Record<string,string> = {
  '--cap-focus-ring':'--cap-v4-theme-border-focus',
  '--cap-border-subtle':'--cap-v4-theme-border-subtle',
  '--cap-border-default':'--cap-v4-theme-border-default',
  '--cap-border-strong':'--cap-v4-theme-border-strong',
  '--cap-status-danger-border':'--cap-v4-theme-border-red-normal',
  '--cap-status-success-border':'--cap-v4-theme-border-green-normal',
  '--cap-status-warning-border':'--cap-v4-theme-border-orange-normal',
  '--cap-status-info-border':'--cap-v4-theme-border-blue-normal',
};
export const focusColorChoices = canonicalFocusRingColorTokens;
export function FocusColorControl({label,value,onValueChange}:{label:string;value:string;onValueChange:(value:string)=>void}) {
  return <div className="playground-focus-token" style={{'--playground-focus-color':`var(${value})`} as CSSProperties}>
    <PopupSelect searchable searchPlacement="separate" label={label} showLabel size="md" value={legacyBorderAliases[value]??value} popupWidth={360} triggerContent={<span className="playground-focus-dot" aria-hidden="true"/>} options={canonicalFocusRingColorTokens.map(token=>({value:token,label:roleNames.get(token)??token,leading:<span className="playground-focus-dot" style={{background:`var(${token})`}}/>,aliases:[token,...Object.keys(legacyBorderAliases).filter(alias=>legacyBorderAliases[alias]===token)]}))} onValueChange={onValueChange}/>
  </div>;
}
