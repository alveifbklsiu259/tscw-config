import { afterEach, beforeAll, describe, expect, it, jest, test } from "@jest/globals";
import childProcess, { spawn } from "child_process";
import fs from "fs";
import path from "path";
import main from "../../src";
import * as utils from "../../src/lib/util";
import { createMockedChild, getFixtureFile } from "../lib/util";

jest.mock("fs", () => {
	const originalFs = jest.requireActual<typeof fs>("fs");
	return {
		...originalFs,
		unlinkSync: jest.fn(),
		writeFileSync: jest.fn(),
	};
});

const originalPlatform = process.platform;

afterEach(() => {
	jest.restoreAllMocks();
	Object.defineProperties(process, {
		platform: {
			value: originalPlatform,
		},
	});
});

describe("main - integration", () => {
	it("should return stderr when processArg returns an error", async () => {
		const error = {
			pid: null,
			exitCode: 1,
			stderr: `Missing argument for -p`,
			stdout: null,
		};
		const mockedProcessArgs = jest.spyOn(utils, "processArgs").mockReturnValue({
			error,
		});
		const args = ["test.ts", "-p"];

		const result = await main(args);
		expect(mockedProcessArgs).toHaveBeenCalledTimes(1);
		expect(mockedProcessArgs).toHaveBeenCalledWith(args);
		expect(result).toStrictEqual(error);
	});

	it("should return stderr when there's no package.json found", async () => {
		jest.spyOn(utils, "getRootDirForCurrentWorkSpace").mockReturnValue(null);

		const child = await main`test.ts`;

		expect(child).toStrictEqual({
			pid: null,
			exitCode: 1,
			stderr: "Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
			stdout: null,
		});
	});

	it("should still work if no files are specified", async () => {
		const result = {
			pid: 42,
			exitCode: 0,
			stderr: "",
			stdout: "",
		};
		const mockedSpawnProcessSync = jest.spyOn(utils, "runTsc").mockResolvedValue(result);

		const args = ["-p", "tsconfig.json"];
		const child = await main(args);

		expect(mockedSpawnProcessSync).toHaveBeenCalledTimes(1);
		expect(child).toStrictEqual(result);
	});

	it("should try to create a daemon when a temp file is created on Windows", async () => {
		const mockedChild = createMockedChild();

		Object.defineProperties(process, {
			platform: {
				value: "win32",
			},
		});

		jest.spyOn(childProcess, "spawn").mockReturnValue(mockedChild);

		jest.spyOn(utils, "runTsc").mockResolvedValue({ pid: 1, exitCode: 0, stderr: "", stdout: "" });

		jest.spyOn(Math, "random").mockReturnValue(0.4242424242424242);

		await main`--noEmit ${getFixtureFile("success1.ts")}`;

		expect(process.platform).toBe("win32");
		expect(spawn).toHaveBeenCalledTimes(1);

		expect(spawn).toHaveBeenCalledWith(
			process.argv[0],
			[
				path.relative(process.cwd(), path.join(__dirname, "../../dist/intermediate.js")),
				process.pid.toString(),
				"tmp-tsconfig-f9tgd39tgd.json",
			],
			{
				detached: true,
				stdio: "ignore",
			},
		);
		expect(mockedChild.unref).toHaveBeenCalledTimes(1);
		expect(utils.runTsc).toHaveBeenCalledTimes(1);
	});
});

describe("main - signals", () => {
	const testCases = [
		{ signal: "SIGINT", exitCode: 130 },
		{ signal: "SIGHUP", exitCode: 129 },
		{ signal: "SIGTERM", exitCode: 143 },
	] as const;

	beforeAll(() => {
		for (const item of testCases) {
			process.removeAllListeners(item.signal);
		}
		const tmpTsconfig = "tmp-tsconfig-abcdef123456.json";

		utils.registerCleanup(process, tmpTsconfig);
	});

	test.each(testCases)("should receive signal on linux-based OS - $signal", async ({ signal, exitCode }) => {
		Object.defineProperties(process, {
			platform: {
				value: "linux",
			},
		});

		// @ts-expect-error mimic signal
		jest.spyOn(utils, "runTsc").mockImplementation(() => {
			process.emit(signal);
		});
		// @ts-expect-error  Type 'void' is not assignable to type 'never'.
		const mockedExit = jest.spyOn(process, "exit").mockImplementation(() => {});
		const mockedLog = jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(utils, "registerCleanup").mockImplementation(() => {});

		const args = ["-p", "tsconfig.json", getFixtureFile("fail1.ts")];
		await main(args);

		expect(fs.unlinkSync).toHaveBeenCalledTimes(0);
		expect(mockedExit).toHaveBeenCalledTimes(1);
		expect(mockedExit).toHaveBeenCalledWith(exitCode);
		expect(mockedLog).toHaveBeenCalledTimes(1);
		expect(mockedLog).toHaveBeenCalledWith(`received signal: ${signal}`);
	});
});
