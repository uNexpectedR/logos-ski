.import "palette.js" as Palette

function paint(ctx, state, w, h) {
    var pal = Palette.tokens()
    drawSlope(ctx, state, w, h, pal)
    var marks = []
    var i
    for (i = 0; i < state.obstacles.length; i++) {
        var o = state.obstacles[i]
        marks.push({ sy: screenY(state, o.y), kind: o.kind, x: o.x, y: screenY(state, o.y) })
    }
    if (state.police) {
        marks.push({
            sy: screenY(state, state.police.y),
            kind: "police",
            x: state.police.x,
            y: screenY(state, state.police.y)
        })
    }
    if (state.ops) {
        marks.push({
            sy: screenY(state, state.ops.y),
            kind: "ops",
            x: state.ops.x,
            y: screenY(state, state.ops.y)
        })
    }
    marks.sort(function (a, b) { return a.sy - b.sy })
    var skierDrawn = false
    for (i = 0; i < marks.length; i++) {
        if (!skierDrawn && marks[i].sy >= state.skierScreenY) {
            drawSkier(ctx, state, pal)
            skierDrawn = true
        }
        drawMark(ctx, marks[i], pal)
    }
    if (!skierDrawn) drawSkier(ctx, state, pal)
    if (state.police) drawIncoming(ctx, state, state.police, false, pal)
    if (state.ops) drawIncoming(ctx, state, state.ops, true, pal)
    if (state.mode === "caught") {
        ctx.fillStyle = pal.ink
        ctx.globalAlpha = 0.38
        ctx.fillRect(0, 0, w, h)
        ctx.globalAlpha = 1
    }
}

function screenY(state, worldY) {
    return state.skierScreenY + (worldY - state.travel)
}

function drawSlope(ctx, state, w, h, pal) {
    var g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, "#e4ebe6")
    g.addColorStop(1, pal.paper)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = pal.steel
    ctx.globalAlpha = 0.28
    ctx.lineWidth = 2
    var gap = 52
    var offset = mod(state.travel, gap)
    var y = gap - offset
    while (y < h + gap) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y + 22)
        ctx.stroke()
        y += gap
    }
    ctx.globalAlpha = 0.08
    ctx.fillStyle = pal.ink
    ctx.fillRect(0, 0, 22, h)
    ctx.fillRect(w - 22, 0, 22, h)
    ctx.globalAlpha = 1
    if (state.mode === "ski" && state.speed > 320) {
        ctx.strokeStyle = pal.signal
        ctx.globalAlpha = 0.45
        ctx.lineWidth = 2
        var s
        for (s = 0; s < 4; s++) {
            var sy = state.skierScreenY - 30 - s * 28
            ctx.beginPath()
            ctx.moveTo(state.skierX - 34, sy)
            ctx.lineTo(state.skierX - 18, sy + 16)
            ctx.stroke()
        }
        ctx.globalAlpha = 1
    }
}

function drawMark(ctx, mark, pal) {
    if (mark.y < -90 || mark.y > 4000) return
    if (mark.kind === "small" || mark.kind === "big") drawLambda(ctx, mark.x, mark.y, mark.kind === "big", pal)
    else if (mark.kind === "police") drawOfficer(ctx, mark.x, mark.y, false, pal)
    else if (mark.kind === "ops") drawOfficer(ctx, mark.x, mark.y, true, pal)
}

function drawLambda(ctx, x, y, big, pal) {
    var w = big ? 34 : 16
    var h = big ? 46 : 22
    ctx.save()
    ctx.translate(x, y)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = pal.steel
    ctx.globalAlpha = 0.45
    ctx.lineWidth = big ? 8 : 4
    traceLambda(ctx, w, h, 3, 4)
    ctx.stroke()
    ctx.globalAlpha = 1
    if (big) {
        ctx.strokeStyle = pal.signal
        ctx.lineWidth = 10
        traceLambda(ctx, w, h, 0, 0)
        ctx.stroke()
    }
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = big ? 4 : 3
    traceLambda(ctx, w, h, 0, 0)
    ctx.stroke()
    ctx.restore()
}

function traceLambda(ctx, w, h, dx, dy) {
    ctx.beginPath()
    ctx.moveTo(-w + dx, -h * 0.42 + dy)
    ctx.lineTo(dx, h * 0.5 + dy)
    ctx.lineTo(w + dx, -h * 0.42 + dy)
}

