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
			console.log(child.stderr);
		}

		exit(child.exitCode);
	} catch (e) {
		console.error(e);
		exit(1);
	}
})();
