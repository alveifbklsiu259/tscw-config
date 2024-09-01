import fs from "fs";
import { exit } from "process";
import { isRunning } from "./lib/util";

const parentPid = parseInt(process.argv[2], 10);
const tmpTsconfig = process.argv[3];

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
