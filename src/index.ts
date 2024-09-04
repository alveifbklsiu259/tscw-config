import { SpawnSyncReturns, spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
	fileExists,
	getRootDirForCurrentWorkSpace,
	getNearestTsconfig,
	spawnProcessSync,
	toArray,
	type TemplateExpression,
	processArgs,
	processJsonData,
} from "./lib/util";

type SpawnSyncReturnsLike =
	| SpawnSyncReturns<Buffer>
	| {
			status: number;
			stderr: string;
			stdout: null;
	  };

function main(strings: TemplateStringsArray, ...values: TemplateExpression): SpawnSyncReturnsLike;
function main(strings: string[], ...values: never[]): SpawnSyncReturnsLike;
function main(strings: TemplateStringsArray | string[], ...values: TemplateExpression | never[]): SpawnSyncReturnsLike {
	let args: string[];

	if (Array.isArray(strings) && "raw" in strings) {
		args = toArray(strings as TemplateStringsArray, ...(values as TemplateExpression));
	} else {
		args = strings as string[];
	}

	const rootDirForCurrentWorkSpace = getRootDirForCurrentWorkSpace();

	if (!rootDirForCurrentWorkSpace) {
		return {
			status: 1,
			stderr: "Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
			stdout: null,
		};
	}

	const isPnp = fileExists(path.join(rootDirForCurrentWorkSpace, ".pnp.cjs")) || !!process.versions.pnp;

	const { indexOfProjectFlag, remainingCliOptions, files, error } = processArgs(args);

	if (error) {
		return error;
	}

	let child: SpawnSyncReturns<Buffer>;

	if (files.length === 0) {
		child = spawnProcessSync(args, rootDirForCurrentWorkSpace, isPnp);
		return child;
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
		let didCleanup = false;
		for (const signal of ["exit", "SIGHUP", "SIGINT", "SIGTERM"] as const) {
			process.on(signal, () => {
				if (!didCleanup) {
					didCleanup = true;
					fs.unlinkSync(tmpTsconfig);
				}

				if (signal !== "exit") {
					let exitCode: number;
					switch (signal) {
						case "SIGHUP":
							exitCode = 129;
							break;
						case "SIGINT":
							exitCode = 130;
							break;
						case "SIGTERM":
							exitCode = 143;
							break;
					}
					return {
						status: exitCode,
						stderr: `Received signal: ${signal}`,
						stdout: null,
					};
				}
			});
		}

		const rawData = fs.readFileSync(tsconfig, "utf-8");

		const relativeFiles = files.map(file =>
			// allow user to run the binary regardless of the current working directory
			path.relative(path.dirname(tmpTsconfig), file),
		);

		const jsonData = processJsonData(rawData, relativeFiles);

		// https://nodejs.org/api/process.html#signal-events
		// On Windows, when a process is terminated by `process.kill` or `subProcess.kill`, signal will not be caught.
		if (process.platform === "win32") {
			// Create a daemon by double-forking.
			const intermediate = spawn(
				process.argv[0],
				[
					path.relative(process.cwd(), path.join(__dirname, "intermediate.js")),
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

		child = spawnProcessSync(["-p", tmpTsconfig, ...remainingCliOptions], rootDirForCurrentWorkSpace, isPnp);
		return child;
	}

	return {
		status: 1,
		stderr: tsconfig
			? `Can't find ${tsconfig}`
			: indexOfProjectFlag === -1
				? "Can't find tsconfig.json"
				: `Missing argument for ${args[indexOfProjectFlag]}`,
		stdout: null,
	};
}

export = main;
