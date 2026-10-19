import QtQuick 2.15
import Qt.labs.settings 1.0
import "palette.js" as Palette
import "game.js" as Game
import "draw.js" as Draw

Item {
    id: root
    anchors.fill: parent
    implicitWidth: 960
    implicitHeight: 640
    focus: true
    activeFocusOnTab: true

    property var pal: Palette.tokens()
    property var input: ({ left: false, right: false, up: false, down: false })
    property var state: Game.createState()
    property bool booted: false
    property int frame: 0
    property string distanceLabel: "0 m"
    property string speedLabel: "0"
    property string statusLabel: "skiing"
    property string topLabel: "TOP TEN\n—"
    property bool showCaught: false
    property string caughtTitle: ""

    Settings {
        id: board
        category: "logos.ski"
        property string top: "[]"
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

    Canvas {
        id: canvas
        anchors.fill: parent
        antialiasing: true
        onPaint: Draw.paint(getContext("2d"), root.state, width, height)
    }

    MouseArea {
        anchors.fill: parent
        z: 1
        onPressed: root.forceActiveFocus()
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

        Text {
            anchors.left: parent.left
            anchors.leftMargin: 20
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
        width: 148
        height: topText.implicitHeight + 16
        color: root.pal.paper
        opacity: 0.92
        border.color: root.pal.steel
        border.width: 1

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
            text: root.activeFocus
                  ? "left / right steer    up slow    down fast    R restart    T early chase"
                  : "click the slope to ski"
            color: root.pal.paper
            font.pixelSize: 13
            font.family: "monospace"
        }
    }

    Rectangle {
        z: 3
        visible: root.showCaught
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

    Keys.onPressed: handleKey(event, true)
    Keys.onReleased: handleKey(event, false)

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
        syncHud()
        canvas.requestPaint()
        forceActiveFocus()
    }

    function tick() {
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
        var k = event.key
        if (k === Qt.Key_Left) input.left = down
        else if (k === Qt.Key_Right) input.right = down
        else if (k === Qt.Key_Up) input.up = down
        else if (k === Qt.Key_Down) input.down = down
        else if (down && k === Qt.Key_R) doRestart()
        else if (down && k === Qt.Key_T) Game.armFast(state)
        event.accepted = true
    }

    function doRestart() {
        Game.restart(state)
        saveScores()
        syncHud()
        canvas.requestPaint()
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

    function syncHud() {
        distanceLabel = Game.score(state) + " m"
        speedLabel = Math.floor(state.speed) + ""
        if (state.mode === "caught") {
            statusLabel = "caught"
            showCaught = true
            var who = state.caughtBy === "ops" ? "Special Ops" : "the policeman"
            caughtTitle = "CAUGHT\n" + who + "\n" + Game.score(state) + " m\nR restart"
        } else if (state.mode === "crash") {
            statusLabel = "wiped out"
            showCaught = false
        } else if (state.ops) {
            statusLabel = "special ops"
            showCaught = false
        } else if (state.police) {
            statusLabel = "policeman"
            showCaught = false
        } else {
            statusLabel = "skiing"
            showCaught = false
        }
        var lines = ["TOP TEN"]
        var list = state.top || []
        if (!list.length) lines.push("—")
        var i
        for (i = 0; i < list.length && i < 10; i++) {
            lines.push((i + 1) + "  " + list[i] + " m")
        }
        topLabel = lines.join("\n")
    }
}
