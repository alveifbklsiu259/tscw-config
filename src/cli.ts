#!/usr/bin/env node
import { exit } from "process";
import main from "./index";

void (async () => {
	const args = process.argv.slice(2);

	try {
		const child = await main(args);

		if (child.stdout) {
			console.log(child.stdout);
		} else {
			console.error(child.stderr);
		}

		exit(child.exitCode);
	} catch (e) {
		console.error("Failed to execute type checking:", e);
		console.error("Received arguments:", args.join(" "));
		exit(1);
	}
})();
