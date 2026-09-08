#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ $# -ne 1 ]]; then
  echo 'Usage: bash apply-vercel-update.sh /path/to/existing/winglex-creator-lab'
  exit 1
fi
target_dir="$(cd "$1" && pwd)"
if [[ "$source_dir" == "$target_dir" ]]; then
  echo 'Run this from the extracted update folder and pass your existing Git checkout as the target.'
  exit 1
fi
if [[ ! -d "$target_dir/.git" || ! -f "$target_dir/app/creator-lab.tsx" || ! -f "$target_dir/package.json" ]]; then
  echo 'The target must be your existing Winglex Creator Lab Git repository.'
  exit 1
fi
if [[ -n "$(git -C "$target_dir" status --porcelain)" ]]; then
  echo 'Your checkout has uncommitted files. Commit or stash them, then run this again.'
  exit 1
fi
backup_file="$(dirname "$target_dir")/winglex-before-vercel-$(date +%Y%m%d-%H%M%S).tar"
git -C "$target_dir" archive --format=tar HEAD > "$backup_file"
# These paths belong to the previous Cloudflare/Sites runtime.
# The entire tracked checkout was backed up above before any replacement.
for old_path in .openai worker build db drizzle examples tests scripts; do
  rm -rf -- "$target_dir/$old_path"
done
for old_file in vite.config.ts drizzle.config.ts app/chatgpt-auth.ts tsconfig.tsbuildinfo .npmrc; do
  rm -f -- "$target_dir/$old_file"
done
# Copy source only; never copy Git history, dependencies, secrets, or builds.
while IFS= read -r -d '' item; do
  name="$(basename "$item")"
  case "$name" in .env.example) ;; .git|node_modules|.next|.vercel|.env*|*.tsbuildinfo) continue ;; esac
  cp -R "$item" "$target_dir/"
done < <(find "$source_dir" -mindepth 1 -maxdepth 1 -print0)
echo "Updated source: $target_dir"
echo "Previous committed source backup: $backup_file"
echo 'Your Git history, remote and local environment files were preserved.'
echo 'Next: follow DEPLOY_ON_VERCEL.md, then git add -A, git commit, and git push.'
