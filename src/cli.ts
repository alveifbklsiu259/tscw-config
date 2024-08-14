#!/usr/bin/env node
import { spawnSync, SpawnSyncReturns } from "child_process";
import fs from "fs";
import path from "path";
import { exit } from "process";

const resolveFromModule = (moduleName: string, ...paths: string[]) => {
    const modulePath = path.dirname(
        require.resolve(`${moduleName}/package.json`)
    );
    return path.join(modulePath, ...paths);
};

const fileExists = (...paths: string[]) => fs.existsSync(path.join(...paths));

const getRootDirForCurrentWorkSpace = () => {
    let dir = process.cwd();

    while (dir.split(path.sep).length > 2) {
        if (fileExists(dir, "package.json")) {
            return dir;
        }
        dir = path.dirname(dir);
    }

    // This dir hasn't been searched yet
    if (fileExists(dir, "package.json")) {
        return dir;
    }
    return null;
};

let rootDirForCurrentWorkSpace = getRootDirForCurrentWorkSpace();

if (!rootDirForCurrentWorkSpace) {
    console.error(
        "Error: Missing package.json file.\nPlease ensure that your project directory contains a package.json file to manage dependencies and configurations."
    );
    exit(1);
}

const getNearestTsconfig = () => {
    let dir = process.cwd();

    while (dir !== rootDirForCurrentWorkSpace) {
        if (fileExists(dir, "tsconfig.json")) {
            return path.relative(
                process.cwd(),
                path.join(dir, "tsconfig.json")
            );
        }
        dir = path.dirname(dir);
    }

    // Check again when dir === rootDirForCurrentWorkSpace
    if (fileExists(dir, "tsconfig.json")) {
        return path.relative(process.cwd(), path.join(dir, "tsconfig.json"));
    }

    return null;
};

const args = process.argv.slice(2);

let indexOfProjectFlag = -1;
const remainingCliOptions: string[] = [];
const files: string[] = [];

let skipNext = false;

for (const [idx, arg] of args.entries()) {
    if (skipNext) {
        skipNext = false;
        continue;
    }

    if (arg.toLowerCase() === "-p" || arg.toLowerCase() === "-project") {
        indexOfProjectFlag = idx;
        const tsconfig = args[idx + 1];
        if (!tsconfig) {
            console.error(`Missing argument for ${arg}`);
            exit(1);
        }
        skipNext = true;
    } else if (arg.toLowerCase() === "--excludefiles") {
        remainingCliOptions.push(arg);

        const excludeFilesArg = args[idx + 1];
        if (!excludeFilesArg) {
            console.error(`Missing argument for ${arg}`);
            exit(1);
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

const spawnProcessSync = (args: string[]) => {
    return spawnSync(
        process.versions.pnp
            ? "tsc"
            : resolveFromModule(
                  "typescript",
                  `../.bin/tsc${process.platform === "win32" ? ".cmd" : ""}`
              ),
        args,
        { stdio: "inherit" }
    );
};

let child: SpawnSyncReturns<Buffer>;

if (files.length === 0) {
    child = spawnProcessSync(remainingCliOptions);
    exit(child.status);
}

const tsconfig: string | null =
    indexOfProjectFlag === -1
        ? getNearestTsconfig()
        : args[indexOfProjectFlag + 1];

if (tsconfig && fileExists(process.cwd(), tsconfig)) {
    const tmpTsconfig = path.relative(
        process.cwd(),
        path.join(
            path.dirname(tsconfig),
            `tmp-tsconfig-${Math.random().toString(36).slice(2)}.json`
        )
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
                exit(exitCode);
            }
        });
    }

    let rawData = fs.readFileSync(tsconfig, "utf-8");

    // Remove single-line comments
    rawData = rawData.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments but respect "/**/*" and "/**/." which are used as globs.
    rawData = rawData.replace(/\/\*[\s\S]*?\*\/(?!\*|\.)/g, "");

    // Remove trailing comma
    rawData = rawData.replace(/,\s*([\]}])/g, '$1');

    const jsonData = JSON.parse(rawData) as Record<string, unknown>;

    // Overwrite "files" field
    jsonData.files = files.map((file) =>
        // allow user to run the binary regardless of the current working directory
        path.relative(path.dirname(tmpTsconfig), file)
    );

    // Remove "include" field
    delete jsonData.include;
    fs.writeFileSync(tmpTsconfig, JSON.stringify(jsonData, null, 2));

    child = spawnProcessSync(["-p", tmpTsconfig, ...remainingCliOptions]);
    exit(child.status);
}

console.error(
    tsconfig
        ? `Can't find ${tsconfig}`
        : indexOfProjectFlag === -1
        ? "Can't find tsconfig.json"
        : `Missing argument for ${args[indexOfProjectFlag]}`
);
exit(1);
