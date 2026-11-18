"use client";

import { createContext, useContext } from "react";

export interface DemoModeState {
  demoMode: boolean;
  sessionReady: boolean;
}

export const DemoModeContext = createContext<DemoModeState>({
  demoMode: false,
  sessionReady: false,
});

export function useDemoMode() {
  return useContext(DemoModeContext);
}
