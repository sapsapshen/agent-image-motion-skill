# agent-image-motion-skill

Reusable npm CLI package for the image-motion workflow.

## What It Provides

- `draft` mode: fast SVG preview without invoking Remotion
- `still` mode: frame preview using Remotion
- `render` mode: final video output using Remotion
- request normalization and lightweight image analysis
- a global CLI bin: `agent-image-motion`

## Global Installation

From this package directory:

```powershell
npm install
npm pack
npm install -g .\agent-image-motion-skill-0.1.0.tgz
```

Or during local development:

```powershell
npm install
npm link
```

After that, you can run the command from any working directory.

## Help

```powershell
agent-image-motion --help
agent-image-motion --version
```

## Global Usage

Use absolute image paths or paths relative to the current terminal directory.

```powershell
agent-image-motion --mode=render --images="D:\images\hero.jpg" --title="Balanced Review" --output=out\balanced-review.mp4
```

If you pass `/example.jpg`, the CLI first looks inside the package `public` directory, then falls back to `public/example.jpg` under the current terminal directory.

## Local Usage Inside This Repo

From the repository root:

```powershell
node .\packages\agent-image-motion-skill\bin\agent-image-motion.mjs --request=.\examples\agent-image-motion.draft-request.json
```

The root-level shortcut remains available:

```powershell
npm run skill:image-motion -- --request=.\examples\agent-image-motion.request.v2.json
```

## Packaging Direction

This directory is structured as a normal npm CLI package.
The CLI uses the current terminal directory as the host workspace for inputs and outputs, while Remotion runs from the package's own runtime root.
