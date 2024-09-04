import { expect, jest, it, afterEach, beforeEach, describe, test } from "@jest/globals";
import childProcess, { SpawnSyncReturns } from "node:child_process";
import { readFileSync } from "node:fs";
import path, { type ParsedPath } from "node:path";
import {
	fileExists,
	getRootDirForCurrentWorkSpace,
	getNearestTsconfig,
	spawnProcessSync,
	isRunning,
	processArgs,
	processJsonData,
} from "../../src/lib/util";
import { toArray } from "../../src/lib/util";
import "../lib/toBeWithinRange";
import { delay, getFixtureFile, cliSync } from "../lib/util";

const originalPlatform = process.platform;

beforeEach(() => {
	Object.defineProperties(process, {
		platform: {
			value: "linux",
		},
	});
});

afterEach(() => {
	jest.restoreAllMocks();
	Object.defineProperties(process, {
		platform: {
			value: originalPlatform,
		},
	});
});

describe("fileExists", () => {
	it("should return true if file exists", () => {
		const exist1 = fileExists(__dirname, "../fixtures", "tsconfig.json");
		const exist2 = fileExists(__dirname, "../..", "package.json");
		const exist3 = fileExists(__dirname, "../..", ".git");
		expect(exist1).toBe(true);
		expect(exist2).toBe(true);
		expect(exist3).toBe(true);
	});

	it("should return false if file does not exist", () => {
		const exist1 = fileExists(__dirname, "../fixtures", "foo.txt");
		const exist2 = fileExists(__dirname, "../..", "foo.txt");
		expect(exist1).toBe(false);
		expect(exist2).toBe(false);
	});
});

describe("getRootDirForCurrentWorkSpace", () => {
	it("should return the root dir of the project if package.json is found", () => {
		const rootDir = getRootDirForCurrentWorkSpace();
		expect(rootDir).toBe(path.resolve(path.join(__dirname, "../../")));
	});

	it("should return null if package.json is not found", () => {
		jest.spyOn(path, "parse").mockReturnValue({
			root: path.join(__dirname, ".."),
		} as ParsedPath);
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const rootDir = getRootDirForCurrentWorkSpace();
		expect(rootDir).toBeNull();
	});
});

describe("processArgs", () => {
	it("should handle project flag", () => {
		const args1 = ["--project", "./tsconfig.json"];

		const result1 = processArgs(args1);

		expect(result1.indexOfProjectFlag).toBe(0);
		expect(result1.error).toBeNull();

		const args2 = ["--project", "./tsconfig.json", "test.ts", "-p", "./tsconfig.json"];

		const result2 = processArgs(args2);

		expect(result2.indexOfProjectFlag).toBe(3);
		expect(result2.error).toBeNull();
	});

	it("should return error if project flag is specified but project file is missing", () => {
		const args1 = ["--project"];

		const result1 = processArgs(args1);

		expect(result1.indexOfProjectFlag).toBe(undefined);
		expect(result1.error).toStrictEqual({
			status: 1,
			stderr: "Missing argument for --project",
			stdout: null,
		});

		const args2 = ["--project", "./tsconfig.json", "test.ts", "-p"];

		const result2 = processArgs(args2);

		expect(result2.indexOfProjectFlag).toBe(undefined);
		expect(result2.error).toStrictEqual({
			status: 1,
			stderr: "Missing argument for -p",
			stdout: null,
		});
	});

	it("should handle excludeFiles flag", () => {
		const args1 = ["--excludeFiles", "./test.ts", "-p", "tsconfig.json"];

		const result1 = processArgs(args1);

		expect(result1.remainingCliOptions).toStrictEqual(["--excludeFiles", "./test.ts"]);
		expect(result1.error).toBeNull();
	});

	it("should return error if excludeFiles flag is specified but files are missing", () => {
		const args1 = ["--excludeFiles"];

		const result1 = processArgs(args1);

		expect(result1.error).toStrictEqual({
			status: 1,
			stderr: "Missing argument for --excludeFiles",
			stdout: null,
		});
	});

	it("should handle other CLI options", () => {
		const args1 = ["-p", "tsconfig.json", "--lib", "ES5,DOM"];

		const { indexOfProjectFlag, remainingCliOptions, error } = processArgs(args1);

		expect(error).toBeNull();

		expect(indexOfProjectFlag).toBe(0);
		expect(remainingCliOptions).toStrictEqual(["--lib", "ES5,DOM"]);
	});
});

