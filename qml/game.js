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
        gates: null,
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

function pathWidth(state) {
    var w = state.width * 0.18
    if (w < 210) w = 210
    if (w > 250) w = 250
    return w
}

function driftGates(state) {
    var pathW = pathWidth(state)
    var count = state.width >= 1000 ? 2 : 1
    var minGap = pathW + 140
    var lo = 48 + pathW / 2
    var hi = state.width - 48 - pathW / 2
    if (!state.gates || state.gates.length !== count) {
        if (count === 2) state.gates = [state.width * 0.46, state.width * 0.76]
        else state.gates = [state.width * 0.5]
    }
    var i
    for (i = 0; i < state.gates.length; i++) {
        state.gates[i] += Math.random() * 70 - 35
    }
    if (state.gates.length === 2 && state.gates[0] > state.gates[1]) {
        var swap = state.gates[0]
        state.gates[0] = state.gates[1]
        state.gates[1] = swap
    }
    if (state.gates.length === 2 && state.gates[1] - state.gates[0] < minGap) {
        state.gates[1] = state.gates[0] + minGap
    }
    if (state.gates[0] < lo) state.gates[0] = lo
    if (state.gates.length === 2 && state.gates[1] > hi) state.gates[1] = hi
    if (state.gates.length === 2 && state.gates[1] - state.gates[0] < minGap) {
        state.gates[0] = state.gates[1] - minGap
    }
    if (state.gates[0] < lo) state.gates[0] = lo
    if (state.gates.length === 1 && state.gates[0] > hi) state.gates[0] = hi
    return pathW
}

function forestSpans(state, pathW) {
    var spans = []
    var cursor = 36
    var i
    for (i = 0; i < state.gates.length; i++) {
        var left = state.gates[i] - pathW / 2
        if (left - cursor > 64) spans.push({ x0: cursor, x1: left - 12 })
        cursor = state.gates[i] + pathW / 2 + 12
    }
    if (state.width - 36 - cursor > 64) spans.push({ x0: cursor, x1: state.width - 36 })
    return spans
}

function placeCluster(state, x0, x1, y0, y1, count) {
    if (x1 - x0 < 28 || y1 - y0 < 28) return
    var n = 0
    var guard = 0
    while (n < count && guard < count * 16) {
        guard++
        var x = x0 + Math.random() * (x1 - x0)
        var y = y0 + Math.random() * (y1 - y0)
        if (nearList(state.obstacles, x, y, 4)) continue
        if (nearList(state.bonuses, x, y, 96)) continue
        if (nearList(state.ramps, x, y, 84)) continue
        state.obstacles.push({
            x: x,
            y: y,
            kind: "tree",
            scale: 0.82 + Math.random() * 0.38
        })
        n++
    }
}

function layBand(state, y, depth) {
    var pathW = driftGates(state)
    var spans = forestSpans(state, pathW)
    var i
    for (i = 0; i < spans.length; i++) {
        var span = spans[i]
        var count = Math.floor((span.x1 - span.x0) / 46)
        if (count < 3) count = 3
        if (count > 8) count = 8
        placeCluster(state, span.x0, span.x1, y, y + depth, count)
    }
    if (Math.random() < 0.6) {
        var gate = state.gates[Math.floor(Math.random() * state.gates.length)]
        var ry = y + depth * 0.55
        if (spotFree(state, gate, ry, 70)) {
            state.ramps.push({ x: gate, y: ry, spent: false })
        }
    }
    if (Math.random() < 0.1) {
        var lane = state.gates[Math.floor(Math.random() * state.gates.length)]
        var lx = lane + (Math.random() < 0.5 ? -28 : 28)
        var ly = y + depth * 0.82
        if (spotFree(state, lx, ly, 110)) {
            state.bonuses.push({
                x: lx,
                y: ly,
                kind: Math.random() < 0.28 ? "big" : "small"
            })
        }
    }
    if (spans.length && Math.random() < 0.45) {
        var forest = spans[Math.floor(Math.random() * spans.length)]
        state.piles.push({
            x: (forest.x0 + forest.x1) / 2,
            y: y + depth * 0.35,
            scale: 0.75 + Math.random() * 0.45
        })
    }
}

function spawn(state) {
    var gap = state.fast ? 280 : 420
    if (state.travel - state.spawnAt < gap) return
    state.spawnAt = state.travel
    layBand(state, state.travel + state.height * 0.92, 210)
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

function stampForest(state, x0, x1, y0, y1, cols, rows) {
    if (x1 - x0 < 40 || y1 - y0 < 40 || cols < 1 || rows < 1) return
    var dx = (x1 - x0) / cols
    var dy = (y1 - y0) / rows
    var r
    var c
    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
            state.obstacles.push({
                x: x0 + dx * (c + 0.5) + ((r * 13 + c * 7) % 9) - 4,
                y: y0 + dy * (r + 0.5) + ((r * 5 + c * 11) % 7) - 3,
                kind: "tree",
                scale: 0.86 + ((c + r) % 3) * 0.12
            })
        }
    }
}

function prime(state) {
    var w = state.width
    var pathW = 230
    var y = state.travel
    var c1 = w * 0.46
    var c2 = w * 0.78
    if (w < 1000) {
        c1 = w * 0.5
        state.gates = [c1]
        stampForest(state, 36, c1 - pathW / 2 - 12, y + 70, y + 360, 4, 3)
        stampForest(state, c1 + pathW / 2 + 12, w - 36, y + 90, y + 380, 4, 3)
    } else {
        if (c2 - c1 < pathW + 140) c2 = c1 + pathW + 150
        state.gates = [c1, c2]
        stampForest(state, 36, c1 - pathW / 2 - 12, y + 50, y + 390, 5, 3)
        stampForest(state, c1 + pathW / 2 + 12, c2 - pathW / 2 - 12, y + 80, y + 360, 3, 3)
        stampForest(state, c2 + pathW / 2 + 12, w - 36, y + 60, y + 340, 3, 3)
    }
    state.ramps.push({ x: c1, y: y + 250, spent: false })
    state.bonuses.push({ x: c2, y: y + 190, kind: "small" })
    state.piles.push({ x: 70, y: y + 160, scale: 0.9 })
    state.piles.push({ x: w - 80, y: y + 220, scale: 0.75 })
    state.spawnAt = y + 220
}

function copyInto(dst, src) {
    var keys = []
    var k
    for (k in dst) keys.push(k)
    var i
    for (i = 0; i < keys.length; i++) delete dst[keys[i]]
    for (k in src) dst[k] = src[k]
}
