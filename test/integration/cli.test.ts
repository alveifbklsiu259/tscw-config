import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { exit } from "process";
import main from "../../src";

jest.mock("process", () => {
	const originalProcess = jest.requireActual<NodeJS.Process>("process");
	return {
		...originalProcess,
		exit: jest.fn(),
	};
});

jest.mock("../../src", () => ({
	__esModule: true,
	default: jest.fn(),
}));

afterEach(() => {
	jest.resetAllMocks();
	jest.restoreAllMocks();
	jest.resetModules();
});

describe("CLI - integration", () => {
	it("should call main, log stderr then exit", async () => {
		const result = { pid: null, exitCode: 1, stderr: "Missing argument for -p", stdout: null };
		jest.spyOn(console, "log").mockImplementation(() => {});

		(main as jest.Mocked<typeof main>).mockResolvedValue(result);

		/* eslint-disable-next-line */
		await require("../../src/cli");

		expect(main).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledWith(result.stderr);

		expect(exit).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(result.exitCode);
	});

	it("should call main, log stdout then exit", async () => {
		/* eslint-disable-next-line */
		const { exit } = require("process");
		/* eslint-disable-next-line */
		const mockedMain = require("../../src").default as jest.Mocked<typeof main>;

		const result = {
			pid: 42,
			exitCode: 2,
			stderr: "",
			stdout: "'string' is not assignable to type 'number'",
		};
		jest.spyOn(console, "log").mockImplementation(() => {});

		mockedMain.mockResolvedValue(result);

		/* eslint-disable-next-line */
		await require("../../src/cli");

		expect(mockedMain).toHaveBeenCalledTimes(1);

		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledWith(result.stdout.toString());

		expect(exit).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(result.exitCode);
	});

	it("should log the error and exit with 1 when fail to spawn", async () => {
		/* eslint-disable-next-line */
		const { exit } = require("process");
		/* eslint-disable-next-line */
		const mockedMain = require("../../src").default as jest.Mocked<typeof main>;

		const error = { errno: -4058, code: "ENOENT" };

		mockedMain.mockRejectedValue(error);

		jest.spyOn(console, "error").mockImplementation(() => {});

		/* eslint-disable-next-line */
		await require("../../src/cli");

		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith(error);
		expect(exit).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(1);
	});
});
