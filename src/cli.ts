#!/usr/bin/env node
import { exit } from "process";
import main from "./index";

const args = process.argv.slice(2);

const child = main(args);

if (child.stdout?.toString()) {
	console.log(child.stdout.toString());
} else {
	console.log(child.stderr.toString());
}

exit(child.status);
