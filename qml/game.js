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
        mode: "ski",
        crashT: 0,
        tumble: 0,
        invuln: 0,
        obstacles: [],
        spawnAt: -999,
        police: null,
        ops: null,
        policeAt: 450,
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
    if (meters < 0) return 0
    return meters
}

function step(state, dt, input) {
    if (!state.placed) return
    if (dt > 0.05) dt = 0.05
    if (dt < 0) dt = 0
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
    var gap = state.fast ? 130 : 220
    if (state.travel - state.spawnAt < gap) return
    state.spawnAt = state.travel
    var big = Math.random() < 0.24
    var margin = 70
    var span = state.width - margin * 2
    if (span < 40) span = 40
    state.obstacles.push({
        x: margin + Math.random() * span,
        y: state.travel + state.height * 0.92,
        kind: big ? "big" : "small"
    })
}

function cull(state) {
    var next = []
    var limit = state.travel - 360
    var i
    for (i = 0; i < state.obstacles.length; i++) {
        if (state.obstacles[i].y > limit) next.push(state.obstacles[i])
    }
    state.obstacles = next
}

function chase(state, dt) {
    if (!state.police && state.distance >= state.policeAt) {
        state.police = {
            x: state.skierX,
            y: state.travel - 340,
            kind: "police"
        }
    }
    if (!state.ops && state.distance >= state.specialAt) {
        state.ops = {
            x: state.skierX + 120,
            y: state.travel - 460,
            kind: "ops"
        }
    }
    if (state.police) moveChaser(state, state.police, dt, 170, 48)
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
        var o = state.obstacles[i]
        var rad = o.kind === "big" ? 40 : 18
        if (hits(state.skierX, state.travel, o.x, o.y, rad + 12)) {
            state.obstacles.splice(i, 1)
            state.mode = "crash"
            state.crashT = 0
            state.tumble = 0
            state.vx = 0
            return
        }
    }
    if (state.police && hits(state.skierX, state.travel, state.police.x, state.police.y, 26)) {
        finish(state, "police")
        return
    }
    if (state.ops && hits(state.skierX, state.travel, state.ops.x, state.ops.y, 40)) {
        finish(state, "ops")
    }
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
        next.policeAt = 35
        next.specialAt = 90
    }
    prime(next)
    copyInto(state, next)
}

function armFast(state) {
    if (state.mode === "caught") return
    state.fast = true
    state.policeAt = 35
    state.specialAt = 90
    var target = state.police ? state.specialAt : state.policeAt
    if (state.distance < target) {
        state.distance = target
        state.travel = target * 8
    }
    chase(state, 0)
}

function prime(state) {
    var i
    for (i = 0; i < 6; i++) {
        var margin = 80
        var span = state.width - margin * 2
        if (span < 40) span = 40
        state.obstacles.push({
            x: margin + Math.random() * span,
            y: state.travel + 240 + i * 170,
            kind: i % 4 === 3 ? "big" : "small"
        })
    }
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
