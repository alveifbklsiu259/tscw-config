import { jest } from "@jest/globals";
import { ChildProcess, spawnSync } from "child_process";
import path from "path";
import { EventEmitter, Readable } from "stream";
import { type TemplateExpression, toArray } from "../../src/lib/util";

export const delay = (ms: number) =>
	new Promise(res =>
		setTimeout(() => {
			res("success");
		}, ms),
	);

export const getFixtureFile = (file: string) => path.join(__dirname, "../fixtures", file);

export const cliSync = (strings: TemplateStringsArray, ...values: TemplateExpression) => {
	const cliOptionsArr = toArray(strings, ...values);
	return spawnSync("node", [path.join(__dirname, "../../dist/cli.js"), ...cliOptionsArr], {
		stdio: "pipe",
	});
};

export const createMockedChild = () => {
	const child = new EventEmitter() as ChildProcess & {
		stderr: Readable;
		stdout: Readable;
	};
	child.stderr = new EventEmitter() as Readable;
	child.stdout = new EventEmitter() as Readable;
	child.unref = jest.fn();
	return child;
};
