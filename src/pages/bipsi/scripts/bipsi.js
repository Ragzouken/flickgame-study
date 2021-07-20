const bipsi = {};

// browser saves will be stored under the id "bipsi"
bipsi.storage = new maker.ProjectStorage("bipsi");

// type definitions for the structure of bipsi project data. useful for the
// code editor, ignored by the browser 
/**
 * @typedef {Object} BipsiDataSettings
 * @property {string} title
 */

/**
 * @typedef {Object} BipsiDataEventField
 * @property {string} key
 * @property {string} type
 * @property {any} data
 */

/**
 * @typedef {Object} BipsiDataEvent
 * @property {string} id
 * @property {number[]} position
 * @property {BipsiDataEventField[]} fields
 */

/**
 * @typedef {Object} BipsiDataRoom
 * @property {number} palette
 * @property {number[][]} tilemap
 * @property {number[][]} wallmap
 * @property {number[][]} highmap
 * @property {BipsiDataEvent[]} events
 */

/**
 * @typedef {Object} BipsiDataProject
 * @property {BipsiDataSettings} settings
 * @property {BipsiDataRoom[]} rooms
 * @property {string[][]} palettes
 * @property {string[]} tilesets
 */

/**
 * Return a list of resource ids that a particular bipsi project depends on. 
 * @param {BipsiDataProject} data 
 * @returns {string[]}
 */
bipsi.getManifest = function (data) {
     // only resources are the tileset images
     return data.tilesets;
}

bipsi.constants = {
    tileSize: 8,
    roomSize: 16,
    frameInterval: 400,

    tileset: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAjUlEQVR42u3XMQ4AEBAEwPv/p2kUIo5ScmYqQWU3QsSkDbu5TFBHVoDTfqemAFQKfy3BOs7WKBT+HLQCfBB+dgPcHnoKULAIp7ECfFoA30AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCFDjCu5xlD93/uAAAAAElFTkSuQmCC",

    wallTile: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAAZQTFRFAAAA////pdmf3QAAAAJ0Uk5TAP9bkSK1AAAAEklEQVQYlWNgYGBgpBAzDCMzACMQAEGgO/QHAAAAAElFTkSuQmCC",
    eventTile: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAAZQTFRFAAAA////pdmf3QAAAAJ0Uk5TAP9bkSK1AAAAGUlEQVQYlWNgwACMKAC7ALLqwS1AyC9oAAA0EABhSIRy/QAAAABJRU5ErkJggg==",
    startTile: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAAZQTFRFAAAA////pdmf3QAAAAJ0Uk5TAP9bkSK1AAAAJUlEQVQYlWNgwACMKAC7ALJqnALIqkEETD8lAhiGEnIHIb+gAQBFEACBGFbz9wAAAABJRU5ErkJggg==",

    colorwheelMargin: 12,
}
const TEMP_128 = createRendering2D(128, 128);
const TEMP_256 = createRendering2D(256, 256);

const TEMP_TILESET0 = createRendering2D(1, 1);
const TEMP_TILESET1 = createRendering2D(1, 1);

function randomPalette() {
    const h0 = Math.random();
    const h1 = h0 + Math.random() * .25;
    const h2 = h1 + Math.random() * .25;

    const background = HSVToRGB({ h: h0, s: .50, v: .2 });
    const foreground = HSVToRGB({ h: h1, s: .75, v: .5 });
    const highlight = HSVToRGB({ h: h2, s: .25, v: .75 });

    return [
        rgbToHex(background),
        rgbToHex(foreground),
        rgbToHex(highlight),
    ];
}

/** 
 * Create a valid bundle for an empty bipsi project.
 * @returns {maker.ProjectBundle<BipsiDataProject>} 
 */
bipsi.makeBlankBundle = function () {
    const project = {
        settings: { title: "bipsi game" },
        rooms: [],
        palettes: ZEROES(8).map(randomPalette),
        tilesets: ["0", "0"],
    };

    const resources = {
        "0": { type: "canvas-datauri", data: bipsi.constants.tileset },
    };

    return { project, resources };
}

function makeBlankRoom() {
    return {
        palette: 0,
        tilemap: ZEROES(16).map(() => REPEAT(16, -1)),
        highmap: ZEROES(16).map(() => REPEAT(16, -1)),
        wallmap: ZEROES(16).map(() => REPEAT(16, 0)),
        events: [],
    }
}

/** 
 * Update the given bipsi project data so that it's valid for this current
 * version of bipsi.
 * @param {BipsiDataProject} project 
 */
bipsi.updateProject = function(project) {
    for (let i = project.rooms.length; i < 24; ++i) {
        project.rooms.push(makeBlankRoom());
    }
    project.rooms.forEach((room) => room.events.forEach((event) => {
        event.id = event.id ?? nanoid();
        event.fields = event.fields ?? [];
    }));
}

function generateColorWheel(width, height) {
    const rendering = createRendering2D(width, height);
    withPixels(rendering, (pixels) => {
        const radius = width * .5;

        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                const [dx, dy] = [x - radius, y - radius];
                const h = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
                const s = Math.sqrt(dx*dx + dy*dy) / radius;

                const color = s > 1 ? 0 : RGBToUint32(HSVToRGB({ h, s, v: 1 }));
                pixels[y * width + x] = color;
            }
        }
    });
    return rendering;
}

/**
 * @param {HTMLCanvasElement} tileset 
 * @param {number} index 
 */
function getTileCoords(tileset, index) {
    const size = bipsi.constants.tileSize;
    const columns = tileset.width / size;

    return {
        x: size * (index % columns),
        y: size * Math.floor(index / columns),
        size,
    }
}

/**
 * @param {CanvasRenderingContext2D} tileset 
 * @param {number} tileIndex 
 * @param {CanvasRenderingContext2D} destination 
 * @returns 
 */
function copyTile(tileset, tileIndex, destination = undefined) {
    const { x, y, size } = getTileCoords(tileset.canvas, tileIndex);
    const tile = copyRendering2D(tileset, destination, { x, y, w: size, h: size });
    return tile;
}

/**
 * @param {CanvasRenderingContext2D} tileset 
 * @param {number} tileIndex
 * @param {CanvasRenderingContext2D} tile 
 * @returns 
 */
function drawTile(tileset, tileIndex, tile) {
    const { x, y, size } = getTileCoords(tileset.canvas, tileIndex);
    tileset.clearRect(x, y, size, size);
    tileset.drawImage(tile.canvas, x, y);
}

/**
 * 
 * @param {CanvasRenderingContext2D} rendering 
 * @param {CanvasRenderingContext2D} tileset 
 * @param {number[][]} tilemap 
 */
function drawTilemap(rendering, tileset, tilemap, background = undefined) {
    rendering.save();
    rendering.fillStyle = background;
    tilemap.forEach((row, dy) => {
        row.forEach((tileIndex, dx) => {
            if (tileIndex < 0) return;

            const { x, y, size } = getTileCoords(tileset.canvas, tileIndex);

            if (background) {
                rendering.fillRect(dx * size, dy * size, size, size);
            }

            rendering.drawImage(
                tileset.canvas,
                x, y, size, size, 
                dx * size, dy * size, size, size,
            );
        });
    });
    rendering.restore();
}

function drawEvents(rendering, tileset, events, background = undefined) {
    rendering.save();
    rendering.fillStyle = background;
    events.forEach((event) => {
        const [x, y] = event.position;
        const graphicField = event.fields.find((field) => field.key === "graphic");
        if (graphicField) {
            if (background) {
                rendering.fillStyle = background;
                rendering.fillRect(x * 8, y * 8, 8, 8);
            }
            const tile = copyTile(tileset, graphicField.data);
            rendering.drawImage(tile.canvas, x * 8, y * 8);
        }
    });
    rendering.restore();
}

/**
 * 
 * @param {CanvasRenderingContext2D} rendering 
 * @param {string[]} palette 
 * @param {BipsiDataRoom} room 
 */
function drawRoomThumbnail(rendering, palette, room) {
    const [background, foreground, highlight] = palette;
    const bg = hexToUint32(background);
    const fg = hexToUint32(foreground);
    const hi = hexToUint32(highlight);

    withPixels(rendering, (pixels) => {
        for (let y = 0; y < 16; ++y) {
            for (let x = 0; x < 16; ++x) {
                let color = bg;
                if (room.wallmap[y][x] === 1) color = fg;
                if (room.highmap[y][x] !== -1) color = hi;
                pixels[y * 16 + x] = color;
            }
        }

        room.events.forEach((event) => {
            const [x, y] = event.position;
            pixels[y * 16 + x] = hi;
        });
    });
}

/**
 * @param {any[][]} map 
 * @param {number} dx 
 * @param {number} dy 
 */
function cycleMap(map, dx, dy) {
    const x = dx > 0 ? dx : 16 + dx;
    const y = dy > 0 ? dy : 16 + dy;
    
    map.push(...map.splice(0, y));
    map.forEach((row) => {
        row.push(...row.splice(0, x));
    });
}

/**
 * @param {BipsiDataEvent[]} events 
 * @param {number} dx
 * @param {number} dy 
 */
function cycleEvents(events, dx, dy) {
    events.forEach((event) => {
        event.position[0] = (event.position[0] + 16 + dx) % 16;
        event.position[1] = (event.position[1] + 16 + dy) % 16;
    });
}