describe("getNearestTsconfig", () => {
	it("should return the relative path to tsconfig.json if it is found in the current project", () => {
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const tsconfig1 = getNearestTsconfig(path.join(__dirname, "../.."));

		expect(tsconfig1).toBe(path.join("../../tsconfig.json"));

		const tsconfig2 = getNearestTsconfig(path.join(__dirname, "../../.."));

		expect(tsconfig2).toBe(path.join("../../tsconfig.json"));
	});

	it("should return null if tsconfig.json is not found in the current project", () => {
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const tsconfig = getNearestTsconfig(path.join(__dirname, ".."));

		expect(tsconfig).toBeNull();
	});
});

describe("spawnProcessSync", () => {
	const testCases = [
		{ platform: "non-Windows", isPnp: true },
		{ platform: "non-Windows", isPnp: false },
		{ platform: "Windows", isPnp: true },
		{ platform: "Windows", isPnp: false },
	];

	test.each(testCases)(
		"should spawn a process with the right args and return the child process - $platform / YarnPnp: $isPnp",
		({ platform, isPnp }) => {
			jest.spyOn(childProcess, "spawnSync").mockReturnValue({
				pid: 42,
				status: 0,
			} as SpawnSyncReturns<string>);

			const rootDir = path.join(__dirname, "../..");

			const args = ["../fixtures/success1.ts"];

			if (platform === "Windows") {
				Object.defineProperties(process, {
					platform: {
						value: "win32",
					},
				});
			}

			const child1 = spawnProcessSync(args, rootDir, isPnp);

			expect(child1.status).toBe(0);
			expect(childProcess.spawnSync).toHaveBeenCalledTimes(1);

			if (isPnp) {
				expect(childProcess.spawnSync).toHaveBeenCalledWith(`yarn tsc ${args.join(" ")}`, {
					stdio: "inherit",
					shell: true,
				});
			} else {
				expect(childProcess.spawnSync).toHaveBeenCalledWith(
					path.join(rootDir, `/node_modules/.bin/tsc${platform === "Windows" ? ".cmd" : ""}`),
					args,
					{
						stdio: "inherit",
					},
				);
			}
		},
	);

	it("should log the error and exit with 1 when fails to spawn a process", () => {
		const error = new Error("mock error");

		jest.spyOn(childProcess, "spawnSync").mockReturnValue({
			error,
		} as SpawnSyncReturns<string>);
		const mockedConsoleError = jest.spyOn(console, "error").mockImplementation(() => {
			/*  */
		});
		// @ts-expect-error Type 'void' is not assignable to type 'never'.
		const mockedExit = jest.spyOn(process, "exit").mockImplementation(() => {
			/*  */
		});
		const rootDir = path.join(__dirname, "../..");

		const args = ["../fixtures/success1.ts"];

		const _child = spawnProcessSync(args, rootDir, false);

		expect(mockedConsoleError).toHaveBeenCalledTimes(1);
		expect(mockedConsoleError).toHaveBeenCalledWith(error);

		expect(mockedExit).toHaveBeenCalledTimes(1);
		expect(mockedExit).toHaveBeenCalledWith(1);
	});
});

