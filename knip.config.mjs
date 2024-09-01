//@ts-check

/**
 * @type {import("knip").KnipConfig}
 */
export default {
	ignoreExportsUsedInFile: true,
	includeEntryExports: true,
	ignore: ["./test/fixtures/*.*", "./src/cleanupMonitor.ts", "./src/intermediate.ts"],
};