/**
 * @param {BipsiDataEvent[]} events 
 * @param {number} x
 * @param {number} y 
 */
function getEventsAt(events, x, y) {
    return events.filter((event) => event.position[0] === x && event.position[1] === y);
}

bipsi.PaletteEditor = class {
    /**
     * 
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        this.temporary = { h: 0, s: 0, v: 0, hex: "#000000" };
        this.temporary = undefined;

        /** @type {HTMLCanvasElement} */
        this.colorHueSat = ONE("#color-huesat");
        this.colorHueSatRendering = this.colorHueSat.getContext("2d");

        this.colorWheelGraphic = generateColorWheel(
            this.colorHueSat.width,
            this.colorHueSat.height,
        ).canvas;

        const margin = bipsi.constants.colorwheelMargin;
        this.colorHueSat.style.setProperty("margin", `-${margin}px`);
        this.colorHueSat.width += margin * 2;
        this.colorHueSat.height += margin * 2;

        this.colorSelect = ui.radio("color-select");
        this.colorValue = ui.slider("color-value");
        this.colorHex = ui.text("color-hex");

        this.colorSelect.selectedIndex = 0;

        this.editor.stateManager.addEventListener("change", () => {
            this.updateTemporaryFromData();
            this.refreshDisplay();
        });

        this.colorSelect.addEventListener("change", () => {
            this.updateTemporaryFromData();
            this.refreshDisplay();
        });

        this.colorValue.addEventListener("input", () => {
            const { color } = this.getSelections();

            color.v = this.colorValue.valueAsNumber;
            this.updateTemporaryFromHSV();
            this.refreshDisplay();
        });

        this.colorValue.addEventListener("change", () => {
            this.commitSelectedColorFromTemporary();
        });

        this.colorHex.addEventListener("change", () => {
            this.temporary.hex = this.colorHex.value;
            this.updateTemporaryFromHex();
            this.commitSelectedColorFromTemporary();
        });

        this.colorHueSat.addEventListener("pointerdown", (event) => {
            const drag = ui.drag(event);

            /** @param {PointerEvent} event */
            const update = (event) => {
                const { x, y } = mouseEventToCanvasPixelCoords(this.colorHueSat, event);
                
                const center = this.colorHueSat.width / 2;
                const [dx, dy] = [x - center, y - center];
                this.temporary.h = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
                this.temporary.s = Math.min(Math.sqrt(dx*dx + dy*dy) / (center-margin), 1);
                this.updateTemporaryFromHSV();
                this.refreshDisplay();
            };

            update(event);

            drag.addEventListener("move", (event) => {
                update(event.detail);
            });
            drag.addEventListener("up", (event) => {
                update(event.detail);
                this.commitSelectedColorFromTemporary();
            });
        });
    }

    async init() {
    }

    /**
     * @param {BipsiDataProject} data 
     * @returns 
     */
    getSelections(data = undefined) {
        data = data ?? this.editor.stateManager.present;
        const [paletteIndex, colorIndex] = this.colorSelect.value.split(",").map((v) => parseInt(v, 10));
        const palette = this.editor.stateManager.present.palettes[paletteIndex];
        const dataHex = palette[colorIndex];

        return { data, palette, colorIndex, color: this.temporary, dataHex };
    }

    getPreviewPalette() {
        const { color, palette, colorIndex } = this.getSelections();
        const previewPalette = [ ...palette ];
        previewPalette[colorIndex] = color.hex;
        return previewPalette;
    }

    refreshDisplay() {
        if (this.temporary === undefined) this.updateTemporaryFromData();

        const { data, color, palette } = this.getSelections();

        // recolor the color select buttons to the corresponding color
        ALL("#color-select .horizontal-capsule").forEach((capsule, y) => {
            ALL("label", capsule).forEach((label, x) => {
                label.style.background = data.palettes[y][x];
            });
        });

        // color wheel:
        const margin = bipsi.constants.colorwheelMargin;
        // 1. clear
        fillRendering2D(this.colorHueSatRendering);
        // 2. base wheel at full value
        this.colorHueSatRendering.globalCompositeOperation = "source-over";
        this.colorHueSatRendering.drawImage(this.colorWheelGraphic, margin, margin);
        // 3. multiply with target value
        this.colorHueSatRendering.globalCompositeOperation = "multiply";
        const valueHex = rgbToHex({ r: color.v * 255, g: color.v * 255, b: color.v * 255 });
        fillRendering2D(this.colorHueSatRendering, valueHex);
        // 4. cut off fill edges with wheel shape
        this.colorHueSatRendering.globalCompositeOperation = "destination-in";
        this.colorHueSatRendering.drawImage(this.colorWheelGraphic, margin, margin);

        const center = this.colorHueSat.width / 2;
        const width = this.colorHueSat.width - margin * 2;
        const angle = color.h * Math.PI * 2;
        const radius = color.s * width * .5;
        this.colorHueSatRendering.globalCompositeOperation = "source-over";
        this.colorHueSatRendering.beginPath();
        this.colorHueSatRendering.arc(
            center + radius * Math.cos(angle), 
            center + radius * Math.sin(angle), 
            8, 0, 2 * Math.PI,
        );
        this.colorHueSatRendering.strokeStyle = "black";
        this.colorHueSatRendering.lineWidth = 3;
        this.colorHueSatRendering.fillStyle = color.hex;
        this.colorHueSatRendering.fill();
        this.colorHueSatRendering.stroke();

        this.colorValue.valueAsNumber = color.v;
        this.colorHex.value = color.hex;
        this.colorSelect.selectedInput.style.setProperty("background", color.hex);

        this.editor.redraw();
    }

    updateTemporaryFromData() {
        const { dataHex } = this.getSelections();
        this.temporary = { hex: dataHex };
        this.updateTemporaryFromHex();
    }

    updateTemporaryFromHex() {
        this.temporary = { 
            hex: this.temporary.hex, 
            ...RGBToHSV(hexToRGB(this.temporary.hex)),
        };
    }

    updateTemporaryFromHSV() {
        this.temporary.hex = rgbToHex(HSVToRGB(this.temporary));
    }

    commitSelectedColorFromTemporary() {
        this.editor.stateManager.makeChange(async (data) => {
            const { palette, colorIndex, color } = this.getSelections(data);
    
            // TODO undoability
            palette[colorIndex] = color.hex;
        });

        this.refreshDisplay();
    }
}

const FIELD_DEFAULTS = {
    tag: true,
    tile: 0,
    dialogue: "",
    location: { room: 0, position: [0, 0] },
    javascript: "",
    json: "",
    text: "",
};

bipsi.EventFieldEditor = class extends EventTarget {
    /**
     * @param {bipsi.EventEditor} eventEditor 
     * @param {HTMLElement} fieldElement
     */
    constructor(eventEditor, fieldElement) {
        super();

        this.eventEditor = eventEditor;
        this.fieldElement = fieldElement;

        this.nameInput = ONE('input[name="field-name"]', fieldElement);
        this.typeSelect = ONE('select[name="field-type"]', fieldElement);

        this.nameInput.onchange = () => this.changed();
        this.typeSelect.onchange = () => this.changed();
    }

    changed() {
        this.dispatchEvent(new CustomEvent("change"));
    }

    setActive(value) {
        this.fieldElement.classList.toggle("active", value);
    }

    getData() {
        return { 
            key: this.nameInput.value,
            type: this.typeSelect.value 
        };
    }

    pushData(field) {
        this.nameInput.value = field.key;
        this.typeSelect.value = field.type;
    }

    pullData(field) {
        const { key, type } = this.getData();
        field.key = key;
        if (field.type !== type) {
            field.data = FIELD_DEFAULTS[type];
        }
        field.type = type;
    }
}

const EVENT_TEMPLATES = {
    empty: [],
    exit: [
        { key: "exit", type: "location", data: { room: 0, position: [0, 0] } },
    ],
    message: [
        { key: "say", type: "dialogue", data: "hello" },
        { key: "one-time", type: "tag", data: true },
    ],
    character: [
        { key: "graphic", type: "tile", data: 0 },
        { key: "solid", type: "tag", data: true },
        { key: "say", type: "dialogue", data: "hello" },
    ],
    ending: [
        { key: "ending", type: "dialogue", data: "goodbye"},
    ],
    player: [
        { key: "graphic", type: "tile", data: 0 },
        { key: "is-player", type: "tag", data: true },
        { key: "game-title", type: "dialogue", data: "your game title" }
    ],
};

function prepareTemplate(element) {
    const clone = element.cloneNode(true);
    clone.removeAttribute("id");
    clone.hidden = false;

    return {
        parent: element.parentElement,
        element: clone,
    }
}

