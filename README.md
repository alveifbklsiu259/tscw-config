# tsc-with-config

`tsc-with-config` is a CLI tool that lets you run `tsc` with files and `tsconfig.json`, which is not allowed by the original `tsc` command.

> Running tsc locally will compile the closest project defined by a `tsconfig.json`, or you can compile a set of TypeScript files by passing in a glob of files you want. **When input files are specified on the command line, tsconfig.json files are ignored**. [tsc CLI Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

## Installation

```sh
npm i -D tsc-with-config
```

or

```sh
pnpm add -D tsc-with-config
```

or

```sh
yarn add -D tsc-with-config
```

## Usage

`tsc-with-config` exposes a binary `tscw`.

```sh
npx tscw foo.ts
```

or

```sh
npx tscw *.ts # match ./foo.ts, ./bar.ts ...
```

or

```sh
npx tscw **/*.ts # match ./foo/baz.ts, ./bar/foo.ts ...
```

> [!NOTE]
> By default, the nearest `tsconfig.json` is used. `tscw` supports all [CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html) supported by `tsc`.

## Use case

A common use case for running `tsc` on certain files is when used in a pre-commit hook. e.g. [lint-staged](https://github.com/lint-staged/lint-staged).

For example, you may want to type-check staged files by running `tsc --noEmit foo.ts bar.ts`. In this case `tsc` will ignore the `tsconfig.json`, using `-p tsconfig.json` with files will result in an error.

You can explicitly pass the CLI options in. e.g. `--strict --allowSyntheticDefaultImports ...` to `tsc`, but that can be tedious.

Using `tscw` is much easier: `tscw --noEmit foo.ts bar.ts -p tsconfig.json`.

## How it works

1. CLI Argument Parsing:
   - The script processes command-line arguments to handle flags and file paths.
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
> In order to properly fix this problem, `tsc-with-config` creates a [daemon](<https://en.wikipedia.org/wiki/Daemon_(computing)>) to handle the cleanup task if it is run on Windows.
