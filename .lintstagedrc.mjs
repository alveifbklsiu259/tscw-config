// @ts-check
import path from "node:path";
import process from "node:process";

/**
 * @param {string} strategy
 * @param {string} cacheFile
 */

const cacheOptions = (strategy, cacheFile) =>
	`--cache --cache-strategy ${strategy} --cache-location .lint-cache/${cacheFile}`;

// The following commands are only run on staged file, notice that there's no need to pass file argument. e.g. cspell "foo.ts" or cspell ".".
// The commands run by lint-staged do not directly benefit from the cache, but lint commands executed outside of lint-staged can utilize the cache results they produce.

const cspell = `cspell --no-progress --show-context ${cacheOptions("metadata", ".cspellcache")}`;
/**
 * Don't cache the result of eslint.
 * @see{@link https://typescript-eslint.io/troubleshooting/faqs/eslint#can-i-use-eslints---cache-with-typescript-eslint}
 */

const eslint = `eslint --report-unused-disable-directives --fix`;
const prettier = `prettier --ignore-unknown --write ${cacheOptions("metadata", ".prettiercache")}`;
const markdownlint = `markdownlint --fix`;

const jest = "jest --findRelatedTests --passWithNoTests --coverage";

/**
 * Passing absolute path is fine, but relative path is cleaner in console.
 * @param {string[]} files
 */
const typeCheck = files => {
	const cwd = process.cwd();
	const relativePaths = files.map(file => path.relative(cwd, file)).join(" ");
	return `npx tscw --noEmit ${relativePaths}`;
};

export default {
	"*": [cspell],
	"**/*.{ts,mts,cts,tsx}": [prettier, typeCheck, eslint],
	"./src/*.{ts,mts,cts,tsx}": [jest],
	"**/*.{js,mjs,cjs,jsx,json}": [prettier, eslint],
	"**/*.md": [prettier, markdownlint, eslint],
};
