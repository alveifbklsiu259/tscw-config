import { spawnSync } from "child_process";
import path from "path";
import { toArray } from "../../src/lib/util";

export const delay = (ms: number) =>
	new Promise(res =>
		setTimeout(() => {
			res("success");
		}, ms),
	);

export const getFixtureFile = (file: string) => path.join(__dirname, "../fixtures", file);

export const cliSync = (strings: TemplateStringsArray, ...values: unknown[]) => {
	const cliOptionsArr = toArray(strings, ...values);
	return spawnSync("node", [path.join(__dirname, "../../dist/cli.js"), ...cliOptionsArr], {
		stdio: "pipe",
	});
};
