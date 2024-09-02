import type { TSESLint } from "../check_modules";
import { TSETypedFlatConfig } from "../flatConfig";

declare module "typescript-eslint" {
	interface TypedRuleConfigWithExtends extends TSETypedFlatConfig {
		extends?: TSESLint.FlatConfig.ConfigArray;
	}
	function config(...configs: TypedRuleConfigWithExtends[]): TSESLint.FlatConfig.ConfigArray;
}

export {};
