import { describe, expect, it, jest, afterEach } from "@jest/globals";
import { spawn } from "child_process";
import path from "path";
import { exit } from "process";

jest.mock("child_process", () => ({
	spawn: jest.fn(() => ({
		unref: jest.fn(),
	})),
}));

const originalArgv = process.argv;

afterEach(() => {
	jest.clearAllMocks();
	process.argv = originalArgv;
});

jest.mock("process", () => {
	const originalProcess = jest.requireActual<NodeJS.Process>("process");
	return {
		...originalProcess,
		exit: jest.fn(),
	};
});

describe("intermediate", () => {
	it("should spawn a child process then exit", () => {
		const pid = "42";
		const tmpTsconfig = "tmp-tsconfig-abcdef123456.json";

		process.argv = ["node", "", pid, tmpTsconfig];
		/* eslint-disable-next-line */
		require("../../src/intermediate");

		expect(spawn).toHaveBeenCalledTimes(1);
		expect(spawn).toHaveBeenCalledWith(
			process.argv[0],
			[path.relative(process.cwd(), path.join(__dirname, "../../dist/cleanupMonitor.js")), pid, tmpTsconfig],
			{
				detached: true,
				stdio: "ignore",
			},
		);
		expect(exit).toHaveBeenCalledTimes(1);
	});
});
