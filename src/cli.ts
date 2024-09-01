#!/usr/bin/env node
import { exit } from "process";
import main from "./index";

const args = process.argv.slice(2);

const child = main(args);

if (child.status !== 0 && child.stderr) {
    console.error(child.stderr);
}

exit(child.status);
