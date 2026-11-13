# Blueprint Launch Studio

## Requirements

Install Git, zsh, Python 3, Node.js, and pnpm on your machine.

## Restore and build the prototypes

Clone this repository, then run:

```sh
./_src/unpack.sh
for app in _src/apps/*/code; do
  (cd "$app" && pnpm install --frozen-lockfile && pnpm build)
done
```

`unpack.sh` reconstructs the ten prototype repositories under `_src/apps/<name>/code` from the committed Git packs and manifests.

## Run all prototypes

After installing their dependencies, start the ten Vite servers:

```sh
./_src/serve-all.sh
```

The servers use ports 9101 through 9110. Stop them with `pkill -f vite`.

## Capture and film tools

Install their npm dependencies separately with `npm ci` in `capture/` and `film/`. Generated captures, audio, frames, and rendered videos are not stored in this repository.
