/// <reference types="react" />
/// <reference types="react-native" />

declare module "*.png" {
  const value: any;
  export default value;
}

declare module "*.jpg" {
  const value: any;
  export default value;
}

declare module "*.jpeg" {
  const value: any;
  export default value;
}

declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

// Fix for Metro require issues
declare var global: typeof globalThis & {
  HermesInternal?: any;
  __metro_require?: any;
  loadModuleImplementation?: any;
  guardedLoadModule?: any;
  metroRequire?: any;
};


// Fix for anonymous function errors
declare function anonymous(): void;

// Ensure proper TypeScript configuration
declare const process: {
  env: {
    NODE_ENV: string;
    [key: string]: string | undefined;
  };
};