function drawSkier(ctx, state, pal) {
    if (state.invuln > 0 && Math.floor(state.invuln * 14) % 2 === 0) return
    var lean = state.vx / 700
    if (lean > 0.45) lean = 0.45
    if (lean < -0.45) lean = -0.45
    ctx.save()
    ctx.translate(state.skierX, state.skierScreenY)
    if (state.mode === "crash") ctx.rotate(state.tumble)
    else ctx.rotate(lean)
    ctx.save()
    ctx.translate(0, 16)
    ctx.scale(1.6, 0.45)
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.15
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(-18, 6)
    ctx.lineTo(16, 20)
    ctx.moveTo(-8, 8)
    ctx.lineTo(22, 16)
    ctx.stroke()
    ctx.fillStyle = pal.ink
    ctx.fillRect(-6, -2, 5, 14)
    ctx.fillRect(2, -2, 5, 14)
    ctx.fillStyle = pal.signal
    ctx.fillRect(-8, -18, 16, 18)
    ctx.fillStyle = pal.ink
    ctx.fillRect(-8, -20, 16, 4)
    ctx.strokeStyle = pal.steel
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-8, -8)
    ctx.lineTo(-16, 8)
    ctx.moveTo(8, -8)
    ctx.lineTo(14, 6)
    ctx.stroke()
    ctx.fillStyle = pal.paper
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, -28, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = pal.ink
    ctx.fillRect(-8, -36, 16, 6)
    ctx.restore()
}

function drawOfficer(ctx, x, y, special, pal) {
    ctx.save()
    ctx.translate(x, y)
    if (special) ctx.scale(1.7, 1.7)
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.arc(0, 22, special ? 16 : 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    if (special) {
        ctx.fillStyle = pal.ops
        ctx.fillRect(-7, -6, 8, 12)
    }
    ctx.fillStyle = special ? pal.opsBlue : pal.police
    ctx.fillRect(-7, 2, 5, 14)
    ctx.fillRect(2, 2, 5, 14)
    if (special) {
        ctx.fillStyle = pal.ops
        ctx.fillRect(-8, 14, 6, 4)
        ctx.fillRect(2, 14, 6, 4)
    }
    ctx.fillStyle = pal.boot
    ctx.fillRect(-8, 16, 7, 4)
    ctx.fillRect(1, 16, 7, 4)
    ctx.fillStyle = special ? pal.opsBlue : pal.police
    ctx.fillRect(-11, -16, 22, 20)
    if (special) {
        ctx.fillStyle = pal.ops
        ctx.fillRect(-8, -14, 16, 16)
        ctx.fillStyle = pal.signal
        ctx.fillRect(-6, -4, 4, 4)
        ctx.fillRect(2, -4, 4, 4)
        ctx.fillStyle = pal.ops
        ctx.fillRect(-16, -16, 7, 6)
        ctx.fillRect(9, -16, 7, 6)
    } else {
        ctx.fillStyle = pal.signal
        ctx.beginPath()
        ctx.arc(5, -6, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = pal.paper
        ctx.fillRect(4, -7, 2, 2)
    }
    ctx.strokeStyle = special ? pal.ops : pal.police
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(-11, -8)
    ctx.lineTo(-17, 8)
    ctx.moveTo(11, -8)
    ctx.lineTo(17, 8)
    ctx.stroke()
    ctx.fillStyle = pal.skin
    ctx.beginPath()
    ctx.arc(0, -24, special ? 8 : 7, 0, Math.PI * 2)
    ctx.fill()
    if (special) {
        ctx.fillStyle = pal.ops
        ctx.beginPath()
        ctx.arc(0, -26, 9, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(-10, -26, 20, 6)
        ctx.fillStyle = pal.visor
        ctx.fillRect(-7, -23, 14, 4)
        ctx.fillStyle = pal.ink
        ctx.fillRect(-4, -22, 8, 2)
    } else {
        ctx.fillStyle = pal.policeDark
        ctx.beginPath()
        ctx.arc(0, -28, 8, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(-11, -28, 22, 3)
        ctx.fillStyle = pal.police
        ctx.fillRect(-12, -26, 24, 3)
    }
    ctx.restore()
}

function drawIncoming(ctx, state, ch, special, pal) {
    var sy = screenY(state, ch.y)
    if (sy >= 14) return
    ctx.fillStyle = special ? pal.ops : pal.police
    var width = special ? 22 : 12
    ctx.fillRect(ch.x - width / 2, 10, width, 5)
}

function mod(n, m) {
    return ((n % m) + m) % m
}
