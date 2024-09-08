import { afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import { exit } from "process";
import * as utils from "../../src/lib/util";

beforeAll(() => {
	jest.useFakeTimers();
});

const originalArgv = process.argv;

afterEach(() => {
	jest.restoreAllMocks();
	jest.resetAllMocks();
	jest.resetModules();
	process.argv = originalArgv;
});

jest.mock("process", () => {
	const originalProcess = jest.requireActual<NodeJS.Process>("process");
	return {
		...originalProcess,
		exit: jest.fn(),
	};
});

jest.retryTimes(2);

describe("cleanupMonitor - integration", () => {
	it("should delete the temp file if the parent process completed and the temp file still exited", () => {
		jest.spyOn(utils, "isRunning").mockReturnValue(false);
		jest.spyOn(fs, "existsSync").mockReturnValue(true);
		const mockedUnlinkSync = jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});
		const pid = "42";
		const tmpTsconfig = "tmp-tsconfig-abcdef123456.json";

		process.argv = ["node", "", pid, tmpTsconfig];
		/* eslint-disable-next-line */
		require("../../src/cleanupMonitor");

		jest.advanceTimersByTime(1000);

		expect(mockedUnlinkSync).toHaveBeenCalledTimes(1);
		expect(mockedUnlinkSync).toHaveBeenCalledWith(tmpTsconfig);
		expect(exit).toHaveBeenCalledTimes(1);
	});

	it("should exit after 1 minute no matter what", () => {
		jest.spyOn(utils, "isRunning").mockReturnValue(true);

		const pid = "42";
		const tmpTsconfig = "tmp-tsconfig-abcdef123456.json";

		process.argv = ["node", "", pid, tmpTsconfig];
		/* eslint-disable-next-line */
		require("../../src/cleanupMonitor");

		jest.advanceTimersByTime(30000);

		expect(exit).toHaveBeenCalledTimes(0);

		jest.advanceTimersByTime(30000);
		expect(exit).toHaveBeenCalledTimes(1);
	});
});
