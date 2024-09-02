#!/usr/bin/env bash

tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$tmp_dir"' EXIT

json_schema=$(mktemp "$tmp_dir/XXXXXX")
out_file="@types/eslintClassicConfig.d.ts"

curl https://json.schemastore.org/eslintrc > "$json_schema"

install_json_to_ts() {
  if [ -f "package-lock.json" ]; then
    npm i -D json-schema-to-typescript
  elif [ -f "yarn.lock" ]; then
    yarn add -D json-schema-to-typescript
  else
    pnpm add -D json-schema-to-typescript
  fi
}

json_to_ts() {
  npx json2ts -i "$json_schema" -o "$out_file"
}

json_to_ts || (install_json_to_ts && json_to_ts)

sed -i '/export type Rule = number /i \
\
/**\
 * The numeric severity level for a rule.\
 *\
 * - `0` means off.\
 * - `1` means warn.\
 * - `2` means error.\
 *\
 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)\
 */\
\
type Severity = 0 | 1 | 2;\
\
/**\
 * The human readable severity level for a rule.\
 *\
 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)\
 */\
\
type StringSeverity = "off" | "warn" | "error";\
\
 /**\
 * The numeric or human readable severity level for a rule.\
 *\
 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)\
 */\
\
export type RuleLevel = Severity | StringSeverity;\
' "$out_file"

perl -i -0777 -pe 's/number\s*\|\s*\("off"\s*\|\s*"warn"\s*\|\s*"error"\)\s*\|\s*unknown\s*\[\]/Rule/gs' "$out_file"

perl -i -0777 -pe 's/number\s*\|\s*\("off"\s*\|\s*"warn"\s*\|\s*"error"\)/RuleLevel/gs' "$out_file"

perl -i -pe 's/export type Rule = Rule/export type Rule = RuleLevel | unknown[]/' "$out_file"
