#!/bin/zsh
# Rebuild each Make repo (git packs + manifest) into a working tree under apps/<NAME>/code
set -e
cd "${0:A:h}/apps"
for app in *(/); do
  repo="$app/repo"
  out="$app/code"
  rm -rf "$out" && mkdir -p "$out"
  git -C "$out" init -q
  mkdir -p "$out/.git/objects/pack"
  for p in $repo/packs/*.pack; do
    cp "$p" "$out/.git/objects/pack/"
    git -C "$out" index-pack ".git/objects/pack/${p:t}" >/dev/null
  done
  sha=$(python3 -c "import json;print(json.load(open('$repo/manifest.json'))['commit_sha'])")
  git -C "$out" update-ref refs/heads/main "$sha"
  git -C "$out" checkout -q -f main
  echo "== $app $sha"
  ls "$out"
done
