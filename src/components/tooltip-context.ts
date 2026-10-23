import { createContext } from 'react';

/** Explicit rich tooltips own the trigger; automatic action hints stay suppressed. */
export const ExplicitTooltipContext = /* @__PURE__ */ createContext(false);