bipsi.EventEditor = class {
    /**
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        const { parent, element } = prepareTemplate(ONE("#event-field-template"));
        this.fieldContainer = parent;
        this.fieldTemplate = element; 

        this.fieldEditors = [];

        this.selectedIndex = 0;

        ui.action("create-event-empty", () => this.editor.createEvent(EVENT_TEMPLATES.empty));
        ui.action("create-event-exit", () => this.editor.createEvent(EVENT_TEMPLATES.exit));
        ui.action("create-event-message", () => this.editor.createEvent(EVENT_TEMPLATES.message));
        ui.action("create-event-character", () => this.editor.createEvent(EVENT_TEMPLATES.character));
        ui.action("create-event-ending", () => this.editor.createEvent(EVENT_TEMPLATES.ending));
        ui.action("create-event-player", () => this.editor.createEvent(EVENT_TEMPLATES.player));

        this.actions = {
            add: ui.action("add-event-field", () => this.addField()),
            duplicate: ui.action("duplicate-event-field", () => this.duplicateField()),
            shiftUp: ui.action("shift-up-event-field", () => this.shiftField(-1)),
            shiftDown: ui.action("shift-down-event-field", () => this.shiftField(1)),
            delete: ui.action("remove-event-field", () => this.removeField()),
        }

        this.eventEmptyElement = ONE("#event-empty");
        this.eventPropertiesElement = ONE("#event-properties");
        this.valueEditors = {
            json: ONE("#field-json-editor textarea"),
            dialogue: ONE("#field-dialogue-editor textarea"),
        };

        this.positionSelect = ONE("#field-position-select");
        this.positionSelectRendering = this.positionSelect.getContext("2d");

        this.dialoguePreviewToggle = ui.toggle("show-dialogue-preview");
        this.dialoguePreviewToggle.addEventListener("change", () => {
            this.resetDialoguePreview();
        });

        this.valueEditors.json.addEventListener("change", () => {
            const data_ = JSON.parse(this.valueEditors.json.value);

            this.editor.stateManager.makeChange(async (data) => {
                const { field } = this.getSelections(data);
                field.data = data_;
            });
        });

        this.valueEditors.dialogue.addEventListener("change", () => {
            this.editor.stateManager.makeChange(async (data) => {
                const { field } = this.getSelections(data);
                field.data = this.valueEditors.dialogue.value;
            });
        });

        this.valueEditors.dialogue.addEventListener("input", () => {
            this.resetDialoguePreview();
        });

        this.editor.eventTileBrowser.select.addEventListener("change", () => {
            this.editor.stateManager.makeChange(async (data) => {
                const { field } = this.getSelections(data);
                field.data = this.editor.eventTileBrowser.selectedTileIndex;
            });
        });

        this.editor.fieldRoomSelect.addEventListener("change", () => {
            this.editor.stateManager.makeChange(async (data) => {
                const { field } = this.getSelections(data);
                field.data.room = this.editor.fieldRoomSelect.selectedIndex;
            });
        });

        this.positionSelect.addEventListener("click", (event) => {
            const { x, y } = mouseEventToCanvasPixelCoords(this.positionSelect, event);
            const tx = Math.floor(x / 8);
            const ty = Math.floor(y / 8);
            this.editor.stateManager.makeChange(async (data) => {
                const { field } = this.getSelections(data);
                field.data.position = [tx, ty];
            });
        });
    }

    get showDialoguePreview() {
        const { field } = this.getSelections();

        return this.editor.modeSelect.value === "events"
            && field?.type === "dialogue"
            && this.dialoguePreviewToggle.checked;
    }

    resetDialoguePreview() {
        const { field } = this.getSelections();

        const page = this.editor.dialoguePreviewPlayer.active ? this.editor.dialoguePreviewPlayer.pagesSeen : 0;
        this.editor.dialoguePreviewPlayer.restart();
        if (field && field.type === "dialogue") {
            this.editor.dialoguePreviewPlayer.queueScript(this.valueEditors.dialogue.value);
            for (let i = 0; i < page-1; ++i) {
                this.editor.dialoguePreviewPlayer.moveToNextPage();
            }
        }
        this.editor.redraw();
    }

    /**
     * @param {BipsiDataProject} data 
     */
    getSelections(data = undefined) {
        data = data ?? this.editor.stateManager.present;
        const { event } = this.editor.getSelections(data);
        const fieldIndex = this.selectedIndex;
        const field = event?.fields[fieldIndex];

        return { event, field, fieldIndex };
    }

    /**
     * @param {BipsiDataEvent} event 
     */
    showEvent(event) {
        this.event = event ?? { fields: [] };
        this.refresh();
    }

    refresh() {
        const { event, field, fieldIndex } = this.getSelections();

        if (event) {
            this.updateFieldCount(event.fields.length);
            this.fieldEditors.forEach((editor, index) => {
                editor.setActive(index === fieldIndex);
                editor.pushData(event.fields[index]);
            });
            this.eventEmptyElement.hidden = true;
            this.eventPropertiesElement.hidden = false;

            ONE("#field-json-editor").hidden = true;
            ONE("#field-dialogue-editor").hidden = true;
            ONE("#field-tile-editor").hidden = true;
            ONE("#field-location-editor").hidden = true;

            if (field) {
                if (field.type === "tag") {
                } else if (field.type === "dialogue") {
                    this.valueEditors.dialogue.value = field.data;
                    ONE("#field-dialogue-editor").hidden = false;
                } else if (field.type === "tile") {
                    ONE("#field-tile-editor").hidden = false;
                    this.editor.eventTileBrowser.selectedTileIndex = field.data;
                } else if (field.type === "location") {
                    ONE("#field-location-editor").hidden = false;
                    this.editor.fieldRoomSelect.selectedIndex = field.data.room;
                    const [x, y] = field.data.position;

                    this.positionSelectRendering.save();
                    this.editor.drawRoom(this.positionSelectRendering, field.data.room);
                    this.positionSelectRendering.globalCompositeOperation = "difference"
                    this.positionSelectRendering.fillStyle = "white";
                    this.positionSelectRendering.fillRect(0, y * 8+2, 128, 4);
                    this.positionSelectRendering.fillRect(x * 8+2, 0, 4, 128);
                    this.positionSelectRendering.restore();
                } else {
                    this.valueEditors.json.value = JSON.stringify(field.data);
                    ONE("#field-json-editor").hidden = false;
                }
            }
        } else {
            this.updateFieldCount(0);
            this.eventEmptyElement.hidden = false;
            this.eventPropertiesElement.hidden = true;
        }

        this.resetDialoguePreview();
    }

    setSelectedIndex(index) {
        this.selectedIndex = index;
        this.refresh();
    }

    updateFieldCount(count) {
        const missing = count - this.fieldEditors.length;

        if (missing < 0) {
            const excess = this.fieldEditors.splice(missing, -missing);
            excess.forEach((editor) => editor.fieldElement.remove());
        } else if (missing > 0) {
            const extras = ZEROES(missing).map((_, i) => {
                const index = this.fieldEditors.length + i;
                const fieldElement = this.fieldTemplate.cloneNode(true);
                const fieldEditor = new bipsi.EventFieldEditor(this, fieldElement);

                // has to be click so that refresh doesn't overwrite input
                // before change..
                fieldElement.onclick = () => this.setSelectedIndex(index);

                fieldEditor.addEventListener("change", () => {
                    this.editor.stateManager.makeChange(async (data) => {
                        const { field } = this.getSelections(data);
                        fieldEditor.pullData(field);
                        // TODO: convert data on type change..
                    });
                });

                return fieldEditor;
            });

            this.fieldContainer.append(...extras.map((field) => field.fieldElement));
            this.fieldEditors.push(...extras);
        }

        this.selectedIndex = Math.min(this.selectedIndex, count - 1);

        if (this.selectedIndex === -1) {
            this.selectedIndex = 0;
        }
    }

    async addField() {
        this.editor.stateManager.makeChange(async (data) => {
            const { event } = this.getSelections(data);
            event.fields.push({ key: "new field", type: "text", data: "" });
            this.setSelectedIndex(event.fields.length - 1);
        });
    }

    async duplicateField() {
        this.editor.stateManager.makeChange(async (data) => {
            const { event, fieldIndex } = this.getSelections(data);
            const copy = COPY(event.fields[fieldIndex]);
            event.fields.splice(fieldIndex, 0, copy);
            this.setSelectedIndex(fieldIndex+1);
        });
    }

    async shiftField(di) {
        this.editor.stateManager.makeChange(async (data) => {
            const { event, fieldIndex } = this.getSelections(data);
            const prev = fieldIndex;
            const next = Math.max(0, Math.min(fieldIndex + di, event.fields.length));

            const temp = event.fields[prev];
            event.fields[prev] = event.fields[next];
            event.fields[next] = temp;

            this.setSelectedIndex(next);
        });
    }

    async removeField() {
        this.editor.stateManager.makeChange(async (data) => {
            const { event, fieldIndex } = this.getSelections(data);
            event.fields.splice(fieldIndex, 1);
        });
    }
}

