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
        floaters: [],
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
    state.travel += state.speed * dt
    state.distance = state.travel / 8
    spawn(state)
    cull(state)
    chase(state, dt)
    collide(state)
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
    var gap = state.fast ? 120 : 200
    if (state.travel - state.spawnAt < gap) return
    state.spawnAt = state.travel
    var margin = 70
    var span = state.width - margin * 2
    if (span < 40) span = 40
    state.obstacles.push({
        x: margin + Math.random() * span,
        y: state.travel + state.height * 0.92,
        kind: "tree",
        scale: 0.85 + Math.random() * 0.45
    })
    if (Math.random() < 0.42) {
        var big = Math.random() < 0.28
        state.bonuses.push({
            x: margin + Math.random() * span,
            y: state.travel + state.height * 0.78,
            kind: big ? "big" : "small"
        })
    }
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
    for (i = state.obstacles.length - 1; i >= 0; i--) {
        var tree = state.obstacles[i]
        var rad = 22 * (tree.scale || 1)
        if (hits(state.skierX, state.travel, tree.x, tree.y, rad + 10)) {
            state.obstacles.splice(i, 1)
            state.mode = "crash"
            state.crashT = 0
            state.tumble = 0
            state.vx = 0
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
    var margin = 90
    var span = state.width - margin * 2
    if (span < 40) span = 40
    var i
    for (i = 0; i < 5; i++) {
        state.obstacles.push({
            x: margin + ((i * 0.37) % 1) * span,
            y: state.travel + 150 + i * 150,
            kind: "tree",
            scale: i % 2 === 0 ? 1.05 : 0.82
        })
    }
    state.bonuses.push({
        x: state.width * 0.30,
        y: state.travel + 230,
        kind: "small"
    })
    state.bonuses.push({
        x: state.width * 0.68,
        y: state.travel + 390,
        kind: "big"
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
