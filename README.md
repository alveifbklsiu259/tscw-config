<h1 align="center">tscw-config</h1>

<p align="center"><b>Run <code>tsc</code> on files with tsconfig respected</b></p>

<p align="center">
   <a href="https://www.npmjs.com/package/tscw-config"><img src="https://img.shields.io/npm/v/tscw-config" alt="NPM version" /></a>
   <a href="https://codecov.io/gh/alveifbklsiu259/tscw-config" ><img src="https://codecov.io/gh/alveifbklsiu259/tscw-config/graph/badge.svg?token=RDNCXAXZGF" alt="codecov"/></a>
   <a href="https://github.com/jestjs/jest" ><img src="https://jestjs.io/img/jest-badge.svg" alt="jest"/></a>
   <a href="https://actions-badge.atrox.dev/alveifbklsiu259/tscw-config/goto?ref=main"><img alt="GitHub actions" src="https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Falveifbklsiu259%2Ftscw-config%2Fbadge%3Fref%3Dmain" /></a>
   <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?logo=semantic-release" alt="semantic-release: conventionalcommits"/></a>
   <a href="https://npmcharts.com/compare/tscw-config?minimal=true"><img src="https://img.shields.io/npm/dm/tscw-config.svg" alt="NPM downloads"/></a>
   <a href="https://github.com/alveifbklsiu259/tscw-config/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/tscw-config" alt="GitHub license"/></a>
</p>

## Motivation

