var SMALL_PTS = 100
var BIG_PTS = 500

function createState() {
    return {
        width: 960,
        height: 640,
        skierX: 480,
        skierScreenY: 218,
        vx: 0,
        speed: 150,
        travel: 0,
        distance: 0,
        bonus: 0,
        mode: "ski",
        crashT: 0,
        tumble: 0,
        invuln: 0,
        obstacles: [],
        bonuses: [],
        piles: [],
        ramps: [],
        floaters: [],
        air: 0,
        airMax: 0,
        spawnAt: -999,
        agent: null,
        ops: null,
        agentAt: 450,
        specialAt: 1400,
        fast: false,
        top: [],
        scoreDirty: false,
        recorded: false,
        caughtBy: "",
        placed: false
    }
}

function score(state) {
    var meters = Math.floor(state.distance)
    if (meters < 0) meters = 0
    return meters + state.bonus
}

function step(state, dt, input) {
    if (!state.placed) return
    if (dt > 0.05) dt = 0.05
    if (dt < 0) dt = 0
    fadeFloaters(state, dt)
    if (state.mode === "caught") return
    if (state.invuln > 0) state.invuln -= dt
    if (state.mode === "crash") {
        state.crashT += dt
        state.tumble += dt * 11
        if (state.crashT >= 1.05) {
            state.mode = "ski"
            state.invuln = 0.75
            state.speed = 100
            state.vx = 0
            state.tumble = 0
        }
        return
    }
    steer(state, dt, input)
    if (input.hop) {
        if (state.air <= 0) launch(state, 0.58)
        input.hop = false
    }
    state.travel += state.speed * dt
    state.distance = state.travel / 8
    spawn(state)
    cull(state)
    chase(state, dt)
    if (state.air > 0) {
        state.air -= dt
        if (state.air < 0) state.air = 0
    }
    collide(state)
}

function launch(state, dur) {
    state.air = dur
    state.airMax = dur
}

function steer(state, dt, input) {
    if (input.left) state.vx -= 820 * dt
    else if (input.right) state.vx += 820 * dt
    else state.vx *= Math.max(0, 1 - 3.2 * dt)
    if (state.vx > 360) state.vx = 360
    if (state.vx < -360) state.vx = -360
    if (input.down) state.speed += 240 * dt
    else if (input.up) state.speed -= 300 * dt
    else state.speed += 18 * dt
    if (state.speed < 70) state.speed = 70
    if (state.speed > 520) state.speed = 520
    state.skierX += state.vx * dt
    if (state.skierX < 36) {
        state.skierX = 36
        state.vx = 0
    }
    if (state.skierX > state.width - 36) {
        state.skierX = state.width - 36
        state.vx = 0
    }
}

function spawn(state) {
    var gap = state.fast ? 150 : 240
    if (state.travel - state.spawnAt < gap) return
    state.spawnAt = state.travel
    var yTree = state.travel + state.height * 0.95
    var xTree = findX(state, yTree, 48)
    if (xTree >= 0) {
        state.obstacles.push({
            x: xTree,
            y: yTree,
            kind: "tree",
            scale: 0.85 + Math.random() * 0.4
        })
    }
    if (Math.random() < 0.7) {
        var yPile = state.travel + state.height * (0.5 + Math.random() * 0.4)
        var xPile = findX(state, yPile, 54)
        if (xPile >= 0) {
            state.piles.push({
                x: xPile,
                y: yPile,
                scale: 0.8 + Math.random() * 0.7
            })
        }
    }
    if (Math.random() < 0.1) {
        var yBonus = state.travel + state.height * 0.7
        var xBonus = findX(state, yBonus, 110)
        if (xBonus >= 0) {
            var big = Math.random() < 0.28
            state.bonuses.push({
                x: xBonus,
                y: yBonus,
                kind: big ? "big" : "small"
            })
        }
    }
    if (Math.random() < 0.22) {
        var yRamp = state.travel + state.height * 0.86
        var xRamp = findX(state, yRamp, 120)
        if (xRamp >= 0) {
            state.ramps.push({ x: xRamp, y: yRamp, spent: false })
        }
    }
}

function findX(state, y, rad) {
    var margin = 80
    var span = state.width - margin * 2
    if (span < 40) span = 40
    var n
    for (n = 0; n < 8; n++) {
        var x = margin + Math.random() * span
        if (spotFree(state, x, y, rad)) return x
    }
    return -1
}

function spotFree(state, x, y, rad) {
    if (nearList(state.obstacles, x, y, rad)) return false
    if (nearList(state.bonuses, x, y, rad)) return false
    if (nearList(state.ramps, x, y, rad)) return false
    if (nearList(state.piles, x, y, rad)) return false
    return true
}

function nearList(list, x, y, rad) {
    var i
    for (i = 0; i < list.length; i++) {
        var item = list[i]
        var extra = 40
        if (item.kind === "big") extra = 64
        else if (item.kind === "small") extra = 48
        else if (item.kind === "tree") extra = 36 * (item.scale || 1)
        if (hits(x, y, item.x, item.y, rad + extra)) return true
    }
    return false
}

function cull(state) {
    var limit = state.travel - 420
    var next = []
    var i
    for (i = 0; i < state.obstacles.length; i++) {
        if (state.obstacles[i].y > limit) next.push(state.obstacles[i])
    }
    state.obstacles = next
    next = []
    for (i = 0; i < state.bonuses.length; i++) {
        if (state.bonuses[i].y > limit) next.push(state.bonuses[i])
    }
    state.bonuses = next
    next = []
    for (i = 0; i < state.piles.length; i++) {
        if (state.piles[i].y > limit) next.push(state.piles[i])
    }
    state.piles = next
    next = []
    for (i = 0; i < state.ramps.length; i++) {
        if (state.ramps[i].y > limit) next.push(state.ramps[i])
    }
    state.ramps = next
}