bipsi.TileBrowser = class {
    /**
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        this.thumbnailURIs = [];

        const { parent, element } = prepareTemplate(ONE("#tile-select-item-template"));
        this.itemContainer = parent;
        this.itemTemplate = element; 

        /** @type {HTMLLabelElement[]} */
        this.items = [];

        this.select = ui.radio("tile-select");
        this.select.remove(ONE("#tile-select-item-template > input"));

        this.select.addEventListener("change", () => {
            this.editor.tileEditor.animateToggle.checked = true;
            this.redraw();
        });

        this.frame = 0;

        window.setInterval(() => {
            if (!this.editor.ready) return;
            this.frame = 1 - this.frame;
            this.updateCSS();
            this.redraw();
        }, bipsi.constants.frameInterval);
    }

    get selectedTileIndex() {
        return this.select.valueAsNumber;
    }

    set selectedTileIndex(value) { 
        this.select.setValueSilent(value);
        this.select.inputs[this.select.selectedIndex].scrollIntoView({ block: "center" }); 
    }

    redraw(tileset0 = undefined, tileset1 = undefined) {
        const { data, tilesets, room, tileIndex } = this.editor.getSelections();
        const palette = data.palettes[room.palette];

        const { x, y, size } = getTileCoords(tilesets[0].canvas, tileIndex);

        const [bg, fg, hi] =  palette;

        const color = this.editor.roomPaintTool.selectedIndex === 1 ? hi : fg;

        fillRendering2D(this.editor.renderings.tilePaint0, bg);
        this.editor.renderings.tilePaint0.drawImage(
            recolorMask(tileset0 ?? tilesets[0], color).canvas,
            x, y, size, size,
            0, 0, size, size,
        );

        fillRendering2D(this.editor.renderings.tilePaint1, bg);
        this.editor.renderings.tilePaint1.drawImage(
            recolorMask(tileset1 ?? tilesets[1], color).canvas,
            x, y, size, size,
            0, 0, size, size,
        );

        this.editor.renderings.tilePaintA.drawImage(
            [this.editor.renderings.tilePaint0, this.editor.renderings.tilePaint1][this.frame].canvas,
            0, 0,
        );
    }

    async setFrames(canvases) {
        const prev = [...this.thumbnailURIs];
        const blobs = await Promise.all(canvases.map(canvasToBlob));
        const uris = blobs.map(URL.createObjectURL);
        await Promise.all(uris.map(loadImage)); // preload against flicker
        this.thumbnailURIs = uris;
        this.updateCSS();
        prev.map(URL.revokeObjectURL);

        const root = ONE(":root");
        const scale = 5;
        const w = canvases[0].width * scale;
        const h = canvases[0].height * scale;

        const { data, room } = this.editor.getSelections();

        root.style.setProperty("--tileset-background-size", `${w}px ${h}px`);
        root.style.setProperty("--tileset-background-color", data.palettes[room.palette][0]);

        const columns = canvases[0].width / bipsi.constants.tileSize;
        const rows = canvases[0].height / bipsi.constants.tileSize;
        this.updateTileCount(rows * columns);
        this.items.forEach((label, index) => {
            const { x, y } = getTileCoords(canvases[0], index);
            label.style.backgroundPosition = `-${x * scale}px -${y * scale}px`;
        });
    }

    async updateCSS() {
        ONE("#tile-select").style.setProperty(
            "--tileset-background-image", 
            `url("${this.thumbnailURIs[this.frame]}")`,
        );
        
    }

    updateTileCount(count) {
        const missing = count - this.items.length;

        if (missing < 0) {
            const excess = this.items.splice(-missing, missing);
            excess.forEach((element) => {
                element.remove();
                const radio = ONE("input", element);
                this.select.remove(radio);
            });
        } else if (missing > 0) {
            const extras = ZEROES(missing).map((_, i) => {
                const index = this.items.length + i;
                const label = this.itemTemplate.cloneNode(true);
                const radio = ONE("input", label);
                radio.title = `select tile ${index}`;
                radio.value = index.toString();
                this.select.add(radio);
                return label;
            });

            this.itemContainer.append(...extras);
            this.items.push(...extras);
        }

        if (this.select.selectedIndex === -1) {
            this.select.selectedIndex = 0;
        }
    }
}

bipsi.EventTileBrowser = class {
    /**
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        this.thumbnailURIs = [];

        const { parent, element } = prepareTemplate(ONE("#event-tile-select-item-template"));
        this.itemContainer = parent;
        this.itemTemplate = element; 

        /** @type {HTMLLabelElement[]} */
        this.items = [];

        this.select = ui.radio("event-tile-select");
        this.select.remove(ONE("#event-tile-select-item-template > input"));

        this.select.addEventListener("change", () => {
            this.redraw();
        });

        this.frame = 0;

        window.setInterval(() => {
            if (!this.editor.ready) return;
            this.frame = 1 - this.frame;
            this.updateCSS();
            this.redraw();
        }, bipsi.constants.frameInterval);
    }

    get selectedTileIndex() {
        return this.select.valueAsNumber;
    }

    set selectedTileIndex(value) { 
        this.select.setValueSilent(value);
        this.select.inputs[this.select.selectedIndex].scrollIntoView({ block: "center" }); 
    }

    redraw() {
        const { data, tilesets, room, tileIndex } = this.editor.getSelections();
        const palette = data.palettes[room.palette];

        const { x, y, size } = getTileCoords(tilesets[0].canvas, tileIndex);

        const [bg, fg, hi] =  palette;

        const color = this.editor.roomPaintTool.selectedIndex === 1 ? hi : fg;

        fillRendering2D(this.editor.renderings.tilePaint0, bg);
        this.editor.renderings.tilePaint0.drawImage(
            recolorMask(tilesets[0], color).canvas,
            x, y, size, size,
            0, 0, size, size,
        );

        fillRendering2D(this.editor.renderings.tilePaint1, bg);
        this.editor.renderings.tilePaint1.drawImage(
            recolorMask(tilesets[1], color).canvas,
            x, y, size, size,
            0, 0, size, size,
        );

        this.editor.renderings.tilePaintA.drawImage(
            [this.editor.renderings.tilePaint0, this.editor.renderings.tilePaint1][this.frame].canvas,
            0, 0,
        );
    }

    async setFrames(canvases) {
        const prev = [...this.thumbnailURIs];
        const blobs = await Promise.all(canvases.map(canvasToBlob));
        const uris = blobs.map(URL.createObjectURL);
        await Promise.all(uris.map(loadImage)); // preload against flicker
        this.thumbnailURIs = uris;
        this.updateCSS();
        prev.map(URL.revokeObjectURL);

        const scale = 5;
        const columns = canvases[0].width / bipsi.constants.tileSize;
        const rows = canvases[0].height / bipsi.constants.tileSize;
        this.updateTileCount(rows * columns);
        this.items.forEach((label, index) => {
            const { x, y } = getTileCoords(canvases[0], index);
            label.style.backgroundPosition = `-${x * scale}px -${y * scale}px`;
        });
    }

    async updateCSS() {
        ONE("#field-tile-select").style.setProperty(
            "--tileset-background-image", 
            `url("${this.thumbnailURIs[this.frame]}")`,
        );
        
    }

    updateTileCount(count) {
        const missing = count - this.items.length;

        if (missing < 0) {
            const excess = this.items.splice(-missing, missing);
            excess.forEach((element) => {
                element.remove();
                const radio = ONE("input", element);
                this.select.remove(radio);
            });
        } else if (missing > 0) {
            const extras = ZEROES(missing).map((_, i) => {
                const index = this.items.length + i;
                const label = this.itemTemplate.cloneNode(true);
                const radio = ONE("input", label);
                radio.title = `select tile ${index}`;
                radio.value = index.toString();
                this.select.add(radio);
                return label;
            });

            this.itemContainer.append(...extras);
            this.items.push(...extras);
        }

        if (this.selectedTileIndex === -1) {
            this.selectedTileIndex = 0;
        }
    }
}


