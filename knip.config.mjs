//@ts-check

/**
 * @type {import("knip").KnipConfig}
 */
export default {
	ignoreExportsUsedInFile: true,
	includeEntryExports: true,
	ignore: [
		"./test/fixtures/*.*",
		"./src/cleanupMonitor.ts",
		"./src/intermediate.ts",
		"@types/eslintClassicConfig.d.ts", // generated file
	],
	ignoreBinaries: ["tscw"],
	ignoreDependencies: [
		"json-schema-to-typescript", // used in script
		// https://github.com/semantic-release/semantic-release/blob/master/docs/usage/plugins.md#default-plugins
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/npm",
		"@semantic-release/github",
	],
};