function chase(state, dt) {
    if (!state.agent && state.distance >= state.agentAt) {
        state.agent = {
            x: state.skierX,
            y: state.travel - 340,
            kind: "agent"
        }
    }
    if (!state.ops && state.distance >= state.specialAt) {
        state.ops = {
            x: state.skierX + 120,
            y: state.travel - 460,
            kind: "ops"
        }
    }
    if (state.agent) moveChaser(state, state.agent, dt, 170, 48)
    if (state.ops) moveChaser(state, state.ops, dt, 320, 110)
}

function moveChaser(state, ch, dt, lateral, extra) {
    var dx = state.skierX - ch.x
    var side = lateral * dt
    if (dx > side) ch.x += side
    else if (dx < -side) ch.x -= side
    else ch.x = state.skierX
    var gap = state.travel - ch.y
    if (gap > 0) {
        var gain = (state.speed + extra) * dt
        if (gain > gap) ch.y = state.travel
        else ch.y += gain
    }
}

function collide(state) {
    if (state.mode !== "ski" || state.invuln > 0) return
    var i
    var grounded = state.air <= 0
    if (grounded) {
        for (i = state.obstacles.length - 1; i >= 0; i--) {
            var tree = state.obstacles[i]
            var rad = 22 * (tree.scale || 1)
            if (hits(state.skierX, state.travel, tree.x, tree.y, rad + 10)) {
                state.obstacles.splice(i, 1)
                state.mode = "crash"
                state.crashT = 0
                state.tumble = 0
                state.vx = 0
                state.air = 0
                state.airMax = 0
                return
            }
        }
        for (i = state.bonuses.length - 1; i >= 0; i--) {
            var bonus = state.bonuses[i]
            var reach = bonus.kind === "big" ? 42 : 22
            if (hits(state.skierX, state.travel, bonus.x, bonus.y, reach)) {
                collect(state, bonus)
                state.bonuses.splice(i, 1)
            }
        }
        for (i = 0; i < state.ramps.length; i++) {
            var ramp = state.ramps[i]
            if (!ramp.spent && hits(state.skierX, state.travel, ramp.x, ramp.y, 38)) {
                ramp.spent = true
                launch(state, 0.96)
                break
            }
        }
    }
    for (i = 0; i < state.ramps.length; i++) {
        var done = state.ramps[i]
        if (done.spent && state.travel > done.y + 100) done.spent = false
    }
    if (state.agent && hits(state.skierX, state.travel, state.agent.x, state.agent.y, 26)) {
        finish(state, "agent")
        return
    }
    if (state.ops && hits(state.skierX, state.travel, state.ops.x, state.ops.y, 40)) {
        finish(state, "ops")
    }
}

function collect(state, bonus) {
    var pts = bonus.kind === "big" ? BIG_PTS : SMALL_PTS
    state.bonus += pts
    state.floaters.push({
        x: bonus.x,
        y: bonus.y,
        text: "+" + pts,
        life: 1.15
    })
}

function fadeFloaters(state, dt) {
    var next = []
    var i
    for (i = 0; i < state.floaters.length; i++) {
        state.floaters[i].life -= dt
        if (state.floaters[i].life > 0) next.push(state.floaters[i])
    }
    state.floaters = next
}

function hits(ax, ay, bx, by, r) {
    var dx = ax - bx
    var dy = ay - by
    return dx * dx + dy * dy < r * r
}

function finish(state, by) {
    state.mode = "caught"
    state.caughtBy = by
    state.vx = 0
    recordScore(state)
}

function recordScore(state) {
    if (state.recorded) return
    state.recorded = true
    var list = []
    var i
    for (i = 0; i < state.top.length; i++) list.push(state.top[i])
    list.push(score(state))
    list.sort(function (a, b) { return b - a })
    if (list.length > 10) list.length = 10
    state.top = list
    state.scoreDirty = true
}

function restart(state) {
    if (!state.recorded && score(state) > 0) recordScore(state)
    var keptTop = state.top
    var w = state.width
    var h = state.height
    var fast = state.fast
    var screenY = state.skierScreenY
    var next = createState()
    next.top = keptTop
    next.width = w
    next.height = h
    next.skierScreenY = screenY
    next.skierX = w * 0.5
    next.placed = true
    next.fast = fast
    if (fast) {
        next.agentAt = 35
        next.specialAt = 90
    }
    prime(next)
    copyInto(state, next)
}

function armFast(state) {
    if (state.mode === "caught") return
    state.fast = true
    state.agentAt = 35
    state.specialAt = 90
    var target = state.agent ? state.specialAt : state.agentAt
    if (state.distance < target) {
        state.distance = target
        state.travel = target * 8
    }
    chase(state, 0)
}

function prime(state) {
    var w = state.width
    state.piles.push({ x: w * 0.2, y: state.travel + 130, scale: 1.2 })
    state.piles.push({ x: w * 0.86, y: state.travel + 210, scale: 0.85 })
    state.obstacles.push({
        x: w * 0.74,
        y: state.travel + 200,
        kind: "tree",
        scale: 1.05
    })
    state.bonuses.push({
        x: w * 0.46,
        y: state.travel + 300,
        kind: "small"
    })
    state.ramps.push({
        x: w * 0.28,
        y: state.travel + 390,
        spent: false
    })
    state.spawnAt = state.travel
}

function copyInto(dst, src) {
    var keys = []
    var k
    for (k in dst) keys.push(k)
    var i
    for (i = 0; i < keys.length; i++) delete dst[keys[i]]
    for (k in src) dst[k] = src[k]
}