> Running tsc locally will compile the closest project defined by a `tsconfig.json`, or you can compile a set of TypeScript files by passing in a glob of files you want. **When input files are specified on the command line, tsconfig.json files are ignored**. - [tsc CLI Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

`tscw-config` lets you run `tsc` on files while keeping `tsconfig.json` respected.

> [!NOTE]  
> `tscw-config` stands for **tsc with config**.

## Use cases

A common use case for running `tsc` on certain files is when used in a pre-commit hook. e.g. [lint-staged](https://github.com/lint-staged/lint-staged), [pre-commit](https://pre-commit.com/).

For example, you may want to type-check staged files by running `tsc --noEmit foo.ts bar.ts`. In this case `tsc` will ignore the `tsconfig.json`, using `-p tsconfig.json` with files will result in an error.

You can explicitly pass the CLI options in. e.g. `--strict --allowSyntheticDefaultImports ...` to `tsc`, but that can be tedious.

Using `tscw` is much easier: `tscw --noEmit foo.ts bar.ts -p tsconfig.json`.

> [!IMPORTANT]
>
> - There're cases that declaration files need to be included even though you just want to type-check some files, you can specify the declaration directory with `--includeDeclarationDir`, for example: `npx tscw --noEmit foo.ts --includeDeclarationDir @types`, it will include all the files that end with `.d.ts` in `@types` and any sub-directories. If you need more fine-grained control, see [Include declaration files](#include-declaration-files).
> - `tscw` can be used with [pre-commit](https://pre-commit.com/), see [Recipes](#recipes).

## Getting Started

`tscw` seamlessly integrates with most popular package managers, including:

- npm
- pnpm
- Yarn
- Yarn (Plug’n’Play)

npm:

```sh
npm i -D tscw-config
```

pnpm:

```sh
pnpm add -D tscw-config
```

yarn:

```sh
yarn add -D tscw-config
```

## Usage

After installing `tscw-config`, you can use `tscw` the same way you use `tsc`, but `tscw` will not ignore your `tsconfig.json` when files are specified.

By default, `tscw` uses the root `tsconfig.json` if no one is specified.

```sh
# root tsconfig.json is used
npx tscw foo.ts

# specify a tsconfig
npx tscw --noEmit foo.ts -p ./config/tsconfig.json
# or
npx tscw --noEmit foo.ts --project ./config/tsconfig.json

# match ./foo.ts, ./bar.ts ...
npx tscw *.ts

# match ./foo/baz.ts, ./bar/foo.ts ...
npx tscw **/*.ts

# include declaration files directory, by default, it recursively searches for files that end with .d.ts in the specified directory
npx tscw --noEmit --includeDeclarationDir ./@types

# you can even use it without any files specified
npx tscw --noEmit # it is the same as npx tsc --noEmit
```

Here's an example of using it in a `.lintstagedrc.js` file. You can also check out the [.lintstagedrc.mjs in this project](/.lintstagedrc.mjs).

```js
/**
 * Passing absolute path is fine, but relative path is cleaner in console.
 * @param {string[]} files
 */
const typeCheck = files => {
  const cwd = process.cwd();
  const relativePaths = files.map(file => path.relative(cwd, file)).join(" ");
  // if you need to include declaration files, use --includeDeclarationDir path-to-declaration-dir
  return `npx tscw --noEmit ${relativePaths} --includeDeclarationDir @types`;
};

export default {
  "**/*.{ts,mts,cts,tsx}": [prettier, typeCheck, eslint],
};
```

if your're using yarn PnP, instead of using `npx tscw`, use `yarn tscw`:

```sh
yarn tscw foo.ts
```

> [!NOTE]  
> `tscw` supports all [CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html) supported by `tsc`. Other than that, you can use `--includeDeclarationDir` to include declaration files.

### API

`tscw-config` also exposes a function to run `tsc` programmatically, but in most cases you should use the CLI `tscw`:

```ts
import tscw from 'tscw-config';

const result = await tscw`foo.ts --noEmit -p tsconfig.json`
// or
const result = await tscw("foo.ts", "--noEmit", "-p", "tsconfig.json");
```

#### Return type

```ts
type Result = Promise<SpawnResult | SpawnError>;

interface SpawnResult {
  pid: number;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface SpawnError {
  pid: null;
  exitCode: number;
  stderr: string;
  stdout: null;
}
```

In the following scenarios, the function returns `Promise<SpawnError>`:

- No `package.json` is found in the root of your project.
- No `tsconfig.json` is found in the root of your project if no tsconfig is passed to the function.
- Specified files not found.
- Missing argument for `-p` or `--project`.

```ts
import tscw from "tscw-config";

const result = await tscw`foo.ts --noEmit -p noSuchFile.json`;

/* 
result: {
      pid: null,
      exitCode: 1,
      stderr: "Can't find noSuchFile.json",
      stdout: null,
   };
*/
```

Otherwise the function returns `Promise<SpawnResult>`, which means that the args are successfully passed to `tsc`.

Under the hood, `tscw` uses `spawn` to run `tsc`, the result from `tsc` is stored in `result.stdout` even when exitCode is not `0`.

```ts
// containTypeError.ts

type A = number;

const _a: A = "";
```

```ts
import tscw from "tscw-config";

const result1 = await tscw`containTypeError.ts --noEmit -p tsconfig.json --pretty false`;

console.log(result1.pid); // number
console.log(result1.exitCode); // 1
console.log(result1.stdout); // "containTypeError.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.\r\n"
console.log(result1.stderr); // ""

const result2 = await tscw`noTypeError.ts --noEmit -p tsconfig.json`;

console.log(result2.pid); // number
console.log(result2.exitCode); // 0
console.log(result2.stdout); // ""
console.log(result2.stderr); // ""
```

> [!NOTE]  
> By default, `stdout` contains [ANSI escape code](https://en.wikipedia.org/wiki/ANSI_escape_code), if you want `stdout` to be plain text, pass `--pretty false` to the function.
>
> ```ts
> /* 
> "\x1B[96mcontainTypeError.ts\x1B[0m:\x1B[93m3\x1B[0m:\x1B[93m7\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS2322: \x1B[0mType 'string' is not assignable to type 'number'.\r\n" +
>     '\r\n' +
>     '\x1B[7m3\x1B[0m const _a: A = "";\r\n' +
>     '\x1B[7m \x1B[0m \x1B[91m      ~~\x1B[0m\r\n' +
>     '\r\n' +
>     '\r\n' +
>     'Found 1 error in containTypeError.ts\x1B[90m:3\x1B[0m\r\n' +
>     '\r\n'
>  */
> ```
>
> Notice that when you pass a file to the function using a relative path, it is relative to the current working directory (cwd) when you run the script, **not relative to the file where this function is used**.

> [!IMPORTANT]  
> In most cases, you should use the CLI `tscw` when you want the process to fail if the compilation fails. For example in CI pipeline, [lint-staged](https://github.com/lint-staged/lint-staged), etc. Executing the function will not cause the process to fail even if the returned `exitCode` is not `0`, unless you explicitly exit the process with the returned `exitCode`, like [`tscw`](/src/cli.ts) does.

## How it works

1. Argument Parsing:
   - The script processes user-specified arguments to handle flags and file paths.
2. Finding `tsconfig.json`:
   - If no `tsconfig.json` file is specified via the `-p` or `--project` flag, the nearest `tsconfig.json` file will be used for the current workspace.
   - The script first looks for the current working directory, if not found, it goes all the way up until the level where `package.json` is located.
3. Temporary File:
   - A temporary file is created to store the content of the `tsconfig.json` file being used.
   - It adds/replaces the `"files"` field with the files specified.
   - It empties the `"include"` field.
4. Running `tsc`:
   - It runs `tsc` with the temp file and any specified flags.
5. Cleanup:
   - The script removes the temporary file when the script exits or receives certain signals(SIGINT, SIGHUP, SIGTERM).

> [!NOTE]  
> Windows has limited support for process signals compared to Unix-like systems, especially when `process.kill` is used to terminate a process, signal will not be caught by the process, therefore cleaning up the temp file is a problem. See [Signal events](https://nodejs.org/api/process.html#signal-events).
>
> Technically, to fix the cleanup problem, using [`options.detached`](https://nodejs.org/api/child_process.html#optionsdetached) for a child process would be enough, but [lint-staged](https://github.com/lint-staged/lint-staged) takes the approach of [terminating all the child processes by calling `process.kill`](https://github.com/lint-staged/lint-staged/blob/master/lib/resolveTaskFn.js#L55) on the tasks that are `KILLED`(When multiple tasks are running concurrently, if one task `FAILED`, other tasks will be `KILLED`).
>
> In order to properly fix this problem, `tscw-config` creates a [daemon](<https://en.wikipedia.org/wiki/Daemon_(computing)>) to handle the cleanup task if it is running on Windows. The daemon will exit gracefully after the temporary file is deleted or, at most, after 1 minute.

## Recipes

### lintstaged

Check out the [.lintstagedrc.mjs in this project](/.lintstagedrc.mjs).

### pre-commit

You can write a local hook with the `tscw` API, it's pretty simple:

`pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: type-checking
        name: Check Type
        entry: ./check-type.js
        args: ["--noEmit"]
        language: node
        types_or: [ts, tsx]
```

`check-type.js`

Note: Remember to make it an executable: `chmod +x check-type.js`

```js
#!/usr/bin/env node
const { exit } = require("process");
const { join } = require("node:path");
const { readdirSync } = require("node:fs");
const tscw = require("tscw-config");

/**
 * @param {string} dir
 * @param {RegExp} regex
 *
 * @returns {string[]}
 */
const getFilesRecursivelySync = (dir, regex) => {
  const files = readdirSync(dir, { withFileTypes: true });
  /** @type {string[]} */
  let result = [];

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      result = result.concat(getFilesRecursivelySync(fullPath, regex));
    } else if (regex.test(file.name)) {
      result.push(fullPath);
    }
  }
  return result;
};

void (async () => {
  const args = process.argv.slice(2);

  // Include all the declaration files for the current project if needed.
  const declarationFiles = getFilesRecursivelySync(
    "./@types" /* adjust the dirname for your project */,
    /\.d\.ts$/,
  ).join(" ");

  try {
    const child = await tscw`${args.join(" ")} ${declarationFiles}`;

    // You can also use the --includeDeclarationDir flag, e.g. tscw`${args.join(" ")} --includeDeclarationDir @types`

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
```

> [!NOTE]  
> This project uses [`husky`](https://typicode.github.io/husky/) for pre-commit hooks, it seems to have some conflicts with [`pre-commit`](https://pre-commit.com/), so we currently don't provide a [`pre-commit`](https://pre-commit.com/) hook for consumption, but you can always use `tscw`'s API to write a local hook.

## Troubleshooting

### Include declaration files

Under the hood, `tscw` creates a copy of the `tsconfig.json` and removes the `include` filed. This means that all the declaration files specified it in the `include` field will not be respected when you run `tscw`.

#### Example

Consider that there're two files:

- `foo.ts`
- `foo.module.css`

```ts
// foo.ts
import styles from "./foo.module.css";

console.log(styles);
```

```sh
npx tscw --noEmit foo.ts
```

```sh
foo.ts:1:20 - error TS2307: Cannot find module './foo.module.css' or its corresponding type declarations.

1 import styles from "./foo.module.css"

Found 1 error in foo.ts:1
```

This can easily be solved by including a necessary declaration file in the `include` field of your `tsconfig.json`, but when `tscw` is run, it creates a copy of that `tsconfig.json` with the `include` field stripped out. Here're some workarounds:

#### Workarounds

##### 1. Include the declaration in the file

```ts
/// <reference path="path-to-declaration.d.ts" />
// or use import
import "path-to-declaration";
import styles from "./foo.module.css";
```

You can simply include the declaration file in the file. But this can quickly get messy if you have multiple files that need declaration file(s).

##### 2. Pass declaration files to `tscw`

You can use the `--includeDeclarationDir` flag to include your declaration files directory, `tscw` will include all the files that end with `.d.ts` in that directory and all its sub-directories

Here's an example using it in a `lintstagedrc` file, you can check out the [.lintstagedrc.mjs in this project](/.lintstagedrc.mjs).

```js
/**
 * Passing absolute path is fine, but relative path is cleaner in console.
 * @param {string[]} files
 */
const typeCheck = files => {
  const cwd = process.cwd();
  const relativePaths = files.map(file => relative(cwd, file)).join(" ");

  return `npx tscw --noEmit --includeDeclarationDir ./@types ${relativePaths}`;
};
```

If you need more fine-grained control, you can include the declaration files manually, for example:

```js
/**
 * @param {string} dir
 * @param {RegExp} regex
 *
 * @returns {string[]}
 */
const getFilesRecursivelySync = (dir, regex) => {
  const files = readdirSync(dir, { withFileTypes: true });
  /** @type {string[]} */
  let result = [];

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      result = result.concat(getFilesRecursivelySync(fullPath, regex));
    } else if (regex.test(file.name)) {
      result.push(fullPath);
    }
  }
  return result;
};

/**
 * Passing absolute path is fine, but relative path is cleaner in console.
 * @param {string[]} files
 */
const typeCheck = files => {
  const cwd = process.cwd();
  const relativePaths = files.map(file => relative(cwd, file)).join(" ");
  // Include all the declaration files for the current project.
  const declarationFiles = getFilesRecursivelySync("./@types", /\.d\.ts$/).join(" ");

  return `npx tscw --noEmit ${relativePaths} ${declarationFiles}`;
};
```
