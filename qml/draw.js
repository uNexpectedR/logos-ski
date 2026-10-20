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
    for (i = 0; i < state.piles.length; i++) {
        var pile = state.piles[i]
        marks.push({
            sy: screenY(state, pile.y),
            kind: "pile",
            x: pile.x,
            y: screenY(state, pile.y),
            scale: pile.scale || 1
        })
    }
    for (i = 0; i < state.ramps.length; i++) {
        var ramp = state.ramps[i]
        marks.push({
            sy: screenY(state, ramp.y),
            kind: "ramp",
            x: ramp.x,
            y: screenY(state, ramp.y)
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
    drawBoost(ctx, state, pal)
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
    ctx.fillStyle = pal.snow
    ctx.fillRect(0, 0, w, h)
    var g = ctx.createLinearGradient(0, 0, w * 0.15, h)
    g.addColorStop(0, "rgba(255,255,255,0.72)")
    g.addColorStop(0.42, "rgba(255,255,255,0)")
    g.addColorStop(1, "rgba(168, 190, 182, 0.55)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    var edge = ctx.createLinearGradient(0, 0, 110, 0)
    edge.addColorStop(0, "rgba(150, 170, 164, 0.28)")
    edge.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = edge
    ctx.fillRect(0, 0, 120, h)
    var edgeR = ctx.createLinearGradient(w, 0, w - 120, 0)
    edgeR.addColorStop(0, "rgba(150, 170, 164, 0.22)")
    edgeR.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = edgeR
    ctx.fillRect(w - 130, 0, 130, h)
    ctx.fillStyle = "rgba(255,255,255,0.55)"
    var i
    for (i = 0; i < 4; i++) {
        var driftY = mod(i * 210 - state.travel * 0.25, h + 160) - 40
        var driftX = w * (0.12 + ((i * 0.23) % 1) * 0.7)
        ctx.save()
        ctx.translate(driftX, driftY)
        ctx.scale(1, 0.22)
        ctx.beginPath()
        ctx.arc(0, 0, 70 + i * 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
}

function drawMark(ctx, mark, pal, image) {
    if (mark.y < -120 || mark.y > 4000) return
    if (mark.kind === "tree") drawTree(ctx, mark.x, mark.y, mark.scale, pal)
    else if (mark.kind === "pile") drawPile(ctx, mark.x, mark.y, mark.scale, pal)
    else if (mark.kind === "ramp") drawRamp(ctx, mark.x, mark.y, pal)
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

function drawBoost(ctx, state, pal) {
    if (!state.boostT || state.boostT <= 0 || state.mode === "crash") return
    ctx.save()
    ctx.translate(state.skierX, state.skierScreenY - 86)
    ctx.font = "bold 18px monospace"
    ctx.fillStyle = pal.ink
    ctx.fillText("BOOST", -22, 2)
    ctx.fillStyle = pal.signal
    ctx.fillText("BOOST", -24, 0)
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

function drawPile(ctx, x, y, scale, pal) {
    var s = scale || 1
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.fillStyle = pal.pileShade
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.arc(10, 10, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(-12, 2, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(8, 0, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-2, -8, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.beginPath()
    ctx.arc(2, -4, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

function drawRamp(ctx, x, y, pal) {
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.12
    ctx.beginPath()
    ctx.moveTo(-34, 18)
    ctx.lineTo(40, 12)
    ctx.lineTo(40, 24)
    ctx.lineTo(-34, 26)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = "#e7eeea"
    ctx.beginPath()
    ctx.moveTo(-40, 16)
    ctx.lineTo(32, 16)
    ctx.lineTo(32, -20)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = pal.snowShade
    ctx.beginPath()
    ctx.moveTo(-40, 16)
    ctx.lineTo(-8, 16)
    ctx.lineTo(32, -20)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = pal.signal
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(32, 16)
    ctx.lineTo(32, -20)
    ctx.stroke()
    ctx.restore()
}

function drawSkier(ctx, state, pal) {
    if (state.invuln > 0 && Math.floor(state.invuln * 14) % 2 === 0) return
    var lean = state.vx / 340
    if (lean > 1) lean = 1
    if (lean < -1) lean = -1
    var lift = airLift(state)
    var up = lift > 8
    ctx.save()
    ctx.translate(state.skierX, state.skierScreenY)
    ctx.save()
    ctx.translate(lean * 8, 48)
    var shrink = 1 - Math.min(0.5, lift / 150)
    ctx.scale(2 * shrink, 0.42 * shrink)
    ctx.fillStyle = pal.ink
    ctx.globalAlpha = 0.16 * shrink
    ctx.beginPath()
    ctx.arc(0, 0, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.translate(0, -lift)
    if (state.mode === "crash") ctx.rotate(state.tumble)
    else ctx.rotate(-lean * 0.45)
    ctx.scale(1.2, 1.2)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Skis turn a little more than the body. Tips stay at +y, downhill.
    var skiTurn = state.mode === "crash" ? 0 : -lean * 0.5
    var cosT = Math.cos(skiTurn)
    var sinT = Math.sin(skiTurn)
    var footX = [-14, 14]
    var footY = 22
    var bootX = []
    var bootY = []
    var i
    for (i = 0; i < 2; i++) {
        bootX[i] = footX[i] * cosT - footY * sinT
        bootY[i] = footX[i] * sinT + footY * cosT
    }

    ctx.save()
    ctx.rotate(skiTurn)
    for (i = 0; i < 2; i++) {
        var sx = footX[i]
        ctx.fillStyle = pal.ink
        ctx.beginPath()
        ctx.moveTo(sx - 1.7, 20)
        ctx.lineTo(sx - 2.4, 46)
        ctx.quadraticCurveTo(sx, 54, sx + 2.4, 46)
        ctx.lineTo(sx + 1.7, 20)
        ctx.quadraticCurveTo(sx, 16, sx - 1.7, 20)
        ctx.fill()
        ctx.fillStyle = pal.steel
        ctx.fillRect(sx - 4.2, 20.2, 8.4, 2.6)
        ctx.fillStyle = pal.boot
        ctx.strokeStyle = pal.steel
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(sx - 5, 16)
        ctx.lineTo(sx + 5, 16)
        ctx.lineTo(sx + 4.2, 23.5)
        ctx.lineTo(sx - 4.2, 23.5)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
    }
    ctx.restore()

    var hipX = [-7, 7]
    var hipY = -16
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 4.5
    ctx.beginPath()
    for (i = 0; i < 2; i++) {
        var hx = hipX[i]
        var bx = bootX[i]
        var by = bootY[i] - 4
        var bend = hx < 0 ? -2.5 : 2.5
        var kx = hx + (bx - hx) * 0.5 + bend
        var ky = hipY + (by - hipY) * 0.55
        ctx.moveTo(hx, hipY)
        ctx.lineTo(kx, ky)
        ctx.lineTo(bx, by)
    }
    ctx.stroke()

    ctx.fillStyle = pal.signal
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(0, -40)
    ctx.lineTo(13, -30)
    ctx.lineTo(9, -16)
    ctx.lineTo(-9, -16)
    ctx.lineTo(-13, -30)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    var arm = lean * 8
    var handL = -20 - arm
    var handR = 20 - arm
    var handY = up ? -26 : -16
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-11, -28)
    ctx.lineTo(handL, handY)
    ctx.moveTo(11, -28)
    ctx.lineTo(handR, handY)
    ctx.stroke()
    var poleDrop = up ? -20 : 22
    ctx.strokeStyle = pal.steel
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(handL, handY)
    ctx.lineTo(handL - 5, poleDrop)
    ctx.moveTo(handR, handY)
    ctx.lineTo(handR + 4, poleDrop)
    ctx.stroke()
    ctx.fillStyle = pal.ink
    ctx.beginPath()
    ctx.arc(handL - 5, poleDrop, 2.2, 0, Math.PI * 2)
    ctx.arc(handR + 4, poleDrop, 2.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = pal.skin
    ctx.beginPath()
    ctx.arc(lean * 1.5, -48, 7.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.fillStyle = pal.ink
    ctx.fillRect(-10, -50, 20, 4)
    ctx.beginPath()
    ctx.moveTo(-7, -50)
    ctx.quadraticCurveTo(lean * 3, -66, 7, -50)
    ctx.fill()
    ctx.fillStyle = pal.signal
    ctx.beginPath()
    ctx.arc(lean * 2, -62, 3.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

function airLift(state) {
    if (!state.air || !state.airMax) return 0
    var u = state.air / state.airMax
    if (u < 0) u = 0
    if (u > 1) u = 1
    var peak = state.airMax > 0.75 ? 92 : 50
    return 4 * u * (1 - u) * peak
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
