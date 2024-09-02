import type { TSESLint } from "../../check_modules";
import { ClassicConfig } from "../../flatConfig";

declare module "@eslint/eslintrc" {
	interface FlatCompat {
		// function overload
		config(eslintrcConfig: ClassicConfig): TSESLint.FlatConfig.ConfigArray;

		// Otherwise you can add a new method, e.g.
		// configWithRulesTyped: (eslintrcConfig: ClassicConfig) => TSESLint.FlatConfig.ConfigArray;
		// Notice that implementation augmentation is needed, e.g. `FlatCompat.prototype.configWithRulesTyped = FlatCompat.prototype.config`;
	}
}

export {};
