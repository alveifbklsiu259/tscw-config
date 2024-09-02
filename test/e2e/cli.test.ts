import { expect, jest, it, test, afterEach, describe } from "@jest/globals";
import { spawn } from "child_process";
import { readdirSync, watch, statSync } from "fs";
import path, { ParsedPath } from "path";
import pidTree from "pidtree";
import main from "../../src/index";
import * as utils from "../../src/lib/util";
import { isRunning } from "../../src/lib/util";
import { delay, getFixtureFile, cliSync } from "../lib/util";

afterEach(async () => {
	await delay(100);
	jest.restoreAllMocks();
});

const testCasesTs = [
	{ file: "success1.ts", statusCode: 0 },
	{ file: "fail1.ts", statusCode: 2 }, // 1: other error, 2: type error
];
const testCasesJs = [
	{ file: "success2.js", statusCode: 0 },
	{ file: "fail2.js", statusCode: 2 }, // 1: other error, 2: type error
];

describe("CLI", () => {
	it("should return 0 as status code when succeeds", () => {
		const child = cliSync`${getFixtureFile("success1.ts")} --noEmit`;

		expect(child.status).toBe(0);
		expect(isRunning(child.pid)).toBe(false);
	});
	it("should return non-zero status code when type-checking fails", () => {
		const child = cliSync`${getFixtureFile("fail1.ts")} --noEmit`;

		expect(child.status).not.toBe(0);
		expect(isRunning(child.pid)).toBe(false);
		expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
	});
	test.each(testCasesTs)("should work if tsconfig is specified - $file", ({ file, statusCode }) => {
		const child = cliSync`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit `;

		expect(child.status).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
		}
		expect(isRunning(child.pid)).toBe(false);
	});
	test.each(testCasesJs)(
		"should work if the same flag is specified multiple times - $file",
		({ file, statusCode }) => {
			const child = cliSync`${getFixtureFile(file)} -p ${getFixtureFile(
				"tsconfig.json",
			)} --checkJs false --noEmit -p ${getFixtureFile("tsconfig.json")} --checkJs true`;
			expect(child.status).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
			}
			expect(isRunning(child.pid)).toBe(false);
		},
	);
	test.each(testCasesJs)(
		"should override the tsconfig behavior by passing in CLI options - $file",
		({ file, statusCode }) => {
			const child = cliSync`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit --checkJs`;
			expect(child.status).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
			}
			expect(isRunning(child.pid)).toBe(false);
		},
	);
	it("should return 1 as status code if this project does not contain a package.json file", () => {
		jest.spyOn(path, "parse").mockReturnValue({
			root: path.join(__dirname, ".."),
		} as ParsedPath);
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);
		// Seems like that spawnSync spawns a new process that doesn’t inherit the mocked environment from the Jest, so main is used here.
		const child = main`${getFixtureFile("success1.ts")} --noEmit"`;
		expect(child.status).toBe(1);
		expect(child.stderr).toBe(
			"Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
		);
	});
	it("should return 1 as status code if tsconfig is not found in this project", () => {
		jest.spyOn(utils, "getNearestTsconfig").mockReturnValue(null);
		// Seems like that spawnSync spawns a new process that doesn’t inherit the mocked environment from the Jest, so main is used here.
		const child = main([getFixtureFile("success1.ts"), "--noEmit"]);

		expect(child.status).toBe(1);
		expect(child.stderr).toBe("Can't find tsconfig.json");
	});
	it("should work if no files specified", () => {
		process.chdir(path.join(__dirname, "../fixtures"));

		const child = cliSync`--noEmit`;
		expect(child.status).toBe(2);
		expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
		expect(isRunning(child.pid)).toBe(false);
	});
	test.each(testCasesTs)("should work if excludeFiles flag is used - $file", ({ file, statusCode }) => {
		// --excludeFiles: Remove a list of files from the watch mode's processing.
		const child = cliSync`${getFixtureFile(file)} -p ${getFixtureFile(
			"tsconfig.json",
		)} --noEmit --excludeFiles ${getFixtureFile(file)}`;

		expect(child.status).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout.toString()).toMatch("'string' is not assignable to type 'number'");
		}
		expect(isRunning(child.pid)).toBe(false);
	});
	test.each(testCasesTs)("should properly remove temp file - $file", ({ file }) => {
		const fileCountBeforeProcess = readdirSync(path.join(__dirname, "../fixtures")).length;
		const child = cliSync`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit`;
		const fileCountAfterProcess = readdirSync(path.join(__dirname, "../fixtures")).length;
		expect(fileCountBeforeProcess).toEqual(fileCountAfterProcess);
		expect(isRunning(child.pid)).toBe(false);
	});
	it("should properly remove temp file if process is terminated", async () => {
		const tsconfigDir = path.dirname(getFixtureFile("tsconfig.json"));

		const fileCountBeforeProcess = readdirSync(tsconfigDir).length;

		const child = spawn(
			"node",
			[
				path.join(__dirname, "../../dist/cli.js"),
				"--noEmit",
				getFixtureFile("fail1.ts"),
				getFixtureFile("success1.ts"),
				"-p",
				getFixtureFile("tsconfig.json"),
			],
			{
				stdio: "ignore",
			},
		);
		const watcher = watch(tsconfigDir, async (eventType, filename) => {
			if (eventType === "rename" && filename) {
				const filePath = path.join(tsconfigDir, filename);
				try {
					const stats = statSync(filePath);
					if (stats.isFile()) {
						// new file created
						try {
							const childPidTree = await pidTree(child.pid!);

							for (const childProcess of childPidTree) {
								process.kill(childProcess);
							}
						} catch (_e) {
							/*  */
						}
						try {
							process.kill(child.pid!);
						} catch (_e) {
							/*  */
						}
					}
				} catch (_e) {
					return;
				} finally {
					watcher.close();
				}
			}
		});

		await delay(2000);

		const fileCountAfterProcess = readdirSync(tsconfigDir).length;

		expect(fileCountAfterProcess).toEqual(fileCountBeforeProcess);
	});
});
