#!/usr/bin/env bash

# The purpose of this script to solve the problem: "When input files are specified on the command line with "tsc", tsconfig.json files are ignored."
find_nearest_ts_config() {
  local dir
  dir=$(pwd)
  while [[ "$dir" != "/" ]]; do
      if [[ -f "$dir/tsconfig.json" ]]; then
          # Output the absolute path to tsconfig.json
          printf "%s" "$(realpath "$dir/tsconfig.json")"
          return 0
      fi
      # Update the value of the dir variable to its parent directory
      dir=$(dirname "$dir")
  done
  return 1
}

ts_config=""
declare -a flags=()
declare -a files=()

# Enable case-insensitive matching
shopt -s nocasematch

while [[ "$#" -gt 0 ]]; do
  case $1 in 
    -p|--project)
      if [[ -z "$2" ]]; then
        echo "Missing argument for $1" >&2
        exit 1
      else
        if [[ -f $(realpath "$2") ]]; then
            ts_config="$(realpath "$2")"
            shift 2
        else
            echo "Can't find $(realpath "$2")" >&2
            exit 1
        fi
      fi ;;
    --excludeFiles)
      if [[ -z "$2" ]]; then
        echo "Missing argument for $1" >&2
        exit 1
      else
        IFS=',' read -r -a excludeFiles_paths <<< "$2"

        for path in "${excludeFiles_paths[@]}"; do
          if [[ ! -f $(realpath "$path") ]]; then
              echo "Can't find $(realpath "$path")" >&2
              exit 1
          fi
        done
        
        flags+=("$1" "$2")
        shift 2
      fi ;;
    # Other flags
    -*) 
      flags+=("$1")
      shift ;;
    *)
      if [[ "$1" =~ \.(ts|cts|mts|tsx|js|cjs|mjs|jsx)$ ]]; then
        # files
        if [[ -f $(realpath "$1") ]]; then
          files+=("$1")
          shift
        else
          echo "Can't find $(realpath "$1")" >&2
          exit 1
        fi
      else
        # arg for the previous flag
        flags+=("$1")
        shift
      fi ;;
  esac
done

# Disable case-insensitive matching
shopt -u nocasematch

if [ -z "$ts_config" ]; then
  ts_config=$(find_nearest_ts_config)
fi

if [ -z "$ts_config" ]; then
  echo "tsconfig.json not found" >&2
  exit 1
fi

ts_config_dir="$(realpath -s --relative-to="$(pwd)" "$(dirname "$ts_config")")"

# Create a temporary file
tmp_file=$(mktemp "$(dirname "$ts_config")"/tmp_tsconfig_XXXXXX.json)
echo "$(realpath -s --relative-to="$(pwd)" $tmp_file)" > ./tmp_ts_config_name.txt
trap 'rm -f -- "$tmp_file" ./tmp_ts_config_name.txt' EXIT SIGINT SIGHUP SIGTERM

# Copy the contents of the tsconfig.json to the temporary file
cp "$ts_config" "$tmp_file"

rawData=$(<"$tmp_file")

# Remove single-line comments (// comments)
rawData=$(echo "$rawData" | sed 's|//.*$||g')

echo "$rawData" > "$tmp_file"

if [ "${#files[@]}" -lt 1 ]; then 
  if ! grep --perl-regexp --null-data --quiet '"pretty"\s*:\s*(true|false)' "$tmp_file"; then
    flags=("--pretty" "${flags[@]}")
  fi
  npx tsc --project "$ts_config_dir/$(basename "$tmp_file")" "${flags[@]}" >&2 &

  tsc_pid=$!
  wait $tsc_pid
  exit $?
fi

relative_paths_to_ts_config=""

for file in "${files[@]}"; do
  relative_paths_to_ts_config+="\"$(realpath -s --relative-to="$(dirname "$tmp_file")" "$file")\", "
done

# Remove the trailing comma and space
relative_paths_to_ts_config=${relative_paths_to_ts_config%, }

# Check if the "files" field exists (Match any number of spaces/tabs/newlines between the key and square brackets)
if grep --perl-regexp --null-data --quiet '"files"\s*:\s*\[\s*[^]]*\s*\]' "$tmp_file"; then
  # Replace the content inside the square brackets of the existing "files" field
  # Instead of "/", use "|" as delimiter, because path may contain "/"
  sed --null-data --in-place 's|"files"\s*:\s*\[[^]]*\]|"files": ['"$relative_paths_to_ts_config"']|' "$tmp_file"
else
  # Add the "files" field as the first field of the JSON object
  sed -i '1s|{|{\n  "files": ['"$relative_paths_to_ts_config"'],|' "$tmp_file"
fi

# Remove include field (Match any number of spaces/tabs/newlines between the key and square brackets)
if grep --perl-regexp --null-data --quiet '"include"\s*:\s*\[\s*[^]]*\s*\]' "$tmp_file"; then
  sed --null-data --in-place 's|"include"\s*:\s*\[[^]]*\]\(,\)\?||g' "$tmp_file"
fi

# Pretty format
if ! grep --perl-regexp --null-data --quiet '"pretty"\s*:\s*(true|false)' "$tmp_file"; then
  sed -i 's|"compilerOptions"\s*:\s*{|"compilerOptions": {\n  "pretty": true,|' "$tmp_file"
fi

# No need to handle exclude field. see https://www.typescriptlang.org/tsconfig/#exclude

# Forward CLI options
npx tsc --project "$ts_config_dir/$(basename "$tmp_file")" "${flags[@]}" >&2 &

tsc_pid=$!
wait $tsc_pid
exit $?