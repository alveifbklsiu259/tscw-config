import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { exit } from "node:process";

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

export const spawnProcessSync = (args: string[], rootDirForCurrentWorkSpace: string) => {
	const child = spawnSync(
		process.versions.pnp
			? "tsc"
			: path.join(
					rootDirForCurrentWorkSpace,
					`/node_modules/.bin/tsc${
						// Windows is case-insensitive about file extension.
						process.platform === "win32" ? ".cmd" : ""
					}`,
				),
		args,
		{ stdio: "inherit" },
	);
	if (child.error) {
		console.error(child.error);
		exit(1);
	}
	return child;
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
