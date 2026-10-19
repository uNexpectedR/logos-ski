# Logos Ski

A downhill ski run for Logos Basecamp. Trees on the slope wipe you out. Lambda marks are bonuses: a small one is worth some points, and a big one is worth several times more. The government will chase you, then a bigger Special Ops figure.

Scores are a local top ten on this machine. They stay available offline. There is no networked leaderboard.

## Controls

- Left / Right — steer
- Up — slow down
- Down — speed up
- R — restart and keep the local top ten
- Click the slope if the keys do not respond
- T — test hook: the government starts the chase immediately, then Special Ops on the next press

Hitting a tree wipes you out. You get back up. Collecting a lambda adds points and shows them on the slope. If a chaser reaches you, the run ends.

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
