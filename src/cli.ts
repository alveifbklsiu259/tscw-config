#!/usr/bin/env node
import fs from "node:fs";
import { exec } from "child_process";
import path from "node:path";

const toPosixPath = (p: string) => p.split(path.win32.sep).join(path.posix.sep);
const args = process.argv
    .slice(2)
    .map((arg) => toPosixPath(arg))
    .join(" ");

const script = path.join(__dirname, "../src/scripts/tsc_with_config.sh");
const relativePathToScript = toPosixPath(path.relative(process.cwd(), script));

const child = exec(
    `bash ${relativePathToScript} ${args}`,
    (error, stdout, stderr) => {
        if (stderr) {
            console.error(`Stderr - ${stderr}`);
            return;
        }
        if (error) {
            console.error(`Error - ${error.message}`);
            return;
        }
        console.log(stdout);
    }
);

/**
 * On Windows, where POSIX signals do not exist, the signal argument will be ignored, and the process will be killed forcefully and abruptly (similar to 'SIGKILL').
 * @see {@link https://nodejs.org/api/child_process.html#subprocesskillsignal}
 *
 * Because of this, the `trap 'rm -f -- "$tmp_file"' EXIT SIGINT SIGHUP SIGTERM` in bash script will not function well when any of the above signals is sent.
 */

const tempFileName = path.join(process.cwd(), "/tmp_ts_config_name.txt");

const signals = ["exit", "SIGINT", "SIGHUP", "SIGTERM"] as const;

for (const signal of signals) {
    process.on(signal, (exitCode) => {
        if (fs.existsSync(tempFileName)) {
            const tmpFile = fs.readFileSync(tempFileName, "utf8").trim();
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
            fs.unlinkSync(tempFileName);
        }
        if (signal !== "exit") {
            child.kill(signal);
        }
        // eslint-disable-next-line
        process.exit(exitCode);
    });
}
