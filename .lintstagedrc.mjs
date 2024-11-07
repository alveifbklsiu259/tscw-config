// @ts-check
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

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
 * @param {string} dir
 * @param {RegExp} regex
 *
 * @returns {string[]}
 */
const getFilesRecursivelySync = (dir, regex) => {
	const files = readdirSync(dir, { withFileTypes: true });
	/** @type {string[]} */
	let result = [];

	for (const file of files) {
		const fullPath = join(dir, file.name);
		if (file.isDirectory()) {
			result = result.concat(getFilesRecursivelySync(fullPath, regex));
		} else if (regex.test(file.name)) {
			result.push(fullPath);
		}
	}
	return result;
};

/**
 * Passing absolute path is fine, but relative path is cleaner in console.
 * @param {string[]} files
 */
const typeCheck = files => {
	const cwd = process.cwd();
	const relativePaths = files.map(file => relative(cwd, file)).join(" ");
	// Include all the declaration files for the current project.
	const declarationFiles = getFilesRecursivelySync("./@types", /\.d\.ts$/).join(" ");

	return `npx tscw --noEmit ${relativePaths} ${declarationFiles}`;
};

export default {
	"*": [cspell],
	"**/*.{ts,mts,cts,tsx}": [prettier, typeCheck, eslint],
	"./src/*.{ts,mts,cts,tsx}": [jest],
	"**/*.{js,mjs,cjs,jsx,json}": [prettier, eslint],
	"**/*.md": [prettier, markdownlint, eslint],
};
