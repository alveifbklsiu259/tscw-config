import { expect } from "@jest/globals";
import type { MatcherFunction } from "expect";

const toBeWithinRange: MatcherFunction<[floor: unknown, ceiling: unknown]> =
    function (actual, floor, ceiling) {
        if (
            typeof actual !== "number" ||
            typeof floor !== "number" ||
            typeof ceiling !== "number"
        ) {
            throw new TypeError("These must be of type number!");
        }

        const pass = actual >= floor && actual <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${this.utils.printReceived(
                        actual
                    )} not to be within range ${this.utils.printExpected(
                        `${floor} - ${ceiling}`
                    )}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${this.utils.printReceived(
                        actual
                    )} to be within range ${this.utils.printExpected(
                        `${floor} - ${ceiling}`
                    )}`,
                pass: false,
            };
        }
    };

expect.extend({
    toBeWithinRange,
});

declare module "expect" {
    interface AsymmetricMatchers {
        toBeWithinRange(floor: number, ceiling: number): void;
    }
    interface Matchers<R> {
        toBeWithinRange(floor: number, ceiling: number): R;
    }
}
