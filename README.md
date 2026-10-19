# Logos Ski

A downhill ski run for Logos Basecamp. Steer between Logos lambda marks. A blue policeman picks up the chase, then a larger Special Ops officer.

Scores are a local top ten on this machine. They stay available offline. There is no networked leaderboard.

## Controls

- Left / Right — steer
- Up — slow down
- Down — speed up
- R — restart and keep the local top ten
- Click the slope if the keys do not respond
- T — test hook: bring the policeman in immediately, then Special Ops on the next press

Hitting a lambda wipes you out. You get back up. If a chaser reaches you, the run ends.

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

That launches this module in logos-standalone-app.