bipsi.TileEditor = class {
    /**
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        const tile0 = this.editor.renderings.tilePaint0;
        const tile1 = this.editor.renderings.tilePaint1;

        tile0.canvas.addEventListener("pointerdown", (event) => this.startDrag(event, 0));
        tile1.canvas.addEventListener("pointerdown", (event) => this.startDrag(event, 1));

        this.animateToggle = ui.toggle("tile-animated");

        this.animateToggle.addEventListener("change", () => {
            if (!this.animateToggle.checked) {
                this.editor.stateManager.makeChange(async (data) => {
                    const { tilesets, frameIndex, tileIndex } = this.editor.getSelections();
                    const copy = copyTile(tilesets[frameIndex], tileIndex);
                    const tileset = await this.editor.forkTilesetFrame(1 - frameIndex);
                    drawTile(tileset, tileIndex, copy);
                });
            } 
        });
    }

    async startDrag(event, frameIndex) {
        const rendering = [
            this.editor.renderings.tilePaint0,
            this.editor.renderings.tilePaint1,
        ][frameIndex];

        const { tilesets, tileIndex } = this.editor.getSelections();
 
        this.editor.stateManager.makeCheckpoint();
        const frame = await this.editor.forkTilesetFrame(frameIndex);

        const frames = [tilesets[0], tilesets[1]];
        frames[frameIndex] = frame;

        const temp = copyTile(frame, tileIndex);

        const redraw = () => {
            drawTile(frame, tileIndex, temp);
            this.editor.redraw();
            this.editor.tileBrowser.redraw(...frames);
        };

        const drag = ui.drag(event);
        const positions = trackCanvasStroke(rendering.canvas, drag);

        // "brush" is a single pixel which is either transparent or white,
        // whichever the existing pixel isn't
        const { x, y } = positions[0];
        const brush = temp.getImageData(x, y, 1, 1);
        const value = brush.data[3] === 0 ? 255 : 0;
        brush.data[0] = value;
        brush.data[1] = value;
        brush.data[2] = value;
        brush.data[3] = value;

        const plot = (x, y) => temp.putImageData(brush, x, y);

        plot(x, y);

        drag.addEventListener("move", () => {
            const { x: x0, y: y0 } = positions[positions.length - 2];
            const { x: x1, y: y1 } = positions[positions.length - 1];
            lineplot(x0, y0, x1, y1, plot);
            redraw();
        });

        drag.addEventListener("up", () => {
            const { x, y } = positions[positions.length - 1];
            plot(x, y);
            redraw();
            this.editor.stateManager.changed();
        });
    }
}

bipsi.Editor = class extends EventTarget {
    /**
     * Setup most of the stuff for the bipsi editor (the rest is in init
     * because constructors can't be async). This includes finding the existing
     * HTML UI so it doesn't really make sense to construct this more than once
     * but a class is easy syntax for wrapping functions and state together 🤷‍♀️
     */
    constructor(font) {
        super();

        // run full editor functionally? (or just simple playback?)
        this.editorMode = true;

        // are there changes to warn about losing?
        this.unsavedChanges = false;

        // is there a fully loaded project?
        this.ready = false;

        // to determine which resources are still in use for the project we
        // combine everything the bipsi needs plus anything this editor
        // needs
        const getManifest = (data) => [...bipsi.getManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<BipsiDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);

        /** @type {Object.<string, CanvasRenderingContext2D>} */
        this.renderings = {
            tilePaint0: ONE("#tile-paint-0").getContext("2d"),
            tilePaint1: ONE("#tile-paint-1").getContext("2d"),
            tilePaintA: ONE("#tile-paint-a").getContext("2d"),

            tileMapPaint: ONE("#tile-map-paint").getContext("2d"),
            tilePaintRoom: ONE("#tile-paint-room").getContext("2d"),
            paletteRoom: ONE("#palette-room").getContext("2d"),
            eventsRoom: ONE("#events-room").getContext("2d"),

            playtest: ONE("#playtest-rendering").getContext("2d"),
        };

        bipsi.player.addEventListener("render", () => {
            this.renderings.playtest.drawImage(bipsi.player.rendering.canvas, 0, 0, 256, 256);
        });

        this.fieldRoomSelect = ui.radio("field-room-select");
        
        Object.values(this.renderings).forEach((rendering) => rendering.imageSmoothingEnabled = false);

        this.tileBrowser = new bipsi.TileBrowser(this);
        this.eventTileBrowser = new bipsi.EventTileBrowser(this);

        this.tileEditor = new bipsi.TileEditor(this);
        this.paletteEditor = new bipsi.PaletteEditor(this);
        this.eventEditor = new bipsi.EventEditor(this);

        this.dialoguePreviewPlayer = new DialoguePlayer(font);

        let prev;
        const timer = (next) => {
            window.requestAnimationFrame(timer);
            if (!this.ready) return;

            prev = prev ?? Date.now();
            next = next ?? Date.now();
            const dt = Math.max(0, (next - prev) / 1000.);
            prev = next;
            this.dialoguePreviewPlayer.update(dt);
            this.redraw();
        }
        timer();

        // find all the ui already defined in the html
        this.modeSelect = ui.radio("mode-select");
        this.roomSelect = ui.radio("room-select");
        this.roomPaintTool = ui.radio("room-paint-tool");
        this.roomPaletteSelect = ui.select("room-palette");
        this.tilePaintFrameSelect = ui.radio("tile-paint-frame");

        this.modeSelect.tab(ONE("#event-edit"), "events");
        this.modeSelect.tab(ONE("#room-events-tab"), "events");

        this.modeSelect.tab(ONE("#palette-edit"), "palettes");
        
        this.modeSelect.tab(ONE("#room-select-tab"), "draw-room");
        this.modeSelect.tab(ONE("#tile-select-tab"), "draw-room", "draw-tiles");

        this.modeSelect.tab(ONE("#tile-buttons"), "draw-tiles")
        this.modeSelect.tab(ONE("#tile-paint-tab"), "draw-tiles");
        this.modeSelect.tab(ONE("#tile-map-tab"), "draw-room");
        this.modeSelect.tab(ONE("#palette-tab"), "palettes");

        this.modeSelect.tab(ONE("#play-tab-body"), "playtest");
        this.modeSelect.tab(ONE("#play-tab-view"), "playtest");

        this.modeSelect.tab(ONE("#about-tab-body"), "about");

        // initial selections
        this.modeSelect.selectedIndex = 0;
        this.roomSelect.selectedIndex = 0;
        this.roomPaintTool.selectedIndex = 0; 
        this.tilePaintFrameSelect.selectedIndex = 0;

        this.selectedEventCell = { x: 0, y: 0 };

        this.roomThumbs = ZEROES(24).map(() => createRendering2D(16, 16));
        this.roomThumbs2 = ZEROES(24).map(() => createRendering2D(16, 16));

        // add thumbnails to the room select bar
        ALL("#room-select input").forEach((input, index) => {
            input.after(this.roomThumbs[index].canvas);
        });
        ALL("#field-room-select input").forEach((input, index) => {
            input.after(this.roomThumbs2[index].canvas);
        });

        // editor actions controlled by html buttons
        this.actions = {
            // editor toolbar
            undo: ui.action("undo", () => this.stateManager.undo()),
            redo: ui.action("redo", () => this.stateManager.redo()),

            // editor menu
            save: ui.action("save", () => this.save()),
            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),
            update: ui.action("update", () => this.updateEditor()),

            copyRoom: ui.action("copy-room", () => this.copySelectedRoom()),
            pasteRoom: ui.action("paste-room", () => this.pasteSelectedRoom()),
            clearRoom: ui.action("clear-room", () => this.clearSelectedRoom()),

            copyTile: ui.action("copy-tile", () => this.copySelectedTile()),
            pasteTile: ui.action("paste-tile", () => this.pasteSelectedTile()),
            clearTile: ui.action("clear-tile", () => this.clearSelectedTile()),

            shiftTileUp: ui.action("shift-tile-up", () =>
                this.processSelectedTile((tile) => cycleRendering2D(tile,  0, -1))),
            shiftTileDown: ui.action("shift-tile-down", () =>
                this.processSelectedTile((tile) => cycleRendering2D(tile,  0,  1))),
            shiftTileLeft: ui.action("shift-tile-left", () =>
                this.processSelectedTile((tile) => cycleRendering2D(tile, -1,  0))),
            shiftTileRight: ui.action("shift-tile-right", () =>
                this.processSelectedTile((tile) => cycleRendering2D(tile,  1,  0))),

            rotateTileClockwise: ui.action("rotate-tile-clockwise", () => 
                this.processSelectedTile((tile) => turnRendering2D(tile, 1))),
            rotateTileAnticlockwise: ui.action("rotate-tile-anticlockwise", () => 
                this.processSelectedTile((tile) => turnRendering2D(tile, -1))),

            flipTile: ui.action("flip-tile",     () => this.processSelectedTile(flipRendering2D)),
            mirrorTile: ui.action("mirror-tile", () => this.processSelectedTile(mirrorRendering2D)),
            invertTile: ui.action("invert-tile", () => this.processSelectedTile(invertMask)),
 
            copyTileFrame: ui.action("copy-tile-frame", () => this.copySelectedTileFrame()),
            pasteTileFrame: ui.action("paste-tile-frame", () => this.pasteSelectedTileFrame()),
            clearTileFrame: ui.action("clear-tile-frame", () => this.clearSelectedTileFrame()),

            swapTileFrames: ui.action("swap-tile-frames", () => this.swapSelectedTileFrames()),

            copyEvent: ui.action("copy-event", () => this.copySelectedEvent()),
            pasteEvent: ui.action("paste-event", () => this.pasteSelectedEvent()),
            deleteEvent: ui.action("delete-event", () => this.deleteSelectedEvent()),
        };

        // can't undo/redo/paste yet
        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.pasteRoom.disabled = true;
        this.actions.pasteTile.disabled = true;
        this.actions.pasteTileFrame.disabled = true;
        this.actions.pasteEvent.disabled = true;

        // hotkeys
        document.addEventListener("keydown", (event) => {
            const targetTag = event.target.tagName.toLowerCase();
            const textedit = targetTag === "input" || targetTag === "textarea";

            if (event.ctrlKey) {
                if (event.key === "z") this.actions.undo.invoke();
                if (event.key === "y") this.actions.redo.invoke();
                if (event.key === "s") {
                    event.preventDefault();
                    this.actions.save.invoke();
                }
            } else if (!textedit) {
                const topkeys = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT"]; 
                topkeys.forEach((code, i) => {
                    if (event.code === code) this.modeSelect.selectedIndex = i;
                });
                
                event.preventDefault();
            }

            if (event.altKey && this.heldColorPick === undefined) {
                this.heldColorPick = this.roomPaintTool.selectedIndex;
                this.roomPaintTool.selectedIndex = 2;
                event.preventDefault();
            }
        });

        // stop temporarily color picking if the alt key is released
        document.addEventListener("keyup", (event) => {
            if (!event.altKey && this.heldColorPick !== undefined) {
                this.roomPaintTool.selectedIndex = this.heldColorPick;
                this.heldColorPick = undefined;
                event.preventDefault();
            }
        });

        // changes in mode select bar
        this.modeSelect.addEventListener("change", async () => {
            this.redrawTileBrowser();

            bipsi.player.clear();
        });

        ui.action("playtest", () => {
            bipsi.player.copyFrom(this.stateManager);
            ONE("#playtest-rendering").focus();
        });

        this.roomSelect.addEventListener("change", () => {
            const { room } = this.getSelections();
            this.roomPaletteSelect.selectedIndex = room.palette;
            this.redraw();
        });

        this.roomPaintTool.addEventListener("change", () => {
            this.redraw();
            this.redrawTileBrowser();
        });

        this.tileBrowser.select.addEventListener("change", () => {
            if (this.roomPaintTool.selectedIndex > 1) {
                this.roomPaintTool.selectedIndex = 0;
            }
        })

        this.roomPaletteSelect.addEventListener("change", () => {
            this.stateManager.makeChange(async (data) => {
                const { room } = this.getSelections(data);
                room.palette = this.roomPaletteSelect.selectedIndex;
            });
        });

        // whenever the project data is changed
        this.stateManager.addEventListener("change", () => {
            this.unsavedChanges = true;
            this.ready = true;
    
            this.paletteEditor.refreshDisplay();
            
            // enable/disable undo/redo buttons
            this.actions.undo.disabled = !this.stateManager.canUndo;
            this.actions.redo.disabled = !this.stateManager.canRedo;

            const { room } = this.getSelections();
            this.roomPaletteSelect.selectedIndex = room.palette;

            this.redrawTileBrowser();

            // render room
            this.redraw();
            this.tileBrowser.redraw();
            this.eventTileBrowser.redraw();

            // events
            this.eventEditor.refresh();
        });

        const onRoomPointer = async (event, canvas) => {
            const { tileIndex, room } = this.getSelections();
    
            this.stateManager.makeCheckpoint();

            const scale = canvas.width / (8 * 16);

            const round = (position) => {
                return {
                    x: Math.floor(position.x / (8 * scale)),
                    y: Math.floor(position.y / (8 * scale)),
                };
            };

            const redraw = () => this.redraw();

            const drag = ui.drag(event);
            const positions = trackCanvasStroke(canvas, drag);

            const { x, y } = round(positions[0]);

            const tool = this.roomPaintTool.value;

            const prevTile = room.tilemap[y][x];
            const nextTile = prevTile !== tileIndex ? tileIndex : -1;
            const prevHigh = room.highmap[y][x];
            const nextHigh = prevHigh !== tileIndex ? tileIndex : -1;
            const nextWall = 1 - room.wallmap[y][x];

            if (tool === "pick") {
                const pick = prevHigh >= 0 ? prevHigh : prevTile;
                this.tileBrowser.selectedTileIndex = pick;
            } else if (tool === "wall" || tool === "tile" || tool === "high") {
                const setIfWithin = (map, x, y, value) => {
                    if (x >= 0 && x < 16 && y >= 0 && y < 16) map[y][x] = value ?? -1;
                } 

                const plots = {
                    tile: (x, y) => setIfWithin(room.tilemap, x, y, nextTile),
                    high: (x, y) => setIfWithin(room.highmap, x, y, nextHigh),
                    wall: (x, y) => setIfWithin(room.wallmap, x, y, nextWall),
                }

                const plot = plots[tool];
                plot(x, y);
                redraw();

                drag.addEventListener("move", (event) => {
                    const { x: x0, y: y0 } = round(positions[positions.length - 2]);
                    const { x: x1, y: y1 } = round(positions[positions.length - 1]);
                    lineplot(x0, y0, x1, y1, plot);
                    redraw();
                });

                drag.addEventListener("up", (event) => {
                    const { x, y } = round(positions[positions.length - 1]);
                    plot(x, y);
                    redraw();
                    this.stateManager.changed();
                });

                if (tool === "wall") {
                    drag.addEventListener("click", (event) => {
                        if (event.detail.shiftKey) {
                            room.tilemap.forEach((row, y) => {
                                row.forEach((tileIndex, x) => {
                                    if (tileIndex === prevTile) {
                                        room.wallmap[y][x] = nextWall;
                                    }
                                });
                            });
                        }
                        redraw();
                    });
                }
            } else if (tool === "shift") {
                drag.addEventListener("move", (event) => {
                    const { x: x0, y: y0 } = round(positions[positions.length - 2]);
                    const { x: x1, y: y1 } = round(positions[positions.length - 1]);
                    const dx = x0 - x1;
                    const dy = y0 - y1;
                    cycleMap(room.tilemap, dx, dy);
                    cycleMap(room.highmap, dx, dy);
                    cycleMap(room.wallmap, dx, dy);
                    redraw();
                });
            }
        };

        this.renderings.tileMapPaint.canvas.addEventListener("pointerdown", (event) => onRoomPointer(event, this.renderings.tileMapPaint.canvas));
        this.renderings.tilePaintRoom.canvas.addEventListener("pointerdown", (event) => onRoomPointer(event, this.renderings.tilePaintRoom.canvas));

        this.renderings.eventsRoom.canvas.addEventListener("pointerdown", (event) => {
            if (this.eventEditor.showDialoguePreview) {
                this.dialoguePreviewPlayer.skip();
                if (!this.dialoguePreviewPlayer.active) this.eventEditor.resetDialoguePreview();
                this.redraw();
                return;
            }

            const { room } = this.getSelections();
            const scale = this.renderings.eventsRoom.canvas.width / (8 * 16);

            const round = (position) => {
                return {
                    x: Math.floor(position.x / (8 * scale)),
                    y: Math.floor(position.y / (8 * scale)),
                };
            };

            const redraw = () => {
                this.redraw();
            };

            const drag = ui.drag(event);
            const positions = trackCanvasStroke(this.renderings.eventsRoom.canvas, drag);
            let started = false;

            const { x, y } = round(positions[0]);

            if (event.altKey) {
                const prevTile = room.tilemap[y][x];
                const prevHigh = room.highmap[y][x];
                const pick = prevHigh >= 0 ? prevHigh : prevTile;
                this.tileBrowser.selectedTileIndex = pick;
                return;
            }

            this.selectedEventCell = { x, y };
            redraw();

            const event_ = getEventsAt(room.events, x, y)[0];
            const events = event_ === undefined ? room.events : [event_];
            this.eventEditor.showEvent(event_);

            drag.addEventListener("move", (event) => {
                const { x: x0, y: y0 } = round(positions[positions.length - 2]);
                const { x: x1, y: y1 } = round(positions[positions.length - 1]);
                const dx = x1 - x0;
                const dy = y1 - y0;

                const move = (dx !== 0 || dy !== 0);

                if (!started && move) {
                    started = true;
                    this.stateManager.makeCheckpoint();
                }

                cycleEvents(events, dx, dy);
                this.selectedEventCell = { x: (x1 + 16) % 16, y: (y1 + 16) % 16 };
                redraw();

                if (move) {
                    this.stateManager.changed();
                }
            });
        });

        this.frame = 0;

        window.setInterval(() => {
            if (!this.ready) return;

            this.frame = 1 - this.frame;
            this.redraw();
        }, bipsi.constants.frameInterval);
    }

    async init() {
        await this.paletteEditor.init();
        await this.dialoguePreviewPlayer.load();

        this.EVENT_TILE = await loadImage(bipsi.constants.eventTile);
        this.WALL_TILE = await loadImage(bipsi.constants.wallTile);
    }

    /**
     * @param {BipsiDataProject} data 
     */
    getSelections(data = undefined) {
        data = data || this.stateManager.present;
        
        const tilesets = [
            this.stateManager.resources.get(data.tilesets[0]),
            this.stateManager.resources.get(data.tilesets[1]),
        ];

        const tileSize = bipsi.constants.tileSize;
        const roomIndex = this.roomSelect.selectedIndex;
        const tileIndex = this.tileBrowser.selectedTileIndex;
        const frameIndex = this.tilePaintFrameSelect.selectedIndex;

        const room = data.rooms[roomIndex];

        const { x, y } = this.selectedEventCell;
        const event = getEventsAt(room.events, x, y)[0];

        return { data, tilesets, room, roomIndex, frameIndex, tileIndex, tileSize, event };
    }

    /**
     * @param {number} frame 
     * @returns {Promise<CanvasRenderingContext2D>}
     */
    async forkTilesetFrame(frame) {
        const tilesetId = this.stateManager.present.tilesets[frame];
        // create a new copy of the image resource
        const { id, instance } = await this.stateManager.resources.fork(tilesetId);
        // replace the tileset frame's image with the new copy
        this.stateManager.present.tilesets[frame] = id;
        // return the instance of the image for editing
        return instance;
    }

    /**
     * @param {CanvasRenderingContext2D} rendering 
     * @param {number} roomIndex 
     */
    drawRoom(rendering, roomIndex, { palette = undefined, events = true } = {}) {
        const { data, tilesets } = this.getSelections();
        const room = data.rooms[roomIndex];
        palette = palette ?? data.palettes[room.palette];
        const [background, foreground, highlight] = palette;
        const tileset = tilesets[this.frame];

        const tilesetC = recolorMask(tileset, foreground, TEMP_TILESET0);
        const tilesetH = recolorMask(tileset, highlight, TEMP_TILESET1);

        fillRendering2D(rendering, background);
        drawTilemap(rendering, tilesetC, room.tilemap, background);
        drawTilemap(rendering, tilesetH, room.highmap, background);
        if (events) drawEvents(rendering, tilesetH, room.events, background);
    }

    redraw() {
        const { data, room, tileSize, roomIndex, tilesets } = this.getSelections();
        const palette = this.modeSelect.value === "palettes" 
                      ? this.paletteEditor.getPreviewPalette()  
                      : data.palettes[room.palette];
        const tileset = tilesets[this.frame];

        this.drawRoom(TEMP_128, roomIndex, { palette, events: false });
        this.renderings.tileMapPaint.drawImage(TEMP_128.canvas, 0, 0, 256, 256);
        fillRendering2D(TEMP_128);
        const tilesetH = recolorMask(tileset, palette[2], TEMP_TILESET0);
        drawEvents(TEMP_128, tilesetH, room.events, palette[0]);
        this.renderings.tileMapPaint.globalAlpha = .75;
        this.renderings.tileMapPaint.drawImage(TEMP_128.canvas, 0, 0, 256, 256);
        this.renderings.tileMapPaint.globalAlpha = 1;

        if (this.roomPaintTool.value === "wall") {
            const rendering = this.renderings.tileMapPaint;
            rendering.globalCompositeOperation = "difference";
            room.wallmap.forEach((row, y) => {
                row.forEach((wall, x) => {
                    if (wall > 0) {
                        rendering.drawImage(
                            this.WALL_TILE, 
                            x * tileSize * 2, y * tileSize * 2,
                        );
                    }
                });
            });
            rendering.globalCompositeOperation = "source-over";
        }

        this.roomThumbs.forEach((thumbnail, roomIndex) => {
            const room = data.rooms[roomIndex];
            drawRoomThumbnail(thumbnail, palette, room);
            this.roomThumbs2[roomIndex].drawImage(thumbnail.canvas, 0, 0);
        });

        this.drawRoom(TEMP_128, roomIndex, { palette });
        this.renderings.paletteRoom.drawImage(TEMP_128.canvas, 0, 0);
        this.renderings.tilePaintRoom.drawImage(TEMP_128.canvas, 0, 0);
        this.renderings.eventsRoom.drawImage(TEMP_128.canvas, 0, 0, 256, 256);

        const { x, y } = this.selectedEventCell;

        if (!this.eventEditor.showDialoguePreview) {
            fillRendering2D(TEMP_256);
            TEMP_256.fillStyle = "white";
            TEMP_256.fillRect(0, y * 16 + 6, 256, 4);
            TEMP_256.fillRect(x * 16 + 6, 0, 4, 256);
            TEMP_256.clearRect(x * 16, y * 16, 16, 16);
    
            room.events.forEach((event) => {
                const [x, y] = event.position;
                TEMP_256.drawImage(this.EVENT_TILE, x * tileSize * 2, y * tileSize * 2);
            });

            this.renderings.eventsRoom.globalCompositeOperation = "difference";
            this.renderings.eventsRoom.drawImage(TEMP_256.canvas, 0, 0);
            this.renderings.eventsRoom.globalCompositeOperation = "source-over";
        }

        const events = getEventsAt(room.events, x, y);
        this.actions.copyEvent.disabled = events.length === 0;
        this.actions.deleteEvent.disabled = events.length === 0;

        if (this.eventEditor.showDialoguePreview && this.dialoguePreviewPlayer.active) {
            const t = 24;
            const m = 109;
            const b = 194;

            const top = this.selectedEventCell.y >= 8;

            const x = 24;
            const y = false ? m : top ? t : b;

            this.dialoguePreviewPlayer.render();
            this.renderings.eventsRoom.drawImage(this.dialoguePreviewPlayer.dialogueRendering.canvas, x, y);
        }
    } 

    redrawTileBrowser() {
        const { data, room, tilesets } = this.getSelections();
        const [, foreground, highlight] = data.palettes[room.palette];

        const hi = this.roomPaintTool.value === "high" || this.modeSelect.value === "events";
        const color = hi ? highlight : foreground;
        const tileset = recolorMask(tilesets[0], color, TEMP_TILESET0);
        const tileset2 = recolorMask(tilesets[1], color, TEMP_TILESET1);

        this.tileBrowser.setFrames([tileset.canvas, tileset2.canvas]);
        this.eventTileBrowser.setFrames([tileset.canvas, tileset2.canvas]);
    }

    async copySelectedRoom() {
        const { room } = this.getSelections();
        this.copiedRoom = COPY(room);
        this.actions.pasteRoom.disabled = false;
    }

    async pasteSelectedRoom() {
        return this.stateManager.makeChange(async (data) => {
            const { roomIndex } = this.getSelections(data);
            const copy = COPY(this.copiedRoom);
            copy.events.forEach((event) => event.id = nanoid());
            data.rooms[roomIndex] = copy;
        });
    }
    
    async clearSelectedRoom() {
        return this.stateManager.makeChange(async (data) => {
            const { roomIndex } = this.getSelections(data);
            data.rooms[roomIndex] = makeBlankRoom();
        });
    }

    async copySelectedTile() {
        const { tilesets } = this.getSelections();
        const { x, y, size } = getTileCoords(tilesets[0].canvas, this.tileBrowser.selectedTileIndex);

        this.copiedTileFrames = [
            copyRendering2D(tilesets[0], undefined, { x, y, w: size, h: size }),
            copyRendering2D(tilesets[1], undefined, { x, y, w: size, h: size }),
        ];

        this.actions.pasteTile.disabled = false;
    }

    async pasteSelectedTile() {
        return this.stateManager.makeChange(async (data) => {
            const tileset0 = await this.forkTilesetFrame(0);
            const tileset1 = await this.forkTilesetFrame(1);

            const { x, y, size } = getTileCoords(tileset0.canvas, this.tileBrowser.selectedTileIndex);

            tileset0.clearRect(x, y, size, size);
            tileset0.drawImage(this.copiedTileFrames[0].canvas, x, y);
            tileset1.clearRect(x, y, size, size);
            tileset1.drawImage(this.copiedTileFrames[1].canvas, x, y);
        });
    }
    
    async clearSelectedTile() {
        return this.stateManager.makeChange(async (data) => {
            const tileset0 = await this.forkTilesetFrame(0);
            const tileset1 = await this.forkTilesetFrame(1);

            const { x, y, size } = getTileCoords(tileset0.canvas, this.tileBrowser.selectedTileIndex);

            tileset0.clearRect(x, y, size, size);
            tileset1.clearRect(x, y, size, size);
        });
    }

    /**
     * @param {(CanvasRenderingContext2D) => void} process 
     */
    async processSelectedTile(process) {
        return this.stateManager.makeChange(async (data) => {
            const { frameIndex, tileIndex } = this.getSelections(data);
            const tileset = await this.forkTilesetFrame(frameIndex);

            const frame = copyTile(tileset, tileIndex);
            process(frame);

            drawTile(tileset, tileIndex, frame);
        });
    }

    async copySelectedTileFrame() {
        const { tilesets, frameIndex, tileIndex } = this.getSelections();
        this.copiedTileFrame = copyTile(tilesets[frameIndex], tileIndex);
        this.actions.pasteTileFrame.disabled = false;
    }

    async pasteSelectedTileFrame() {
        return this.stateManager.makeChange(async (data) => {
            const { frameIndex, tileIndex } = this.getSelections(data);
            const tileset = await this.forkTilesetFrame(frameIndex);

            drawTile(tileset, tileIndex, this.copiedTileFrame);
        });
    }
    
    async clearSelectedTileFrame() {
        return this.stateManager.makeChange(async (data) => {
            const { frameIndex, tileIndex } = this.getSelections(data);
            const tileset = await this.forkTilesetFrame(frameIndex);

            const { x, y, size } = getTileCoords(tileset.canvas, tileIndex);
            tileset.clearRect(x, y, size, size);
        });
    }

    async swapSelectedTileFrames() {
        return this.stateManager.makeChange(async (data) => {
            const { tileIndex } = this.getSelections(data);
            const tileset0 = await this.forkTilesetFrame(0);
            const tileset1 = await this.forkTilesetFrame(1);

            const frame0 = copyTile(tileset0, tileIndex);
            const frame1 = copyTile(tileset1, tileIndex);

            drawTile(tileset0, tileIndex, frame1);
            drawTile(tileset1, tileIndex, frame0);
        });
    }

    createEvent(fieldsTemplate = undefined) {
        this.stateManager.makeChange(async (data) => {
            const { room } = this.getSelections(data);
            const { x, y } = this.selectedEventCell;
            const event = { 
                position: [x, y],
                fields: COPY(fieldsTemplate ?? []),
            }
            room.events.push(event);
        });
    }

    copySelectedEvent() {
        const { room } = this.getSelections();
        const { x, y } = this.selectedEventCell;
        const events = getEventsAt(room.events, x, y);
        this.copiedEvent = COPY(events[0]);
        this.actions.pasteEvent.disabled = false;
    }

    pasteSelectedEvent() {
        this.stateManager.makeChange(async (data) => {
            const { room } = this.getSelections(data);
            const { x, y } = this.selectedEventCell;
            const event = COPY(this.copiedEvent);
            event.id = nanoid();
            event.position = [x, y];
            room.events.push(event);
        });
    }

    deleteSelectedEvent() {
        this.stateManager.makeChange(async (data) => {
            const { room } = this.getSelections(data);
            const { x, y } = this.selectedEventCell;
            const events = getEventsAt(room.events, x, y);
            arrayDiscard(room.events, events[0]);
        });
    }

    /**
     * Replace the current bipsi data with the given bundle.
     * @param {maker.ProjectBundle<BipsiDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.ready = false;

        // account for changes between bipsi versions
        bipsi.updateProject(bundle.project);

        await this.stateManager.loadBundle(bundle);
        this.unsavedChanges = false;
    }

    /** @returns {string[]} */
    getManifest() {
        return [];
    }

    async exportProject() {
        // make a standalone bundle of the current project state and the 
        // resources it depends upon
        const bundle = await this.stateManager.makeBundle();

        // make a copy of this web page
        const clone = /** @type {HTMLElement} */ (document.documentElement.cloneNode(true));
        // remove some unwanted elements from the page copy
        ALL("[data-empty]", clone).forEach((element) => element.replaceChildren());
        ALL("[data-editor-only]", clone).forEach((element) => element.remove());
        // insert the project bundle data into the page copy 
        ONE("#bundle-embed", clone).innerHTML = JSON.stringify(bundle);

        // track how many remixes this is (remixes have soft-limits to encourage finding updates)
        const generation = parseInt(clone.getAttribute("data-remix-generation"));
        clone.setAttribute("data-remix-generation", `${generation + 1}`);

        // default to player mode
        clone.setAttribute("data-app-mode", "player");

        // prompt the browser to download the page
        const name = "bipsi.html";
        const blob = maker.textToBlob(clone.outerHTML, "text/html");
        maker.saveAs(blob, name);
    }

    async importProject() {
        // ask the browser to provide a file
        const [file] = await maker.pickFiles("text/html");
        // read the file and turn it into an html page
        const text = await maker.textFromFile(file);
        const html = await maker.htmlFromText(text);
        // extract the bundle from the imported page
        const bundle = maker.bundleFromHTML(html);
        // load the contents of the bundle into the editor
        await this.loadBundle(bundle);
    } 

    async resetProject() {
        // open a blank project in the editor
        await this.loadBundle(maker.bundleFromHTML(document, "#editor-embed") ?? bipsi.makeBlankBundle());
    }
    
    /**
     * Open a new tab with the original editor and send the current project to it.
     */
    async updateEditor() {
        // original editor url is stored in the html (may be different for 
        // custom editor mods)
        const liveURL = document.documentElement.getAttribute("data-editor-live");
        
        const bundle = await this.stateManager.makeBundle();
        
        // the original editor will check to see if it was opened by another
        // tab and then send us a message--if we receive it then we send the
        // bundle back 
        window.addEventListener("message", (event) => {
            event.data.port.postMessage({ bundle });
        });
        window.open(liveURL);
    }

    async save() {
        // visual feedback that saving is occuring
        this.actions.save.disabled = true;
        const timer = sleep(250);

        // make bundle and save it
        const bundle = await this.stateManager.makeBundle();
        bipsi.storage.save(bundle, "slot0");
        
        // successful save, no unsaved changes
        this.unsavedChanges = false;

        // allow saving again when enough time has passed to see visual feedback
        await timer;
        this.actions.save.disabled = false;
    }

    enterPlayerMode() {
        this.editorMode = false;
        // used to show/hide elements in css
        document.documentElement.setAttribute("data-app-mode", "player");
    }

    enterEditorMode() {
        this.editorMode = true;
        // used to show/hide elements in css
        document.documentElement.setAttribute("data-app-mode", "editor");

        // check if storage is available for saving
        this.actions.save.disabled = !bipsi.storage.available;
    }

    toggleHelp() {
        //this.helpContainer.hidden = !this.helpContainer.hidden;
    }
}

