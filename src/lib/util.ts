import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const fileExists = (...paths: string[]) => fs.existsSync(path.join(...paths));

export const getRootDirForCurrentWorkSpace = () => {
	let dir = process.cwd();

	while (dir !== path.parse(dir).root) {
		if (fileExists(dir, "package.json")) {
			return dir;
		}
		dir = path.dirname(dir);
	}

	return null;
};

export const processArgs = (args: string[]) => {
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
					error: {
						pid: null,
						exitCode: 1,
						stderr: `Missing argument for ${arg}`,
						stdout: null,
					},
				};
			}
			skipNext = true;
		} else if (arg.toLowerCase() === "--excludefiles") {
			remainingCliOptions.push(arg);

			const excludeFilesArg = args[idx + 1];
			if (!excludeFilesArg) {
				return {
					error: {
						pid: null,
						exitCode: 1,
						stderr: `Missing argument for ${arg}`,
						stdout: null,
					},
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

	return { indexOfProjectFlag, remainingCliOptions, files, error: null };
};

export const getNearestTsconfig = (rootDirForCurrentWorkSpace: string) => {
	let dir = process.cwd();

	while (dir !== rootDirForCurrentWorkSpace) {
		if (fileExists(dir, "tsconfig.json")) {
			return path.relative(process.cwd(), path.join(dir, "tsconfig.json"));
		}
		dir = path.dirname(dir);
	}

	// Check again when dir === rootDirForCurrentWorkSpace
	if (fileExists(dir, "tsconfig.json")) {
		return path.relative(process.cwd(), path.join(dir, "tsconfig.json"));
	}

	return null;
};

export interface SpawnResult {
	pid: number;
	exitCode: number;
	stdout: string;
	stderr: string;
}

export const runTsc = async (
	args: string[],
	rootDirForCurrentWorkSpace: string,
	isPnp: boolean,
): Promise<SpawnResult> => {
	return new Promise((res, rej) => {
		const child = isPnp
			? spawn(`yarn tsc ${args.join(" ")}`, {
					stdio: "pipe",
					shell: true,
				})
			: spawn(
					path.join(
						rootDirForCurrentWorkSpace,
						`/node_modules/.bin/tsc${
							// Windows is case-insensitive about file extension.
							process.platform === "win32" ? ".cmd" : ""
						}`,
					),
					args,
					{ stdio: "pipe" },
				);

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data: Buffer) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("exit", exitCode => {
			res({
				pid: child.pid!,
				exitCode: exitCode!,
				stdout,
				stderr,
			});
		});

		child.on("error", e => {
			rej(e);
		});
	});
};

export const processJsonData = (rawData: string, files: string[]) => {
	// Remove single-line comments
	rawData = rawData.replace(/\/\/.*$/gm, "");

	// Remove multi-line comments but respect "/**/*" and "/**/." which are used as globs.
	rawData = rawData.replace(/\/\*[\s\S]*?\*\/(?!\*|\.)/g, "");

	// Remove trailing comma
	rawData = rawData.replace(/,\s*([\]}])/g, "$1");

	const jsonData = JSON.parse(rawData) as Record<string, unknown>;

	// Overwrite "files" field
	jsonData.files = files;

	// Remove "include" field
	delete jsonData.include;

	return jsonData;
};

export const isRunning = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (e) {
		if (e instanceof Error && "code" in e) {
			return e.code === "EPERM";
		}
		return false;
	}
};

export type TemplateExpression = (string | number)[];

export const toArray = (strings: TemplateStringsArray, ...values: TemplateExpression) => {
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

export const registerCleanup = (process: NodeJS.Process, tmpTsconfig: string) => {
	for (const signal of ["exit", "SIGHUP", "SIGINT", "SIGTERM"] as const) {
		process.on(signal, () => {
			if (fileExists(tmpTsconfig)) {
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
				console.log(`received signal: ${signal}`);
				process.exit(exitCode);
			}
		});
	}
};
