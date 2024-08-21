import fs from "fs";
import { exit } from "process";

const parentPid = parseInt(process.argv[2], 10);
const tmpTsconfig = process.argv[3];

const isRunning = (pid: number) => {
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

// Check every second if the parent process is still running
setInterval(() => {
    if (!isRunning(parentPid)) {
        if (fs.existsSync(tmpTsconfig)) {
            fs.unlinkSync(tmpTsconfig);
        }
        exit(0);
    }
}, 1000);

// Ensure the process exits after 1 minute
setTimeout(() => {
    exit(0);
}, 60000);
