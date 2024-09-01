import { spawn } from "child_process";
import { exit } from "process";
import path from "path";

const parentPid = parseInt(process.argv[2], 10).toString();
const tmpTsconfig = process.argv[3];

const sub = spawn(
    process.argv[0],
    [
        path.relative(process.cwd(), path.join(__dirname, "cleanupMonitor.js")),
        parentPid,
        tmpTsconfig,
    ],
    {
        detached: true,
        stdio: "ignore",
    }
);

sub.unref();
exit(0);
