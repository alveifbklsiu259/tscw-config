import { SpawnSyncReturns, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileExists, getRootDirForCurrentWorkSpace, getNearestTsconfig, spawnProcessSync } from "./lib/util";

const main = (args: string[]) => {
	const rootDirForCurrentWorkSpace = getRootDirForCurrentWorkSpace();

	if (!rootDirForCurrentWorkSpace) {
		return {
			status: 1,
			stderr: "Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations.",
			stdout: null,
		};
	}

	let indexOfProjectFlag = -1;
	const remainingCliOptions: string[] = [];
	const files: string[] = [];

	let skipNext = false;

	for (const [idx, arg] of args.entries()) {
		if (skipNext) {
			skipNext = false;
			continue;
		}

		if (arg.toLowerCase() === "-p" || arg.toLowerCase() === "--project") {
			indexOfProjectFlag = idx;
			const tsconfigArg = args[idx + 1];
			if (!tsconfigArg) {
				return {
					status: 1,
					stderr: `Missing argument for ${arg}`,
					stdout: null,
				};
			}
			skipNext = true;
		} else if (arg.toLowerCase() === "--excludefiles") {
			remainingCliOptions.push(arg);

			const excludeFilesArg = args[idx + 1];
			if (!excludeFilesArg) {
				return {
					status: 1,
					stderr: `Missing argument for ${arg}`,
					stdout: null,
				};
			}

			remainingCliOptions.push(args[idx + 1]);
			skipNext = true;
		} else if (/^-.*/.test(arg)) {
			remainingCliOptions.push(arg);
		} else if (/\.(m|c)?(t|j)sx?$/.test(arg)) {
			files.push(arg);
		} else {
			remainingCliOptions.push(arg);
		}
	}

	let child: SpawnSyncReturns<Buffer>;

	if (files.length === 0) {
		child = spawnProcessSync(args, rootDirForCurrentWorkSpace);
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

		let rawData = fs.readFileSync(tsconfig, "utf-8");

		// Remove single-line comments
		rawData = rawData.replace(/\/\/.*$/gm, "");

		// Remove multi-line comments but respect "/**/*" and "/**/." which are used as globs.
		rawData = rawData.replace(/\/\*[\s\S]*?\*\/(?!\*|\.)/g, "");

		// Remove trailing comma
		rawData = rawData.replace(/,\s*([\]}])/g, "$1");

		const jsonData = JSON.parse(rawData) as Record<string, unknown>;

		// Overwrite "files" field
		jsonData.files = files.map(file =>
			// allow user to run the binary regardless of the current working directory
			path.relative(path.dirname(tmpTsconfig), file),
		);

		// Remove "include" field
		delete jsonData.include;

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

		child = spawnProcessSync(["-p", tmpTsconfig, ...remainingCliOptions], rootDirForCurrentWorkSpace);
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
};

export default main;
