import { afterEach, describe, expect, it, jest, test } from "@jest/globals";
import path, { ParsedPath } from "path";
import main from "../../src/index";
import * as utils from "../../src/lib/util";
import { delay, getFixtureFile } from "../lib/util";

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

describe("main - e2e", () => {
	it("should return 0 as status code when succeeds", async () => {
		const child = await main`${getFixtureFile("success1.ts")} --noEmit`;

		expect(child.exitCode).toBe(0);
		expect(child.stdout).toBe("");
		expect(child.stderr).toBe("");
	});

	it("should return non-zero status code when type-checking fails", async () => {
		const child = await main`${getFixtureFile("fail1.ts")} --noEmit`;

		expect(child.exitCode).not.toBe(0);
		expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
	});

	test.each(testCasesTs)("should work if tsconfig is specified - $file", async ({ file, statusCode }) => {
		const child = await main`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit `;

		expect(child.exitCode).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
		}
	});

	test.each(testCasesJs)(
		"should work if the same flag is specified multiple times - $file",
		async ({ file, statusCode }) => {
			const child = await main`${getFixtureFile(file)} -p ${getFixtureFile(
				"tsconfig.json",
			)} --checkJs false --noEmit -p ${getFixtureFile("tsconfig.json")} --checkJs true`;
			expect(child.exitCode).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
			}
		},
	);

	test.each(testCasesJs)(
		"should override the tsconfig behavior by passing in CLI options - $file",
		async ({ file, statusCode }) => {
			const child = await main`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit --checkJs`;
			expect(child.exitCode).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
			}
		},
	);

	it("should return 1 as status code if this project does not contain a package.json file", async () => {
		jest.spyOn(path, "parse").mockReturnValue({
			root: path.join(__dirname, ".."),
		} as ParsedPath);
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const child = await main`${getFixtureFile("success1.ts")} --noEmit"`;

		expect(child.exitCode).toBe(1);
		expect(child.stderr).toBe(
			"Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
		);
	});

	it("should return 1 as status code if tsconfig is not found in this project", async () => {
		jest.spyOn(utils, "getNearestTsconfig").mockReturnValue(null);

		const child = await main([getFixtureFile("success1.ts"), "--noEmit"]);

		expect(child.exitCode).toBe(1);
		expect(child.stderr).toBe("Can't find tsconfig.json from the current working directory or level(s) up.");
	});

	it("should work if no files are specified", async () => {
		process.chdir(path.join(__dirname, "../fixtures"));

		const child = await main`--noEmit`;

		expect(child.exitCode).toBe(2);
		expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
	});

	test.each(testCasesTs)("should work if excludeFiles flag is used - $file", async ({ file, statusCode }) => {
		// --excludeFiles: Remove a list of files from the watch mode's processing.
		const child = await main`${getFixtureFile(file)} -p ${getFixtureFile(
			"tsconfig.json",
		)} --noEmit --excludeFiles ${getFixtureFile(file)}`;

		expect(child.exitCode).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout).toMatch("'string' is not assignable to type 'number'");
		}
	});

	it("should return data with stderr when the specified tsconfig does not exist", async () => {
		const tsconfig = "foo.json";
		const child = await main`${getFixtureFile("success1.ts")} -p ${tsconfig}`;

		expect(child).toStrictEqual({
			pid: null,
			exitCode: 1,
			stderr: `Can't find ${tsconfig}`,
			stdout: null,
		});
	});
});
