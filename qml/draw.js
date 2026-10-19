.import "palette.js" as Palette

function paint(ctx, state, w, h, mark) {
    var pal = Palette.tokens()
    drawSlope(ctx, state, w, h, pal)
    var marks = []
    var i
    for (i = 0; i < state.obstacles.length; i++) {
        var tree = state.obstacles[i]
        marks.push({
            sy: screenY(state, tree.y),
            kind: "tree",
            x: tree.x,
            y: screenY(state, tree.y),
            scale: tree.scale || 1
        })
    }
    for (i = 0; i < state.bonuses.length; i++) {
        var bonus = state.bonuses[i]
        marks.push({
            sy: screenY(state, bonus.y),
            kind: bonus.kind,
            x: bonus.x,
            y: screenY(state, bonus.y)
        })
    }
    if (state.agent) {
        marks.push({
            sy: screenY(state, state.agent.y),
            kind: "agent",
            x: state.agent.x,
            y: screenY(state, state.agent.y)
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
        drawMark(ctx, marks[i], pal, mark)
    }
    if (!skierDrawn) drawSkier(ctx, state, pal)
    if (state.agent) drawIncoming(ctx, state, state.agent, false, pal)
    if (state.ops) drawIncoming(ctx, state, state.ops, true, pal)
    drawFloaters(ctx, state, pal)
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

function drawMark(ctx, mark, pal, image) {
    if (mark.y < -120 || mark.y > 4000) return
    if (mark.kind === "tree") drawTree(ctx, mark.x, mark.y, mark.scale, pal)
    else if (mark.kind === "small" || mark.kind === "big") drawBonus(ctx, image, mark.x, mark.y, mark.kind === "big")
    else if (mark.kind === "agent") drawChaser(ctx, mark.x, mark.y, false, pal)
    else if (mark.kind === "ops") drawChaser(ctx, mark.x, mark.y, true, pal)
}

function drawTree(ctx, x, y, scale, pal) {
    var s = scale || 1
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.14
    ctx.beginPath()
    ctx.arc(2, 16, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.ink
    ctx.fillRect(-4, -6, 8, 18)
    ctx.fillStyle = pal.pine
    ctx.beginPath()
    ctx.moveTo(0, -52)
    ctx.lineTo(18, -16)
    ctx.lineTo(-18, -16)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, -36)
    ctx.lineTo(24, 0)
    ctx.lineTo(-24, 0)
    ctx.fill()
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.18
    ctx.beginPath()
    ctx.moveTo(0, -48)
    ctx.lineTo(8, -18)
    ctx.lineTo(0, -22)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
}

function drawBonus(ctx, image, x, y, big) {
    var s = big ? 92 : 40
    if (!image) return
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.fillStyle = "#152521"
    ctx.beginPath()
    ctx.arc(x + 3, y + s * 0.42, s * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.drawImage(image, x - s / 2, y - s / 2, s, s)
    ctx.restore()
}

function drawFloaters(ctx, state, pal) {
    var i
    for (i = 0; i < state.floaters.length; i++) {
        var f = state.floaters[i]
        var sy = screenY(state, f.y) - (1.15 - f.life) * 42
        ctx.globalAlpha = f.life > 1 ? 1 : Math.max(0, f.life)
        ctx.font = "bold 22px monospace"
        ctx.fillStyle = pal.ink
        ctx.fillText(f.text, f.x + 2, sy + 2)
        ctx.fillStyle = pal.signal
        ctx.fillText(f.text, f.x, sy)
        ctx.globalAlpha = 1
    }
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

function drawChaser(ctx, x, y, special, pal) {
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
    ctx.fillStyle = special ? pal.opsBlue : pal.blue
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
    ctx.fillStyle = special ? pal.opsBlue : pal.blue
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
    ctx.strokeStyle = special ? pal.ops : pal.blue
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
        ctx.fillStyle = pal.blueDark
        ctx.beginPath()
        ctx.arc(0, -28, 8, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(-11, -28, 22, 3)
        ctx.fillStyle = pal.blue
        ctx.fillRect(-12, -26, 24, 3)
    }
    ctx.restore()
}

function drawIncoming(ctx, state, ch, special, pal) {
    var sy = screenY(state, ch.y)
    if (sy >= 14) return
    ctx.fillStyle = special ? pal.ops : pal.blue
    var width = special ? 22 : 12
    ctx.fillRect(ch.x - width / 2, 10, width, 5)
}

function mod(n, m) {
    return ((n % m) + m) % m
}
