//  This .ts file is a workaround for checking the type of modules. Since TypeScript doesn’t show the “Could not find a declaration file for module …” warning in .d.ts files.

export type { SharedConfig } from "@typescript-eslint/utils/ts-eslint";
export type { Linter } from "eslint";
export type { TSESLint } from "@typescript-eslint/utils";
