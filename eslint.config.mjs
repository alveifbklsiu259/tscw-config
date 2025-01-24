// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
// @ts-expect-error No declaration file available.
import eslintConfigPrettier from "eslint-config-prettier";
// @ts-expect-error No declaration file available.
import { configs as importConfigs } from "eslint-plugin-import";
// @ts-expect-error No declaration file available.
import jestPlugin from "eslint-plugin-jest";
// @ts-expect-error No declaration file available.
import jsonPlugin from "eslint-plugin-json";
import markdownPlugin from "eslint-plugin-markdown";
import globals from "globals";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
	resolvePluginsRelativeTo: __dirname,
	recommendedConfig: eslint.configs.recommended,
});

export default tseslint.config(
	{
		files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,json}"],
	},
	{
		// config with just ignores is the replacement for `.eslintignore`
		ignores: ["**/build/**", "**/dist/**"],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				NodeJS: true,
			},
			parserOptions: {
				project: "./tsconfig.json",
				// If tsconfig is never changed or no new tsconfig is added, no need to clear the cache. In the case that happens, manually restart the ESlint Server.
				cacheLifetime: {
					glob: "Infinity",
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// plugins
	{
		plugins: {
			markdown: markdownPlugin,
		},
	},

	// processors
	{
		files: ["**/*.md"],
		processor: "markdown/markdown",
	},

	// settings
	{
		settings: {
			"import/resolver": {
				typescript: {
					alwaysTryTypes: true,
				},
			},
		},
	},

	// extends predefined configs
	eslint.configs.recommended,

	// No need to configure the parser, `tseslint.configs.recommended` uses `@typescript-eslint/parser` for all TS files.
	...tseslint.configs.strictTypeChecked,

	/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- No declaration files available.*/
	...compat.config({
		...importConfigs.recommended,
		...importConfigs.typescript,
	}),
	jsonPlugin.configs["recommended-with-comments"],

	{
		files: ["test/**"],
		...jestPlugin.configs["flat/recommended"],
		rules: {
			...jestPlugin.configs["flat/recommended"].rules,
		},
	},

	// reset formatting rules
	eslintConfigPrettier,
	/* eslint-enable */

	...tseslint.configs.stylisticTypeChecked,

	{
		files: ["**/*.{json,md/*.js,md/*.ts,md}"],
		extends: [tseslint.configs.disableTypeChecked],
	},

	// rules
	{
		rules: {
			"no-unused-vars": "off",
			"no-undef": "error",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
			"@typescript-eslint/triple-slash-reference": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
		},
	},

	{
		files: ["**/*.{md/*.js,md/*.ts}"],
		rules: {
			"no-unused-vars": "off",
			"no-undef": "off",
			"no-console": "off",
			"import/no-unresolved": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["**/*.test.ts", "**/*.spec.ts"],
		rules: {
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/unbound-method": "off",
			"jest/unbound-method": "error",
			"jest/prefer-expect-assertions": "off",
			"jest/no-conditional-expect": "off",
		},
	},
);
