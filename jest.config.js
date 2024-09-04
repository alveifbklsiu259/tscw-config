/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
	testEnvironment: "node",
	transform: {
		"^.+.tsx?$": ["ts-jest", {}],
	},
	testMatch: ["**/test/**/?(*.)+(spec|test).[jt]s?(x)", "!**/fixtures/**"],
	coveragePathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/", "<rootDir>/test/"],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: -10,
		},
	},
};
