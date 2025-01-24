import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
	fileExists,
	getArgArray,
	getNearestTsconfig,
	getRootDirForCurrentWorkSpace,
	processArgs,
	processJsonData,
	registerCleanup,
	runTsc,
	type SpawnResult,
	type TemplateExpression,
} from "./lib/util";

interface SpawnError {
	pid: null;
	exitCode: number;
	stderr: string;
	stdout: null;
}

type SpawnSyncReturnsLike = SpawnResult | SpawnError;

async function main(strings: TemplateStringsArray, ...values: TemplateExpression): Promise<SpawnSyncReturnsLike>;
async function main(strings: string[], ...values: never[]): Promise<SpawnSyncReturnsLike>;
async function main(
	strings: TemplateStringsArray | string[],
	...values: TemplateExpression | never[]
): Promise<SpawnSyncReturnsLike> {
	const args = getArgArray(strings, ...values);
	const rootDirForCurrentWorkSpace = getRootDirForCurrentWorkSpace();

	if (!rootDirForCurrentWorkSpace) {
		return {
			pid: null,
			exitCode: 1,
			stderr:
				"Error: Missing package.json file.\nPlease ensure that your project directory " +
				"contains a package.json file to manage dependencies and configurations.",
			stdout: null,
		};
	}

	const isPnp = fileExists(path.join(rootDirForCurrentWorkSpace, ".pnp.cjs")) || !!process.versions.pnp;

	const { indexOfProjectFlag, remainingCliOptions, files, error, declarationFiles } = processArgs(args);

	if (error) {
		return error;
	}

	if (files.length === 0) {
		const newArgs = ["--pretty", ...remainingCliOptions];
		if (indexOfProjectFlag !== -1) {
			newArgs.push("-p", args[indexOfProjectFlag + 1]);
		}

		return await runTsc(newArgs, rootDirForCurrentWorkSpace, isPnp);
	}

	const tsconfig: string | null =
		indexOfProjectFlag === -1
			? getNearestTsconfig(rootDirForCurrentWorkSpace)
			: path.relative(process.cwd(), args[indexOfProjectFlag + 1]);

	if (tsconfig && fileExists(process.cwd(), tsconfig)) {
		const tmpTsconfig = path.relative(
			process.cwd(),
			path.join(path.dirname(tsconfig), `tmp-tsconfig-${Math.random().toString(36).slice(2)}.json`),
		);

		// Attach cleanup handlers
		registerCleanup(process, tmpTsconfig);

		const rawData = fs.readFileSync(tsconfig, "utf-8");

		const relativeFiles = files.concat(declarationFiles).map(file =>
			// allow user to run the binary regardless of the current working directory
			path.relative(path.dirname(tmpTsconfig), file),
		);

		const jsonData = await processJsonData(rawData, relativeFiles);

		// https://nodejs.org/api/process.html#signal-events
		// On Windows, when a process is terminated by `process.kill` or `subProcess.kill`, signal will not be caught.
		if (process.platform === "win32") {
			// Create a daemon by double-forking.
			const intermediate = spawn(
				process.argv[0],
				[
					path.relative(process.cwd(), path.join(__dirname, "../dist/intermediate.js")),
					process.pid.toString(),
					tmpTsconfig,
				],
				{
					detached: true,
					stdio: "ignore",
				},
			);
			intermediate.unref();
		}

		fs.writeFileSync(tmpTsconfig, JSON.stringify(jsonData, null, 2));

		const child = await runTsc(
			["--pretty", "-p", tmpTsconfig, ...remainingCliOptions],
			rootDirForCurrentWorkSpace,
			isPnp,
		);

		if (fileExists(tmpTsconfig)) {
			fs.unlinkSync(tmpTsconfig);
		}
		return child;
	}

	return {
		pid: null,
		exitCode: 1,
		stderr: tsconfig
			? `Can't find ${args[indexOfProjectFlag + 1]}`
			: "Can't find tsconfig.json from the current working directory or level(s) up.",
		stdout: null,
	};
}

export = main;