/**
 * Use inline style to resize canvas to fit its parent, preserving the aspect
 * ratio of its internal dimensions.
 * @param {HTMLCanvasElement} canvas 
 */
 function fitCanvasToParent(canvas) {
    const [tw, th] = [canvas.parentElement.clientWidth, canvas.parentElement.clientHeight];
    const [sw, sh] = [tw / canvas.width, th / canvas.height];
    const scale = Math.min(sw, sh);
    canvas.style.setProperty("width", `${canvas.width * scale}px`);
    canvas.style.setProperty("height", `${canvas.height * scale}px`);
}

async function makePlayer(font) {
    const player = new bipsi.Player(font);
    await player.init();

    const playCanvas = /** @type {HTMLCanvasElement} */ (ONE("#player-canvas"));
    const playRendering = /** @type {CanvasRenderingContext2D} */ (playCanvas.getContext("2d"));

    // update the canvas size every render just in case..
    player.addEventListener("render", () => {
        playRendering.drawImage(player.rendering.canvas, 0, 0);
        fitCanvasToParent(playCanvas);
        document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`);
    });

    // update the canvas size whenever the browser window resizes
    window.addEventListener("resize", () => fitCanvasToParent(playCanvas));
    
    // update the canvas size initially
    fitCanvasToParent(playCanvas);

    let moveCooldown = 0;
    const heldKeys = new Set();
    const keys = new Map();
    keys.set("ArrowLeft",  () => player.move(-1,  0));
    keys.set("ArrowRight", () => player.move( 1,  0));
    keys.set("ArrowUp",    () => player.move( 0, -1));
    keys.set("ArrowDown",  () => player.move( 0,  1));

    function doMove(key) {
        const move = keys.get(key);
        if (move) {
            move();
            moveCooldown = .2;
        }
    }

    let prev;
    const timer = (next) => {
        prev = prev ?? Date.now();
        next = next ?? Date.now();
        const dt = Math.max(0, (next - prev) / 1000.);
        moveCooldown = Math.max(moveCooldown - dt, 0);
        prev = next;
        window.requestAnimationFrame(timer);

        if (moveCooldown === 0) {
            const key = Array.from(keys.keys()).find((key) => heldKeys.has(key));
            if (key) doMove(key);
        }

        player.update(dt);
    }
    timer();

    function down(key) {
        if (player.dialoguePlayer.active) {
            player.proceed();
        } else {
            heldKeys.add(key);
            doMove(key);
        }
    }

    function up(key) {
        heldKeys.delete(key);
    }

    document.addEventListener("keydown", (event) => {
        if (!event.repeat) down(event.key);
    });
    document.addEventListener("keyup", (event) => up(event.key));

    const turnToKey = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    const threshold = 512 / 16 * 4;

    document.addEventListener("pointerdown", (event) => {
        const drag = ui.drag(event);
        let [x0, y0] = [drag.downEvent.clientX, drag.downEvent.clientY];

        bipsi.player.proceed();

        drag.addEventListener("move", () => {
            const [x1, y1] = [drag.lastEvent.clientX, drag.lastEvent.clientY];
            const [dx, dy] = [x1 - x0, y1 - y0];

            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            const angle = Math.atan2(dy, dx) + Math.PI * 2;
            const turns = Math.round(angle / (Math.PI * .5)) % 4;
            const nextKey = turnToKey[turns];

            if (dist >= threshold) {
                doMove(nextKey);
                x0 = x1;
                y0 = y1;
            } 
        });
    });

    return player;
}

bipsi.start = async function () {
    const font = await loadBasicFont(ONE("#font-embed"));

    bipsi.player = await makePlayer(font);
    bipsi.editor = new bipsi.Editor(font);
    await bipsi.editor.init();

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", () => bipsi.editor.enterPlayerMode());
    const edit = ui.action("edit", () => bipsi.editor.enterEditorMode());

    // determine if there is a project bundle embedded in this page
    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        // embedded project, load it in the player
        //await editor.loadBundle(bundle);
        bipsi.editor.enterPlayerMode();
        await bipsi.player.loadBundle(bundle);

    } else {
        // no embedded project, start editor with save or editor embed
        const save = await bipsi.storage.load("slot0").catch(() => undefined);
        const bundle = save || maker.bundleFromHTML(document, "#editor-embed");
        
        // load bundle and enter editor mode
        await bipsi.editor.loadBundle(bundle);
        //await editor.loadBundle(bipsi.makeBlankBundle());
        bipsi.editor.enterEditorMode();

        // unsaved changes warning
        window.addEventListener("beforeunload", (event) => {
            if (!bipsi.editor.unsavedChanges) return;
            event.preventDefault();
            return event.returnValue = "Are you sure you want to exit?";
        });
    }

    // if there's an opener window, tell it we're open to messages (e.g message
    // telling us to load a bundle from the "update" button of another bipsi)
    if (window.opener) {
        const channel = new MessageChannel();
        channel.port1.onmessage = async (event) => {
            if (event.data.bundle) {
                return bipsi.editor.loadBundle(event.data.bundle);
            }
        };
        window.opener.postMessage({ port: channel.port2 }, "*", [channel.port2]);
    }
}
