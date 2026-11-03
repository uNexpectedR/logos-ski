# Logos Ski

A downhill ski run for Logos Basecamp. The hill is snow, with piles you can ski through. Trees stand in small forests, with paths between them wide enough to ski, including a jump. A tree on the snow wipes you out. Lambda marks are bonuses, kept clear of the trees: a small one is worth some points, and a big one is worth several times more. Ramps launch you, and space is a hop. While you are in the air you pass over trees. Landing on a tree still wipes you out.

## Install in Basecamp

1. Settings → Package Repositories → Add a repository.
2. Paste this link:

```
https://raw.githubusercontent.com/uNexpectedR/logos-ski/main/logos-repo.json
```

3. In Package Manager, install **Logos Ski** (the newest version listed).
4. Open it from Apps Inspector.
5. To update, refresh that repository and install the newest version. The paste link stays the same.

One leaderboard lists a name and a score for everyone who plays. Logos Messaging publishes a saved score on the logos.dev network, which can publish without a funded rate-limit membership, and it loads the RLN module the other network needs. Logos Storage keeps the board. Another install loads that row. If messaging and storage are missing, the leaderboard shows as unavailable, and no score is invented. A score that belongs on the board asks for a name. Save publishes it. Skip leaves it off the board.

## Controls

- Left / Right — steer
- Up — slow down
- Down — speed up
- Space — hop
- Shift+Left / Shift+Right — a short dash that way
- R — restart
- Click the slope if the keys do not respond

Hitting a tree on the snow wipes you out. You get back up. Collecting a lambda adds points and shows them on the slope. If a chaser reaches you, the run ends.

## Run locally

```bash
nix run
```

That launches this module in the Logos Basecamp standalone app.
