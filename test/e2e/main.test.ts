import { expect, jest, it, test, afterEach, describe } from "@jest/globals";
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

describe("main:e2e", () => {
	it("should return 0 as status code when succeeds", () => {
		const child = main`${getFixtureFile("success1.ts")} --noEmit`;

		expect(child.status).toBe(0);
		expect(child.stdout!.toString()).toBe("");
		expect(Buffer.isBuffer(child.stderr)).toBe(true);
	});

	it("should return non-zero status code when type-checking fails", () => {
		const child = main`${getFixtureFile("fail1.ts")} --noEmit`;

		expect(child.status).not.toBe(0);
		expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
	});

	test.each(testCasesTs)("should work if tsconfig is specified - $file", ({ file, statusCode }) => {
		const child = main`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit `;

		expect(child.status).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
		}
	});

	test.each(testCasesJs)(
		"should work if the same flag is specified multiple times - $file",
		({ file, statusCode }) => {
			const child = main`${getFixtureFile(file)} -p ${getFixtureFile(
				"tsconfig.json",
			)} --checkJs false --noEmit -p ${getFixtureFile("tsconfig.json")} --checkJs true`;
			expect(child.status).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
			}
		},
	);

	test.each(testCasesJs)(
		"should override the tsconfig behavior by passing in CLI options - $file",
		({ file, statusCode }) => {
			const child = main`${getFixtureFile(file)} -p ${getFixtureFile("tsconfig.json")} --noEmit --checkJs`;
			expect(child.status).toBe(statusCode);
			if (statusCode !== 0) {
				expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
			}
		},
	);

	it("should return 1 as status code if this project does not contain a package.json file", () => {
		jest.spyOn(path, "parse").mockReturnValue({
			root: path.join(__dirname, ".."),
		} as ParsedPath);
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const child = main`${getFixtureFile("success1.ts")} --noEmit"`;

		expect(child.status).toBe(1);
		expect(child.stderr).toBe(
			"Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
		);
	});

	it("should return 1 as status code if tsconfig is not found in this project", () => {
		jest.spyOn(utils, "getNearestTsconfig").mockReturnValue(null);

		const child = main([getFixtureFile("success1.ts"), "--noEmit"]);

		expect(child.status).toBe(1);
		expect(child.stderr).toBe("Can't find tsconfig.json from the current working directory or level(s) up.");
	});

	it("should work if no files are specified", () => {
		process.chdir(path.join(__dirname, "../fixtures"));

		const child = main`--noEmit`;

		expect(child.status).toBe(2);
		expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
	});

	test.each(testCasesTs)("should work if excludeFiles flag is used - $file", ({ file, statusCode }) => {
		// --excludeFiles: Remove a list of files from the watch mode's processing.
		const child = main`${getFixtureFile(file)} -p ${getFixtureFile(
			"tsconfig.json",
		)} --noEmit --excludeFiles ${getFixtureFile(file)}`;

		expect(child.status).toBe(statusCode);
		if (statusCode !== 0) {
			expect(child.stdout!.toString()).toMatch("'string' is not assignable to type 'number'");
		}
	});

	it("should return data with stderr when the specified tsconfig does not exist", () => {
		const tsconfig = "foo.json";
		const child = main`${getFixtureFile("success1.ts")} -p ${tsconfig}`;

		expect(child).toStrictEqual({
			pid: null,
			status: 1,
			stderr: `Can't find ${tsconfig}`,
			stdout: null,
		});
	});
});
