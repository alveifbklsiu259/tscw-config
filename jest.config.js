/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: "node",
    transform: {
        "^.+.tsx?$": ["ts-jest", {}],
    },
    testMatch: ["**/test/**/?(*.)+(spec|test).[jt]s?(x)", "!**/fixtures/**"],
};