describe("processJsonData", () => {
	it("should remove single line comments", () => {
		const rawData = `{
			"foo": "bar"
			// baz
		}`;
		const files = ["a.ts"];

		const jsonData = processJsonData(rawData, files);

		expect(jsonData).toStrictEqual({ foo: "bar", files: ["a.ts"] });
	});

	it('should remove multi-line comments, but respect "/**/*" and "/**/." which are used as globs', () => {
		const rawData = `{
			"foo": "bar",
			/* b
				a
				z
			*/
			/* abc */
			"exclude": ["./dist/**/*", "/**/.ts"]
		}`;
		const files = ["a.ts"];

		const jsonData = processJsonData(rawData, files);

		expect(jsonData).toStrictEqual({ foo: "bar", exclude: ["./dist/**/*", "/**/.ts"], files: ["a.ts"] });
	});

	it("should remove trailing comma", () => {
		const rawData = `{
		"foo": "bar",
		}`;
		const files = ["baz.ts"];

		const jsonData = processJsonData(rawData, files);

		expect(jsonData).toStrictEqual({ foo: "bar", files: ["baz.ts"] });
	});

	it('should remove "include" field', () => {
		const rawData = `{
		"foo": "bar",
		"include": [
			"./src",
			"./**/*.ts",
			"./**/*.d.ts",
			"./**/*.js",
		]
		}`;
		const files = ["baz.ts"];

		const jsonData = processJsonData(rawData, files);

		expect(jsonData).toStrictEqual({ foo: "bar", files: ["baz.ts"] });
	});

	it("should product valid json object", () => {
		const tsconfig = getFixtureFile("tsconfig.json");

		const rawData = readFileSync(tsconfig, "utf-8");

		const files = ["bar.ts"];
		const jsonData = processJsonData(rawData, files);

		expect(jsonData).toStrictEqual({
			compilerOptions: {
				target: "ES2020",
				allowJs: true,
				esModuleInterop: true,
				forceConsistentCasingInFileNames: true,
				module: "Node16",
				moduleResolution: "Node16",
				outDir: "./dist",
				pretty: true,
				skipLibCheck: true,
				strict: true,
			},
			exclude: ["./dist/**/*"],
			files: ["bar.ts"],
		});
	});
});

describe("delay", () => {
	it("should resolve after the specified time", async () => {
		jest.useFakeTimers();
		const startTime = performance.now();
		const ms = 10000;
		let resolve = false;

		const promise = delay(ms).then(() => {
			resolve = true;
		});

		expect(resolve).toBe(false);

		/* eslint-disable-next-line */
		jest.advanceTimersByTimeAsync(ms);

		await promise;

		expect(resolve).toBe(true);

		const endTime = performance.now();

		// setTimeout does not guarantee timeout
		expect(endTime - startTime).toBeWithinRange(ms, ms + 100);

		jest.useRealTimers();
	});
});

describe("getFixtureFile", () => {
	it("should return correct path for fixture file", () => {
		const file = "success1.ts";
		const success1 = getFixtureFile(file);

		expect(success1).toBe(path.join(__dirname, `../fixtures/${file}`));
	});
});

describe("isRunning", () => {
	it("should return true if the process is running", () => {
		jest.spyOn(process, "kill").mockReturnValue(true);

		expect(isRunning(42)).toBe(true);
	});

	it("should return false if the process is not running", () => {
		const error = new Error() as Error & { code: string };
		error.code = "ESRCH";

		jest.spyOn(process, "kill").mockImplementation(() => {
			throw error;
		});

		expect(isRunning(-1)).toBe(false);
	});

	it("should return true if the process is not accessible due to permission", () => {
		const error = new Error() as Error & { code: string };
		error.code = "EPERM";

		jest.spyOn(process, "kill").mockImplementation(() => {
			throw error;
		});

		expect(isRunning(1)).toBe(true);
	});

	it("should return false for other error", () => {
		const error = new Error() as Error & { code: string };
		error.code = "EOTHER";

		jest.spyOn(process, "kill").mockImplementation(() => {
			throw error;
		});

		expect(isRunning(42)).toBe(false);
	});
});

describe("toArray", () => {
	it("should return an array of string", () => {
		const a = "foo";
		const b = "bar";
		const c = {};
		const d = null;
		const e: unknown[] = [];
		const f = 0;
		const g = NaN;
		//@ts-expect-error - data that are not string or number will be filtered out
		const arr = toArray`baz ${a} dog ${b} ${c} cat ${d} ${e} banana ${f} 42 ${g}`;

		expect(arr).toStrictEqual(["baz", "foo", "dog", "bar", "cat", "banana", "0", "42"]);
	});
});

describe("cliSync", () => {
	it("should call spawnSync with the right args", () => {
		const mockSpawnSync = jest.spyOn(childProcess, "spawnSync");
		const _child = cliSync`${getFixtureFile("success1.ts")} --noEmit`;

		expect(mockSpawnSync).toHaveBeenCalledTimes(1);
		expect(mockSpawnSync).toHaveBeenCalledWith(
			"node",
			[path.join(__dirname, "../../dist/cli.js"), getFixtureFile("success1.ts"), "--noEmit"],
			{ stdio: "pipe" },
		);
	});
});
