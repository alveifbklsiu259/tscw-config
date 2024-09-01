import { spawnSync } from "child_process";
import path from "path";

export const delay = (ms: number) =>
	new Promise(res =>
		setTimeout(() => {
			res("success");
		}, ms),
	);

export const getFixtureFile = (file: string) => path.join(__dirname, "../fixtures", file);

export const toArray = (strings: TemplateStringsArray, ...values: unknown[]) => {
	const str = strings.reduce(
		(acc, curr, i) =>
			acc +
			curr +
			(typeof values[i] === "string" || (typeof values[i] === "number" && !isNaN(values[i])) ? values[i] : ""),
		"",
	);
	const arr = str.split(" ").filter(e => e !== "");
	return arr;
};

export const cliSync = (strings: TemplateStringsArray, ...values: unknown[]) => {
	const cliOptionsArr = toArray(strings, ...values);
	return spawnSync("node", [path.join(__dirname, "../../dist/cli.js"), ...cliOptionsArr], {
		stdio: "pipe",
	});
};
