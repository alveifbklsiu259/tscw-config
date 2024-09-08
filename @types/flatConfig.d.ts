import type { Linter, SharedConfig, TSESLint } from "./check_modules";
import { RuleLevel, Rules } from "./eslintClassicConfig";

type NoIndexKeys<T extends object> = keyof {
	[K in keyof T as string extends K ? never : K]: K;
};

type GetObjTypeFromRule<T extends Rules[NoIndexKeys<Rules>]> = Extract<Extract<T, [RuleLevel, object]>[number], object>;

type RulesRecord = {
	[K in NoIndexKeys<Rules>]: Required<Rules>[K] extends RuleLevel | [RuleLevel, object]
		? Linter.RuleEntry<[GetObjTypeFromRule<Rules[K]>]>
		: Linter.RuleEntry;
};

/**
 * Flat configs from eslint, `Linter.RulesRecord` is for the index signature.
 *
 * For some reason, it is not compatible with `typescript-eslint`'s flat config.
 *
 * @deprecated If used with the configs from `typescript-eslint`, an error will occur, should switch to {@link TSETypedFlatConfig}
 */
type ETypedFlatConfigs = Linter.Config<RulesRecord & Linter.RulesRecord>[];

export type ClassicConfig = Linter.Config<RulesRecord & Linter.RulesRecord>;

/**
 * Flat config with `rules` typed from `typescript-eslint`.
 *
 * For some reason `typescript-eslint`'s flat config is not compatible with `eslint`'s flat config.
 *
 */
export interface TSETypedFlatConfig extends TSESLint.FlatConfig.Config {
	rules?: Partial<Record<string, SharedConfig.RuleEntry>> & Partial<RulesRecord>;
}
