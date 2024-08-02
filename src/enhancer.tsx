import React, { createContext } from "react";
import { StoreEnhancer } from "@reduxjs/toolkit";

const EnhancerContext = createContext<StoreEnhancer>(undefined);
const SetEnhancerContext = createContext<
  React.Dispatch<React.SetStateAction<{ current: StoreEnhancer }>>
>(() => {});

function EnhancerProvider({ children }: { children: React.ReactNode }) {
  const [enhancer, setEnhancer] = React.useState<{ current: StoreEnhancer }>(
    null
  );
  return (
    <EnhancerContext.Provider value={enhancer?.current}>
      <SetEnhancerContext.Provider value={setEnhancer}>
        {children}
      </SetEnhancerContext.Provider>
    </EnhancerContext.Provider>
  );
}

export const useEnhancer = () => {
  return React.useContext(EnhancerContext);
};

export const useSetEnhancer = () => {
  return React.useContext(SetEnhancerContext);
};

export default EnhancerProvider;
