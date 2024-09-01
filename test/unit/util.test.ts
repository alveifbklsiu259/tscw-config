import { expect, jest, it } from "@jest/globals";
import childProcess, { SpawnSyncReturns } from "node:child_process";
import path, { type ParsedPath } from "node:path";
import { fileExists, getRootDirForCurrentWorkSpace, getNearestTsconfig, spawnProcessSync } from "../../src/lib/util";
import "../lib/toBeWithinRange";
import { delay, getFixtureFile, toArray, cliSync } from "../lib/util";

afterEach(() => {
	jest.restoreAllMocks();
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

describe("getNearestTsconfig", () => {
	it("should return the relative path to tsconfig.json if it is found in the current project", () => {
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const tsconfig = getNearestTsconfig(path.join(__dirname, "../.."));

		expect(tsconfig).toBe(path.normalize("../../tsconfig.json"));
	});

	it("should return null if tsconfig.json is not found in the current project", () => {
		jest.spyOn(process, "cwd").mockReturnValue(__dirname);

		const tsconfig = getNearestTsconfig(path.join(__dirname, ".."));

		expect(tsconfig).toBeNull();
	});
});

describe("spawnProcessSync", () => {
	it("should spawn a process with the right args and return the child process", () => {
		jest.spyOn(childProcess, "spawnSync").mockReturnValue({
			pid: 42,
			status: 0,
		} as SpawnSyncReturns<string>);

		const rootDir = path.join(__dirname, "../..");

		const args = ["../fixtures/success1.ts"];

		const child = spawnProcessSync(args, rootDir);

		expect(childProcess.spawnSync).toHaveBeenCalledTimes(1);
		expect(childProcess.spawnSync).toHaveBeenCalledWith(
			process.versions.pnp
				? "tsc"
				: path.join(rootDir, `/node_modules/.bin/tsc${process.platform === "win32" ? ".cmd" : ""}`),
			args,
			{ stdio: "inherit" },
		);
		expect(child.status).not.toBeNaN();
		expect(child.status).toBe(0);
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

describe("toArray", () => {
	it("should return an array of string", () => {
		const a = "foo";
		const b = "bar";
		const c = {};
		const d = null;
		const e: unknown[] = [];
		const f = 0;
		const g = NaN;

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
