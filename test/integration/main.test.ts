import { describe, expect, it, jest, afterEach } from "@jest/globals";
import { type SpawnSyncReturns } from "child_process";
import main from "../../src";
import * as utils from "../../src/lib/util";

const originalPlatform = process.platform;

afterEach(() => {
	jest.restoreAllMocks();
	Object.defineProperties(process, {
		platform: {
			value: originalPlatform,
		},
	});
});

describe("CLI integration", () => {
	it("should return error when processArg returns an error", () => {
		const error = {
			pid: null,
			status: 1,
			stderr: `Missing argument for -p`,
			stdout: null,
		};
		const mockedProcessArgs = jest.spyOn(utils, "processArgs").mockReturnValue({
			error,
		});
		const args = ["test.ts", "-p"];

		const result = main(args);
		expect(mockedProcessArgs).toHaveBeenCalledTimes(1);
		expect(mockedProcessArgs).toHaveBeenCalledWith(args);
		expect(result).toStrictEqual(error);
	});

	it("should still spawn a child process if no files are specified", () => {
		const result = {
			pid: 42,
			status: 0,
		};
		const mockedSpawnProcessSync = jest
			.spyOn(utils, "spawnProcessSync")
			.mockReturnValue(result as SpawnSyncReturns<Buffer>);

		const args = ["-p", "tsconfig.json"];
		const child = main(args);

		expect(mockedSpawnProcessSync).toHaveBeenCalledTimes(1);
		expect(child).toStrictEqual(result);
	});
});
