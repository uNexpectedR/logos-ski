import QtQuick 2.15
import Qt.labs.settings 1.0
import "palette.js" as Palette
import "game.js" as Game
import "draw.js" as Draw
import "board.js" as Board

Item {
    id: root
    anchors.fill: parent
    implicitWidth: 960
    implicitHeight: 640
    focus: true
    activeFocusOnTab: true

    property var pal: Palette.tokens()
    property var input: ({ left: false, right: false, up: false, down: false, hop: false, shift: false })
    property var state: Game.createState()
    property bool booted: false
    property bool keysReady: false
    property int frame: 0
    property string distanceLabel: "0 m"
    property string speedLabel: "0"
    property string statusLabel: "skiing"
    property string topLabel: "SHARED\n—\n\nTOP TEN\n—"
    property bool showCaught: false
    property string caughtTitle: ""

    property var bridge: null
    property var sharedRows: []
    property string deliveryState: "wait"
    property string storageState: "wait"
    property bool deliveryFailed: false
    property bool storageFailed: false
    property bool deliveryTimedOut: false
    property bool subscribed: false
    property bool connected: false
    property bool deliveryStarted: false
    property bool showName: false
    property bool publishing: false
    property string publishNote: ""
    property int pendingPoints: 0
    property bool holdRestart: false
    property bool asked: false
    property bool waitingToAsk: false
    property string pendingRequest: ""
    property string pendingBody: ""
    property int sendTries: 0
    property int createTries: 0
    property int startTries: 0
    property int subscribeTries: 0
    property bool nodeCreated: false
    property string rlnRegistry: "logos:testnet:fd322d32a46ddf57eece9db8d68e9b722262d1f770760fca63b8cb9e7775b971"
    property string rlnId: "5e269b6a19fce081f5808b13442dcbc3522197638dd38df5a28bc4e55236b977"
    property string downloadCid: ""
    property string downloadBuf: ""
    property string uploadSession: ""
    property string uploadBody: ""
    property bool uploadBusy: false
    property string uploadedKey: ""
    property var seenHashes: ({})

    Settings {
        id: board
        category: "logos.ski"
        property string top: "[]"
        property string cid: ""
        property string player: ""
    }

    Timer {
        interval: 40
        repeat: true
        running: !root.booted
        onTriggered: root.boot()
    }

    Timer {
        interval: 16
        repeat: true
        running: root.booted
        onTriggered: root.tick()
    }

    Timer {
        id: deliveryWatch
        interval: 2000
        repeat: true
        running: root.booted && root.deliveryState === "wait"
        onTriggered: root.pollDelivery()
    }

    Timer {
        id: giveUp
        interval: 22000
        repeat: false
        running: root.booted && root.deliveryState === "wait"
        onTriggered: root.deliveryGiveUp()
    }

    Timer {
        id: uploadTimer
        interval: 1200
        repeat: false
        onTriggered: root.uploadBoard()
    }

    Timer {
        id: sendRetry
        interval: 4000
        repeat: false
        onTriggered: root.sendPending()
    }

    Timer {
        id: createRetry
        interval: 3000
        repeat: false
        onTriggered: root.startDelivery()
    }

    Timer {
        id: startRetry
        interval: 3000
        repeat: false
        onTriggered: root.beginStart()
    }

    Timer {
        id: subscribeRetry
        interval: 3000
        repeat: false
        onTriggered: root.subscribeTopic()
    }

    Connections {
        target: root.bridge
        function onModuleEventReceived(moduleName, eventName, data) {
            root.onModuleEvent(moduleName, eventName, data)
        }
    }

    Image {
        id: mark
        source: "lambda.png"
        asynchronous: false
        visible: false
        onStatusChanged: canvas.requestPaint()
    }

    Canvas {
        id: canvas
        anchors.fill: parent
        antialiasing: true
        onPaint: Draw.paint(getContext("2d"), root.state, width, height,
                            mark.status === Image.Ready ? mark : null)
    }

    MouseArea {
        anchors.fill: parent
        z: 1
        onPressed: {
            if (root.showName) {
                root.focusName()
                return
            }
            root.keysReady = true
            root.forceActiveFocus()
        }
    }

    Rectangle {
        z: 2
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 58
        color: root.pal.paper
        opacity: 0.94

        Rectangle {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: 8
            color: root.pal.signal
        }

        Image {
            id: brand
            anchors.left: parent.left
            anchors.leftMargin: 16
            anchors.verticalCenter: parent.verticalCenter
            width: 42
            height: 42
            source: "logo.png"
            fillMode: Image.PreserveAspectFit
        }

        Text {
            anchors.left: brand.right
            anchors.leftMargin: 8
            anchors.verticalCenter: parent.verticalCenter
            text: "LOGOS SKI"
            color: root.pal.ink
            font.pixelSize: 18
            font.bold: true
            font.family: "monospace"
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            text: root.distanceLabel
            color: root.pal.ink
            font.pixelSize: 22
            font.bold: true
            font.family: "monospace"
        }

        Text {
            anchors.right: parent.right
            anchors.rightMargin: 18
            anchors.verticalCenter: parent.verticalCenter
            text: root.speedLabel + "   " + root.statusLabel
            color: root.pal.steel
            font.pixelSize: 14
            font.family: "monospace"
        }
    }

    Rectangle {
        z: 2
        anchors.top: parent.top
        anchors.topMargin: 70
        anchors.right: parent.right
        anchors.rightMargin: 12
        width: 228
        height: Math.min(topText.implicitHeight + 16, root.height - 120)
        color: root.pal.paper
        opacity: 0.92
        border.color: root.pal.steel
        border.width: 1
        clip: true

        Text {
            id: topText
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 8
            text: root.topLabel
            color: root.pal.ink
            font.pixelSize: 13
            font.family: "monospace"
            wrapMode: Text.NoWrap
        }
    }

    Rectangle {
        z: 2
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 32
        color: root.pal.ink

        Text {
            anchors.centerIn: parent
            text: root.keysReady
                  ? "left / right steer    up slow    down fast    space jump    shift+left/right dash    R restart"
                  : "click the slope to ski"
            color: root.pal.paper
            font.pixelSize: 13
            font.family: "monospace"
        }
    }

    Rectangle {
        z: 3
        visible: root.showCaught && !root.showName
        anchors.centerIn: parent
        width: 320
        height: 168
        color: root.pal.paper
        border.color: root.pal.ink
        border.width: 2

        Rectangle {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: 8
            color: root.pal.signal
        }

        Text {
            anchors.centerIn: parent
            horizontalAlignment: Text.AlignHCenter
            text: root.caughtTitle
            color: root.pal.ink
            font.pixelSize: 18
            font.bold: true
            font.family: "monospace"
        }
    }

    Rectangle {
        id: nameCard
        z: 4
        visible: root.showName
        anchors.centerIn: parent
        width: 360
        height: 220
        color: root.pal.paper
        border.color: root.pal.ink
        border.width: 2

        Rectangle {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: 8
            color: root.pal.signal
        }

        Text {
            id: nameTitle
            anchors.top: parent.top
            anchors.topMargin: 22
            anchors.horizontalCenter: parent.horizontalCenter
            horizontalAlignment: Text.AlignHCenter
            text: "NAME\n" + root.pendingPoints + " pts on the board"
            color: root.pal.ink
            font.pixelSize: 18
            font.bold: true
            font.family: "monospace"
        }

        Rectangle {
            anchors.top: nameTitle.bottom
            anchors.topMargin: 16
            anchors.horizontalCenter: parent.horizontalCenter
            width: 240
            height: 36
            color: root.pal.paper
            border.color: root.pal.steel
            border.width: 1

            TextInput {
                id: nameField
                anchors.fill: parent
                anchors.margins: 6
                color: root.pal.ink
                font.pixelSize: 16
                font.family: "monospace"
                maximumLength: 16
                selectByMouse: true
                activeFocusOnPress: true
                clip: true
                onAccepted: root.submitName()
            }
        }

        Text {
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 18
            anchors.left: parent.left
            anchors.leftMargin: 28
            text: "save"
            color: root.pal.ink
            font.pixelSize: 16
            font.bold: true
            font.family: "monospace"

            MouseArea {
                anchors.fill: parent
                anchors.margins: -8
                onClicked: root.submitName()
            }
        }

        Text {
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 18
            anchors.right: parent.right
            anchors.rightMargin: 28
            text: "skip"
            color: root.pal.steel
            font.pixelSize: 16
            font.family: "monospace"

            MouseArea {
                anchors.fill: parent
                anchors.margins: -8
                onClicked: root.skipName()
            }
        }
    }

    Keys.enabled: !nameField.activeFocus
    Keys.onPressed: handleKey(event, true)
    Keys.onReleased: {
        handleKey(event, false)
        if (showName && !nameField.activeFocus) nameFocus.restart()
    }

    Timer {
        id: nameFocus
        interval: 120
        repeat: false
        onTriggered: {
            if (!root.showName) return
            nameField.forceActiveFocus()
            if (nameField.text === "R" || nameField.text === "r") nameField.text = ""
        }
    }

    function boot() {
        if (booted) return
        if (width < 40 || height < 40) return
        state.width = width
        state.height = height
        state.skierScreenY = height * 0.34
        state.skierX = width * 0.5
        state.placed = true
        loadScores()
        Game.prime(state)
        booted = true
        keysReady = true
        openBoard()
        syncHud()
        canvas.requestPaint()
        forceActiveFocus()
    }

    function tick() {
        if (showName || holdRestart) {
            syncHud()
            canvas.requestPaint()
            return
        }
        state.width = width
        state.height = height
        state.skierScreenY = height * 0.34
        Game.step(state, 0.016, input)
        if (state.scoreDirty) saveScores()
        frame = frame + 1
        syncHud()
        canvas.requestPaint()
    }

    function handleKey(event, down) {
        if (showName) {
            event.accepted = false
            return
        }
        var k = event.key
        if (k === Qt.Key_Left) input.left = down
        else if (k === Qt.Key_Right) input.right = down
        else if (k === Qt.Key_Up) input.up = down
        else if (k === Qt.Key_Down) input.down = down
        else if (down && k === Qt.Key_Space) input.hop = true
        else if (k === Qt.Key_Shift) input.shift = down
        else if (down && k === Qt.Key_R) doRestart()
        else if (down && k === Qt.Key_T) Game.armFast(state)
        event.accepted = true
    }

    function doRestart() {
        if (showName) return
        var points = Game.score(state)
        var wantName = !asked && points > 0 &&
                (Board.qualifies(state.top, points) || Board.qualifies(sharedRows, points))
        if (wantName) {
            pendingPoints = points
            holdRestart = true
            waitingToAsk = true
            maybeAsk()
            return
        }
        doRestartNow()
    }

    function doRestartNow() {
        holdRestart = false
        waitingToAsk = false
        asked = false
        showName = false
        if (!pendingBody) publishing = false
        pendingPoints = 0
        Game.restart(state)
        saveScores()
        syncHud()
        canvas.requestPaint()
        forceActiveFocus()
    }

    function maybeAsk() {
        if (asked || showName) return
        if (state.mode !== "caught" && !waitingToAsk) return
        var points = Game.score(state)
        if (!Board.qualifies(state.top, points) && !Board.qualifies(sharedRows, points)) {
            if (holdRestart) doRestartNow()
            return
        }
        asked = true
        waitingToAsk = false
        if (typeof state.frozenScore !== "number") state.frozenScore = points
        pendingPoints = state.frozenScore
        showName = true
        nameField.text = ""
        nameFocus.restart()
    }

    function focusName() {
        nameField.forceActiveFocus()
        nameFocus.restart()
    }

    function submitName() {
        var name = Board.cleanName(nameField.text)
        if (!name) return
        board.player = name
        Game.recordScore(state, name)
        saveScores()
        var id = Date.now() + "-" + Math.floor(Math.random() * 1000000)
        var body = Board.scoreMessage(name, pendingPoints, id)
        showName = false
        publishNote = ""
        pendingBody = body
        sendTries = 0
        if (subscribed || deliveryState !== "down") {
            publishing = true
            sendPending()
        } else {
            publishing = false
            pendingBody = ""
        }
        syncHud()
        finishAsk()
    }

    function sendPending() {
        if (!pendingBody) return
        if (!subscribed) {
            if (deliveryState === "down") {
                publishing = false
                publishNote = "score was not published"
                syncHud()
                return
            }
            sendRetry.restart()
            return
        }
        if (sendTries >= 4) {
            publishing = false
            publishNote = "score was not published"
            boardLog("delivery_module.send gave up")
            syncHud()
            return
        }
        sendTries = sendTries + 1
        var body = pendingBody
        callMod("delivery_module", "send", [Board.TOPIC, body], function (res) {
            var parsed = asResult(res)
            if (!parsed.ok) {
                boardLog("delivery_module.send failed " + parsed.error)
                if (sendTries < 4) sendRetry.restart()
                else {
                    publishing = false
                    publishNote = "score was not published"
                    syncHud()
                }
                return
            }
            pendingRequest = parsed.value ? String(parsed.value) : ""
            boardLog("delivery_module.send " + pendingRequest)
        })
    }

    function skipName() {
        if (!state.recorded) Game.recordScore(state)
        saveScores()
        showName = false
        publishing = false
        pendingBody = ""
        finishAsk()
    }

    function finishAsk() {
        if (holdRestart || state.mode === "caught") doRestartNow()
        else syncHud()
    }

    function loadScores() {
        try {
            var parsed = JSON.parse(board.top || "[]")
            if (parsed && parsed.length !== undefined) state.top = parsed
        } catch (e) {
            state.top = []
        }
    }

    function saveScores() {
        try {
            board.top = JSON.stringify(state.top)
        } catch (e) {
        }
        state.scoreDirty = false
    }

    function localLine(entry, index) {
        var n = index + 1
        if (typeof entry === "number") return n + "  " + entry
        if (entry && entry.name) return n + "  " + entry.name + "  " + entry.score
        if (entry && typeof entry.score === "number") return n + "  " + entry.score
        return n + "  " + entry
    }

    function syncHud() {
        distanceLabel = Game.score(state) + " pts"
        speedLabel = Math.floor(state.speed) + ""
        if (state.mode === "caught") {
            statusLabel = "caught"
            showCaught = true
            var who = state.caughtBy === "ops" ? "Special Ops" : "the government"
            caughtTitle = "CAUGHT\n" + who + "\n" + Game.score(state) + " pts\nR restart"
        } else if (state.mode === "crash") {
            statusLabel = "wiped out"
            showCaught = false
        } else if (state.air > 0) {
            statusLabel = "air"
            showCaught = false
        } else if (state.ops) {
            statusLabel = "special ops"
            showCaught = false
        } else if (state.agent) {
            statusLabel = "government"
            showCaught = false
        } else {
            statusLabel = "skiing"
            showCaught = false
        }
        var lines = ["SHARED"]
        var remote = sharedRows || []
        if (deliveryState === "down" && storageState !== "up" && !remote.length) {
            lines.push("shared board unavailable")
        } else if (deliveryState === "down" && !remote.length) {
            lines.push("shared board unavailable")
        } else if (remote.length) {
            var shown = Board.lines(remote)
            var n
            for (n = 0; n < shown.length; n++) lines.push(shown[n])
        } else if (publishing) {
            lines.push("publishing")
        } else if (publishNote) {
            lines.push(publishNote)
        } else if (deliveryState === "down") {
            lines.push("shared board unavailable")
        } else {
            lines.push("—")
        }
        lines.push("")
        lines.push("TOP TEN")
        var list = state.top || []
        if (!list.length) lines.push("—")
        var i
        for (i = 0; i < list.length && i < 10; i++) {
            lines.push(localLine(list[i], i))
        }
        topLabel = lines.join("\n")
        if (state.mode === "caught" || waitingToAsk) maybeAsk()
    }

    function logosObject() {
        try {
            if (typeof logos !== "undefined" && logos && logos.callModuleAsync) return logos
        } catch (e) {
        }
        return null
    }

    function boardLog(text) {
        console.log("SKI-BOARD " + text)
    }

    function asResult(payload) {
        if (payload === null || payload === undefined) {
            return { ok: false, value: null, error: "empty" }
        }
        var text = typeof payload === "string" ? payload : ""
        if (typeof payload !== "string") {
            try { text = JSON.stringify(payload) } catch (e2) { text = String(payload) }
        }
        var obj = null
        try { obj = JSON.parse(text) } catch (e3) { obj = null }
        if (obj && typeof obj === "object" &&
                (obj.success === true || obj.success === false || obj.error)) {
            return {
                ok: obj.success === true,
                value: obj.value !== undefined ? obj.value : null,
                error: obj.error ? String(obj.error) : ""
            }
        }
        if (text === "true") return { ok: true, value: true, error: "" }
        if (text === "false") return { ok: false, value: false, error: "" }
        if (obj !== null) return { ok: true, value: obj, error: "" }
        return { ok: text.length > 0, value: text, error: text.length ? "" : "empty" }
    }

    function softError(err) {
        var s = (err || "").toLowerCase()
        return s.indexOf("already") >= 0 || s.indexOf("exist") >= 0 || s.indexOf("running") >= 0
    }

    function callMod(moduleName, method, args, done, timeoutMs) {
        var api = bridge || logosObject()
        if (!api) {
            done("{\"success\":false,\"error\":\"logos bridge missing\"}")
            return
        }
        try {
            api.callModuleAsync(moduleName, method, args, function (payload) {
                done(payload)
            }, timeoutMs || 20000)
        } catch (e) {
            done("{\"success\":false,\"error\":\"" + String(e) + "\"}")
        }
    }

    function openBoard() {
        var api = logosObject()
        if (!api) {
            deliveryFailed = true
            storageFailed = true
            deliveryState = "down"
            storageState = "down"
            boardLog("logos bridge missing")
            syncHud()
            return
        }
        bridge = api
        arm("delivery_module", "messageReceived")
        arm("delivery_module", "connectionStateChanged")
        arm("delivery_module", "messageError")
        arm("delivery_module", "messageSent")
        arm("delivery_module", "messagePropagated")
        arm("delivery_module", "rlnStateChanged")
        arm("storage_module", "storageStart")
        arm("storage_module", "storageDownloadProgress")
        arm("storage_module", "storageDownloadDone")
        arm("storage_module", "storageUploadProgress")
        startDelivery()
        startStorage()
    }

    function arm(moduleName, eventName) {
        var api = bridge || logosObject()
        var ok = false
        try {
            ok = api.onModuleEvent(moduleName, eventName) === true
        } catch (e) {
            ok = false
            boardLog(moduleName + " " + eventName + " arm threw " + e)
        }
        boardLog(moduleName + "." + eventName + (ok ? " armed" : " not armed"))
        if (!ok) {
            if (moduleName === "delivery_module") deliveryFailed = true
            if (moduleName === "storage_module") storageFailed = true
        }
    }

    function startDelivery() {
        if (deliveryStarted) return
        if (nodeCreated) {
            beginStart()
            return
        }
        if (createTries >= 2) return
        createTries = createTries + 1
        callMod("delivery_module", "createNode",
                ['{"mode":"Edge","preset":"logos.dev"}'], function (payload) {
            var parsed = asResult(payload)
            boardLog("delivery_module.createNode " + (parsed.ok ? "ok" : parsed.error))
            if (!parsed.ok && !softError(parsed.error)) {
                if (createTries < 2) {
                    boardLog("delivery_module.createNode retry")
                    createRetry.restart()
                    return
                }
                deliveryFailed = true
                refreshDelivery()
                return
            }
            nodeCreated = true
            beginStart()
        })
    }

    function beginStart() {
        if (deliveryStarted || startTries >= 2) return
        startTries = startTries + 1
        callMod("delivery_module", "start", [], function (payload2) {
            var started = asResult(payload2)
            boardLog("delivery_module.start " + (started.ok ? "ok" : started.error))
            if (!started.ok && !softError(started.error)) {
                if (startTries < 2) {
                    boardLog("delivery_module.start retry")
                    startRetry.restart()
                    return
                }
                deliveryFailed = true
                refreshDelivery()
                return
            }
            deliveryStarted = true
            subscribeTopic()
            pollDelivery()
            readRln()
        })
    }

    function readRln() {
        callMod("delivery_module", "rlnState", [], function (payload) {
            var parsed = asResult(payload)
            var state = parsed.ok && parsed.value ? String(parsed.value) : parsed.error
            boardLog("delivery_module.rlnState " + state)
            if (state === "Ready") ensureMembership()
        })
    }

    function ensureMembership() {
        callMod("liblogos_rln_module", "get_membership_state", [rlnRegistry, rlnId], function (payload) {
            var text = typeof payload === "string" ? payload : ""
            boardLog("liblogos_rln_module.get_membership_state " + text)
            if (text.indexOf("\"active\"") >= 0 || text.indexOf("\"grace_period\"") >= 0 || text.indexOf("\"pending\"") >= 0) return
            callMod("liblogos_rln_module", "register_membership", [rlnRegistry, rlnId, "[]"], function (reg) {
                boardLog("liblogos_rln_module.register_membership " + reg)
            }, 70000)
        }, 70000)
    }

    function subscribeTopic() {
        if (subscribed || subscribeTries >= 3) return
        subscribeTries = subscribeTries + 1
        callMod("delivery_module", "subscribe", [Board.TOPIC], function (payload) {
            var parsed = asResult(payload)
            boardLog("delivery_module.subscribe " + (parsed.ok ? "ok" : parsed.error))
            if (!parsed.ok && !softError(parsed.error)) {
                if (subscribeTries < 3) {
                    boardLog("delivery_module.subscribe retry")
                    subscribeRetry.restart()
                    return
                }
                deliveryFailed = true
                refreshDelivery()
                return
            }
            subscribed = true
            refreshDelivery()
            if (pendingBody) sendPending()
        })
    }

    function pollDelivery() {
        if (!deliveryStarted) return
        callMod("delivery_module", "getConnectionStatus", [], function (payload) {
            var parsed = asResult(payload)
            var status = parsed.value ? String(parsed.value) : ""
            if (!parsed.ok) {
                boardLog("delivery_module.getConnectionStatus " + parsed.error)
                return
            }
            noteConnection(status)
        })
    }

    function noteConnection(status) {
        boardLog("delivery_module.connection " + status)
        if (status === "Connected" || status === "PartiallyConnected") {
            connected = true
            if (!subscribed) subscribeTopic()
            refreshDelivery()
        }
    }

    function refreshDelivery() {
        if (subscribed) {
            if (deliveryState !== "up") {
                deliveryState = "up"
                boardLog("delivery_module up")
                syncHud()
            }
            return
        }
        if ((deliveryFailed || deliveryTimedOut) && deliveryState !== "down") {
            deliveryState = "down"
            boardLog("delivery_module unavailable")
            syncHud()
        }
    }

    function deliveryGiveUp() {
        if (!subscribed && deliveryState !== "up") {
            deliveryTimedOut = true
            boardLog("delivery_module timed out")
            refreshDelivery()
        }
        if (storageState === "wait") {
            storageFailed = true
            storageState = "down"
            boardLog("storage_module timed out")
            syncHud()
        }
    }

    function startStorage() {
        callMod("storage_module", "loadConfigOrDefault", [], function (payload) {
            var parsed = asResult(payload)
            var cfg = parsed.ok && parsed.value ? String(parsed.value) : ""
            boardLog("storage_module.loadConfigOrDefault " + (cfg ? "ok" : parsed.error))
            if (!cfg) {
                storageFailed = true
                storageState = "down"
                boardLog("storage_module unavailable")
                syncHud()
                return
            }
            callMod("storage_module", "init", [cfg], function (payload2) {
                var inited = asResult(payload2)
                var initOk = inited.ok || inited.value === true || softError(inited.error)
                boardLog("storage_module.init " + (initOk ? "ok" : inited.error))
                if (!initOk) storageFailed = true
                callMod("storage_module", "start", [], function (payload3) {
                    var started = asResult(payload3)
                    var startOk = started.ok || started.value === true || softError(started.error)
                    boardLog("storage_module.start " + (startOk ? "ok" : started.error))
                    if (!startOk) {
                        storageFailed = true
                        storageState = "down"
                        boardLog("storage_module unavailable")
                        syncHud()
                    }
                })
            })
        })
    }

    function onModuleEvent(moduleName, eventName, data) {
        if (moduleName === "delivery_module") onDelivery(eventName, data)
        else if (moduleName === "storage_module") onStorage(eventName, data)
    }

    function field(data, index) {
        try {
            if (!data) return null
            return data[index]
        } catch (e) {
            return null
        }
    }

    function asText(value) {
        if (value === null || value === undefined) return ""
        if (typeof value === "string") return value
        try {
            var s = String(value)
            if (s && s !== "[object Object]") return s
        } catch (e) {
        }
        return ""
    }

    function onDelivery(eventName, data) {
        if (eventName === "connectionStateChanged") {
            noteConnection(asText(field(data, 0)))
            return
        }
        if (eventName === "rlnStateChanged") {
            var rln = asText(field(data, 0))
            boardLog("delivery_module.rlnStateChanged " + rln)
            if (rln === "Ready") ensureMembership()
            return
        }
        if (eventName === "messageError") {
            var req = asText(field(data, 0))
            var err = asText(field(data, 2))
            boardLog("delivery_module.messageError " + req + " " + err)
            if (pendingRequest && req !== pendingRequest) return
            if (pendingBody && sendTries < 4) {
                sendRetry.restart()
                return
            }
            publishing = false
            publishNote = "score was not published"
            syncHud()
            return
        }
        if (eventName === "messageSent") {
            boardLog("delivery_module.messageSent " + asText(field(data, 0)))
            return
        }
        if (eventName === "messagePropagated") {
            boardLog("delivery_module.messagePropagated " + asText(field(data, 0)))
            return
        }
        if (eventName !== "messageReceived") return
        var hash = asText(field(data, 0))
        var topic = asText(field(data, 1))
        if (topic && topic !== Board.TOPIC) return
        if (hash) {
            if (seenHashes[hash]) return
            seenHashes[hash] = true
        }
        var text = asText(field(data, 2))
        var parsed = Board.parsePayload(text)
        if (!parsed) parsed = Board.parsePayload(Board.b64decode(text))
        if (!parsed) {
            boardLog("delivery_module.messageReceived unparsed")
            return
        }
        if (parsed.kind === "score") {
            sharedRows = Board.merge(sharedRows, parsed)
            publishing = false
            publishNote = ""
            pendingBody = ""
            boardLog("delivery_module.score " + parsed.name + " " + parsed.score)
            scheduleUpload()
            syncHud()
            return
        }
        if (parsed.kind === "board" && parsed.cid && parsed.cid !== downloadCid) {
            board.cid = parsed.cid
            fetchBoard(parsed.cid)
        }
    }

    function onStorage(eventName, data) {
        var raw = asText(field(data, 0))
        var obj = null
        try { obj = JSON.parse(raw) } catch (e) { obj = null }
        if (eventName === "storageStart") {
            var up = obj && obj.success === true
            boardLog("storage_module.storageStart " + (up ? "ok" : raw))
            if (!up) {
                storageFailed = true
                storageState = "down"
                syncHud()
                return
            }
            storageState = "up"
            syncHud()
            if (board.cid) fetchBoard(board.cid)
            return
        }
        if (eventName === "storageDownloadProgress") {
            if (!obj || obj.success === false || !obj.chunk) return
            downloadBuf += Board.b64decode(obj.chunk)
            return
        }
        if (eventName === "storageDownloadDone") {
            var cid = downloadCid
            var ok = obj && obj.success !== false
            boardLog("storage_module.storageDownloadDone " + (ok ? cid : raw))
            if (!ok) {
                downloadBuf = ""
                downloadCid = ""
                return
            }
            var doc = Board.parsePayload(downloadBuf)
            downloadBuf = ""
            downloadCid = ""
            if (!doc || doc.kind !== "logos-ski-board") {
                boardLog("storage_module.board unparsed")
                return
            }
            var combined = Board.merge(sharedRows, null)
            var i
            for (i = 0; i < doc.rows.length; i++) combined = Board.merge(combined, doc.rows[i])
            sharedRows = combined
            boardLog("storage_module.board rows " + sharedRows.length)
            scheduleUpload()
            syncHud()
            return
        }
        if (eventName === "storageUploadProgress") {
            if (!obj || obj.sessionId !== uploadSession) return
            if (obj.success === false) {
                boardLog("storage_module.uploadChunk " + (obj.error || "failed"))
                uploadBusy = false
                uploadSession = ""
                return
            }
            var session = uploadSession
            callMod("storage_module", "uploadFinalize", [session], function (payload) {
                var parsed = asResult(payload)
                uploadBusy = false
                uploadSession = ""
                if (!parsed.ok || !parsed.value) {
                    boardLog("storage_module.uploadFinalize " + parsed.error)
                    return
                }
                var nextCid = String(parsed.value)
                board.cid = nextCid
                uploadedKey = JSON.stringify(sharedRows)
                boardLog("storage_module.uploadFinalize " + nextCid)
                callMod("delivery_module", "send", [Board.TOPIC, Board.boardPointer(nextCid)], function (sent) {
                    var announce = asResult(sent)
                    boardLog("delivery_module.board " + (announce.ok ? nextCid : announce.error))
                })
            })
        }
    }

    function fetchBoard(cid) {
        if (!cid || storageState !== "up" || downloadCid) return
        downloadCid = cid
        downloadBuf = ""
        boardLog("storage_module.downloadChunks " + cid)
        callMod("storage_module", "downloadChunks", [cid, false, 65536, false, true], function (payload) {
            var parsed = asResult(payload)
            if (!parsed.ok) {
                boardLog("storage_module.downloadChunks failed " + parsed.error)
                downloadCid = ""
                downloadBuf = ""
            }
        })
    }

    function scheduleUpload() {
        if (storageState !== "up") return
        if (!sharedRows || !sharedRows.length) return
        if (JSON.stringify(sharedRows) === uploadedKey) return
        uploadTimer.restart()
    }

    function uploadBoard() {
        if (storageState !== "up" || uploadBusy) return
        if (!sharedRows || !sharedRows.length) return
        var key = JSON.stringify(sharedRows)
        if (key === uploadedKey) return
        var body = Board.boardDocument(sharedRows)
        uploadBusy = true
        uploadBody = body
        callMod("storage_module", "uploadInit", ["logos-ski-board.json", 65536, true], function (payload) {
            var parsed = asResult(payload)
            if (!parsed.ok || !parsed.value) {
                uploadBusy = false
                boardLog("storage_module.uploadInit " + parsed.error)
                return
            }
            uploadSession = String(parsed.value)
            boardLog("storage_module.uploadInit " + uploadSession)
            callMod("storage_module", "uploadChunk", [uploadSession, body], function (chunked) {
                var chunk = asResult(chunked)
                if (!chunk.ok) {
                    uploadBusy = false
                    boardLog("storage_module.uploadChunk " + chunk.error)
                    uploadSession = ""
                }
            })
        })
    }
}
