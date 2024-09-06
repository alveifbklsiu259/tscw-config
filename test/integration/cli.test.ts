import { describe, expect, it, jest, afterEach } from "@jest/globals";
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

describe("CLI", () => {
	it("should call main, log stderr then exit", () => {
		const result = { pid: null, status: 1, stderr: "Missing argument for -p", stdout: null };
		jest.spyOn(console, "log").mockImplementation(() => {
			/*  */
		});

		(main as jest.Mock).mockReturnValue(result);

		/* eslint-disable-next-line */
		require("../../src/cli");

		expect(main).toHaveBeenCalledTimes(1);
		expect(main).toHaveReturnedWith(result);
		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledWith(result.stderr);

		expect(exit).toHaveBeenCalledTimes(1);
	});

	it("should call main, log stderr then exits", () => {
		/* eslint-disable-next-line */
		const { exit } = require("process");
		/* eslint-disable-next-line */
		const main = require("../../src").default as jest.Mock;

		const result = {
			pid: 42,
			status: 2,
			stderr: Buffer.from(""),
			stdout: Buffer.from("'string' is not assignable to type 'number'"),
		};
		jest.spyOn(console, "log").mockImplementation(() => {
			/*  */
		});

		main.mockReturnValue(result);

		/* eslint-disable-next-line */
		require("../../src/cli");

		expect(main).toHaveBeenCalledTimes(1);
		expect(main).toHaveReturnedWith(result);
		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.log).toHaveBeenCalledWith(result.stdout.toString());

		expect(exit).toHaveBeenCalledTimes(1);
	});
});
