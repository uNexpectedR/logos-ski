# Logos Ski

A downhill ski run for Logos Basecamp. The hill is snow, with piles you can ski through. Trees stand in small forests, with paths between them wide enough to ski, including a jump. A tree on the snow wipes you out. Lambda marks are bonuses, kept clear of the trees: a small one is worth some points, and a big one is worth several times more. Ramps launch you, and space is a hop. While you are in the air you pass over trees. Landing on a tree still wipes you out.

Scores are a local top ten on this machine. They stay available offline. There is no networked leaderboard.

## Controls

- Left / Right — steer
- Up — slow down
- Down — speed up
- Space — hop
- R — restart and keep the local top ten
- Click the slope if the keys do not respond

Hitting a tree on the snow wipes you out. You get back up. Collecting a lambda adds points and shows them on the slope. If a chaser reaches you, the run ends.

## Install in Basecamp

Settings → Package Repositories → Add a repository, and paste:

```
https://raw.githubusercontent.com/uNexpectedR/logos-ski/main/logos-repo.json
```

Package Manager then lists **Logos Ski**. Install it and load it from Apps Inspector.

## Run locally

```bash
nix run
```

That launches this module in the Logos Basecamp standalone app.
