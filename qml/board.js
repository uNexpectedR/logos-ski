var TOPIC = "/logos-ski/1/scores/json"
var LIMIT = 10

function rowScore(row) {
    if (typeof row === "number") return row
    if (row && typeof row.score === "number") return row.score
    return NaN
}

function qualifies(rows, points) {
    if (typeof points !== "number" || points !== points || points <= 0) return false
    if (!rows || rows.length < LIMIT) return true
    var lastScore = rowScore(rows[rows.length - 1])
    if (lastScore !== lastScore) return true
    return points >= lastScore
}

function cleanName(raw) {
    if (raw === null || raw === undefined) return ""
    var s = String(raw).replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
    var out = ""
    var i
    for (i = 0; i < s.length && out.length < 16; i++) {
        var code = s.charCodeAt(i)
        var c = s.charAt(i)
        var ok = (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) ||
            c === " " || c === "-" || c === "_"
        if (ok) out += c
    }
    return out.replace(/^\s+|\s+$/g, "")
}

function takeRow(map, order, row) {
    if (!row || row.id === undefined || row.id === null || row.id === "") return
    var id = String(row.id)
    var name = cleanName(row.name)
    if (!name) return
    if (typeof row.score !== "number" || row.score !== row.score || row.score < 0) return
    var prev = map[id]
    if (!prev) {
        map[id] = { name: name, score: row.score, id: id }
        order.push(id)
    } else if (row.score > prev.score) {
        map[id] = { name: name, score: row.score, id: id }
    }
}

function merge(rows, entry) {
    var map = {}
    var order = []
    var i
    if (rows) {
        for (i = 0; i < rows.length; i++) takeRow(map, order, rows[i])
    }
    if (entry) takeRow(map, order, entry)
    var next = []
    for (i = 0; i < order.length; i++) next.push(map[order[i]])
    next.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score
        if (a.name < b.name) return -1
        if (a.name > b.name) return 1
        if (a.id < b.id) return -1
        if (a.id > b.id) return 1
        return 0
    })
    if (next.length > LIMIT) next.length = LIMIT
    return next
}

function scoreMessage(name, points, id) {
    return JSON.stringify({ kind: "score", name: name, score: points, id: id })
}

function boardPointer(cid) {
    return JSON.stringify({ kind: "board", cid: cid })
}

function boardDocument(rows) {
    return JSON.stringify({ kind: "logos-ski-board", rows: rows })
}

function parsePayload(text) {
    if (!text || typeof text !== "string") return null
    var obj
    try {
        obj = JSON.parse(text)
    } catch (e) {
        return null
    }
    if (!obj || typeof obj !== "object") return null
    if (obj.kind === "score") {
        var name = cleanName(obj.name)
        if (!name) return null
        if (typeof obj.score !== "number" || obj.score !== obj.score) return null
        if (obj.id === undefined || obj.id === null || obj.id === "") return null
        return { kind: "score", name: name, score: obj.score, id: String(obj.id) }
    }
    if (obj.kind === "board") {
        if (!obj.cid || typeof obj.cid !== "string") return null
        return { kind: "board", cid: obj.cid }
    }
    if (obj.kind === "logos-ski-board") {
        if (!obj.rows || obj.rows.length === undefined) return null
        return { kind: "logos-ski-board", rows: merge(obj.rows, null) }
    }
    return null
}

function b64decode(input) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    var s = String(input || "").replace(/[^A-Za-z0-9+/=]/g, "")
    var out = ""
    var i = 0
    while (i < s.length) {
        var a = chars.indexOf(s.charAt(i++))
        var b = chars.indexOf(s.charAt(i++))
        var cch = s.charAt(i++)
        var dch = s.charAt(i++)
        var c = chars.indexOf(cch)
        var d = chars.indexOf(dch)
        if (a < 0 || b < 0) break
        var n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d)
        out += String.fromCharCode((n >> 16) & 255)
        if (c >= 0 && cch !== "=") out += String.fromCharCode((n >> 8) & 255)
        if (d >= 0 && dch !== "=") out += String.fromCharCode(n & 255)
    }
    return out
}

function lines(rows) {
    if (!rows || !rows.length) return ["—"]
    var out = []
    var i
    for (i = 0; i < rows.length && i < LIMIT; i++) {
        out.push((i + 1) + "  " + rows[i].name + "  " + rows[i].score)
    }
    return out
}

function runBoardTests() {
    function eq(label, got, want) {
        var gs = JSON.stringify(got)
        var ws = JSON.stringify(want)
        if (gs !== ws) throw new Error(label + " got " + gs + " want " + ws)
    }
    if (qualifies([], 0)) throw new Error("zero")
    if (!qualifies([], 12)) throw new Error("empty board")
    var full = []
    var n
    for (n = 0; n < 10; n++) full.push({ name: "p" + n, score: 100 - n, id: "i" + n })
    if (qualifies(full, 50)) throw new Error("below last")
    if (!qualifies(full, 200)) throw new Error("above last")
    if (!qualifies(full, 91)) throw new Error("tie last")
    var numbers = []
    for (n = 0; n < 10; n++) numbers.push(100 - n)
    if (qualifies(numbers, 50)) throw new Error("number below")
    if (!qualifies(numbers, 100)) throw new Error("number tie")
    var merged = merge(
        [{ name: "ada", score: 10, id: "a" }, { name: "bea", score: 30, id: "b" }],
        { name: "ada", score: 40, id: "a" }
    )
    eq("merge", merged, [
        { name: "ada", score: 40, id: "a" },
        { name: "bea", score: 30, id: "b" }
    ])
    var many = []
    for (n = 0; n < 12; n++) many.push({ name: "n" + n, score: n, id: "k" + n })
    if (merge(many, null).length !== 10) throw new Error("cap")
    if (merge(many, null)[0].score !== 11) throw new Error("sort")
    var score = parsePayload(scoreMessage("Ada", 15, "z1"))
    eq("score", score, { kind: "score", name: "Ada", score: 15, id: "z1" })
    eq("pointer", parsePayload(boardPointer("bafy")), { kind: "board", cid: "bafy" })
    var doc = parsePayload(boardDocument([{ name: "Cy", score: 3, id: "c" }]))
    eq("doc", doc.rows, [{ name: "Cy", score: 3, id: "c" }])
    if (parsePayload("nope") !== null) throw new Error("garbage")
    if (parsePayload('{"kind":"score","name":"***","score":1,"id":"x"}') !== null) throw new Error("bad name")
    if (b64decode("eyJhIjoxfQ==") !== '{"a":1}') throw new Error("b64")
    if (cleanName("  Ada   Lovelace  ") !== "Ada Lovelace") throw new Error("name")
    console.log("board tests ok")
}

if (typeof global !== "undefined" && global.__SKI_BOARD_TEST) {
    runBoardTests()
}
