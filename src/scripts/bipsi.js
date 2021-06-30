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
 * @typedef {Object} BipsiDataEvent
 * @property {string} id
 * @property {number} graphic
 * @property {number[]} position
 * @property {string} script
 */

/**
 * @typedef {Object} BipsiDataRoom
 * @property {number} avatar
 * @property {number[][]} tilemap
 * @property {number[][]} wallmap
 * @property {BipsiDataEvent} events
 */

/**
 * @typedef {Object} BipsiDataProject
 * @property {BipsiDataSettings} settings
 * @property {BipsiDataRoom} rooms
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

    colorwheelMargin: 12,
}

function randomPalette() {
    const background = HSVToRGB({ h: Math.random(), s: .50, v: .2 });
    const foreground = HSVToRGB({ h: Math.random(), s: .75, v: .5 });
    const highlight = HSVToRGB({ h: Math.random(), s: .25, v: .75 });

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

/** 
 * Update the given bipsi project data so that it's valid for this current
 * version of bipsi.
 * @param {BipsiDataProject} project 
 */
bipsi.updateProject = function(project) {
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

const TEST_FG_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAAXNSR0IArs4c6QAAAAZQTFRFAAAA////pdmf3QAAAAJ0Uk5TAP9bkSK1AAAEUElEQVR4nO1Xi64bKwy0//+nr9oE8GvABjaproKqrg7Leobx2BCi3/iN3/iNf2rwV3GYmPnvg+jBZ8MJab3X/Xk89Wz/Avw3racVANuHibk/IM7XCXx/fFsC/hADjLODDy09ZYDm68EYF9UE/6ICOwTuZnonBTBWnRr3/67g1PF52loxg1sE9hT4H/WBpn01B7cUaCVYLcVrCuwSuJVpZm5VsNONoog1atsEbqVgX4GTPiCQAIEEl4MqkFCaAAcryjgJ7pBAtAIzqDKTDBQZr0AiBQcKqNZvFGC/YhpmZ+jDz6aA3Ypy/Bx1qADbFWWckz5Q6WK7fcAcfoECyeNxswrs2eOrIHk67aYAEBAZSBLYVMD1HVcFcWeq4CwzMCWQP52KdgVlP7SPpfAREnBmZQs3IyA8EBBQESCO3nCVwDQFIYF8H/g0gTAFnCBA0AOfSgEJD/BlBVYE3tuPquGKArxUoM+fK+AJtWhLBaK6xAQgXpCClwIz07cMPGXCN8qi6mKK9/rAYIDKviv2SBW84GhGgKnZcO2BjT4wGEwbn10xKB8qIDYHCbwW6RU3O+GQwhNoNlRmGaV72Af6YdACBQqM3KtqoFFHSTyYgrkH+uatRqaXQhzxBimgiAQKzM4Cr8BeH3D7E3hDAU+g4IFJH2heo+45X4YzBXiKk1HAes4SIDvBPsK+AiSlNwowYKQJqNCbfYBVDgZeI0GdW6wAYxw4BAFR5e1HqNwwGUZegQxs9kpGAZ5cIhiIAh7Rzy+lXgFZH1qBHkYxOCSA7h/AhNToNYCNKgg3bHPgGWkXNegLvwtizyEC1P4YDIoK6DuhrAvFICTQ4jZ03uyEstPHfQedBXLbCw94QqITyn3KKtC4FHrAMYACIBPKDdsJ7QF/H/Ab3zGhzTCRmZBvgAKSQZnAkQeYDcBxH4g6Ib4R9QgQBypg2XQFmgdopUANBzPTBIQCtFCgiJNSQFcBOQV4X4H5cNHthp0SdYhsClgUhpYmpcBmCoJVPlI36Hwv5Rd5BtQZbBAQPTtLbK6mLf/URyvIHptBsMTe130g4SHMYIbPc4NwX6RWxK0UMRAyqu9E3OKhjBgvNdAvElLJHx6ZT1fnuyeQS0Ev5ja77GtxRPOdiDvvA47ApZEgIFKwYFrGVnGrKXi9sofd8hnVTlUB8ULGTQ4iZ+WiAntnqo5GPU46tRHTMzNAZVcLR6ehkYC8FXoGUNyIAb1vXOqaT/LqV7LAuKeIuOf3geOxPA2fIqJSMlmgpnxyx6uUGdjX0vo+MCZ8/Rv8nBnmOJZZwPlkmH5A6xTfqn8cd7FgXv99dc4Crh+sU9BwQP0bAikLyH5At4W9O3LcCmVcWtlaML2ur+jZlyNzrL63d05Ji0XqwdPge28sv9f7UDtK7gD0CW5Hzfx73GayKURltKzzFU6NgLfAMYEs/qhu5QFtxd/4wEB94MP4rg/8xsfGty1wzQP/AQudDla7VWHbAAAAAElFTkSuQmCC";
const TEST_HI_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAAXNSR0IArs4c6QAAAAZQTFRFAAAA////pdmf3QAAAAJ0Uk5TAP9bkSK1AAAAUklEQVR4nO3WgQkAIAwDwXb/pQWXeNC7BRKqlM4AAAAAAAAAAAAAADxl6/wtG+zEE/h7/LdBnN8XAL5Sb92t936e3+/99vDZ/gvUL5AXAAAecwABZAAkhEAZyAAAAABJRU5ErkJggg==";

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
        this.test_fg = imageToRendering2D(await loadImage(TEST_FG_DATA));
        this.test_hi = imageToRendering2D(await loadImage(TEST_HI_DATA));
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

        this.refreshPreview();
    }

    refreshPreview() {
        const { color, palette, colorIndex } = this.getSelections();
        const previewPalette = [ ...palette ];
        previewPalette[colorIndex] = color.hex;
        const [ bg, fg, hi ] = previewPalette;

        fillRendering2D(this.editor.renderings.roomPaint, bg);
        const foreground = recolorMask(this.test_fg, fg);
        this.editor.renderings.roomPaint.drawImage(foreground.canvas, 0, 0);
        const highlight = recolorMask(this.test_hi, hi);
        this.editor.renderings.roomPaint.drawImage(highlight.canvas, 0, 0);
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

bipsi.TileBrowser = class {
    /**
     * @param {bipsi.Editor} editor 
     */
    constructor(editor) {
        this.editor = editor;

        this.thumbnailURIs = [];
        this.itemTemplate = ONE("#tile-select-item-template");
        this.itemContainer = this.itemTemplate.parentElement;
        this.itemTemplate.remove();
        /** @type {HTMLLabelElement[]} */
        this.items = [];

        this.select = ui.radio("tile-select");

        this.select.addEventListener("change", () => {
            this.redraw();
        });

        this.frame = 0;

        window.setInterval(() => {
            this.frame = 1 - this.frame;
            this.updateCSS();
            this.redraw();
        }, bipsi.constants.frameInterval);
    }

    get selectedTileIndex() {
        return this.select.valueAsNumber;
    }

    redraw() {
        const state = this.editor.stateManager;
        const tilesets = state.present.tilesets.map((id) => state.resources.get(id));
        const { x, y, size } = getTileCoords(tilesets[0].canvas, this.select.valueAsNumber);

        const [bg, fg] =  state.present.palettes[0];

        fillRendering2D(this.editor.renderings.tilePaint0, bg);
        this.editor.renderings.tilePaint0.drawImage(
            recolorMask(tilesets[0], fg).canvas,
            x, y, size, size,
            0, 0, size, size,
        );

        fillRendering2D(this.editor.renderings.tilePaint1, bg);
        this.editor.renderings.tilePaint1.drawImage(
            recolorMask(tilesets[1], fg).canvas,
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
        this.thumbnailURIs = blobs.map(URL.createObjectURL);
        prev.map(URL.revokeObjectURL);
        this.updateCSS();

        // TODO: can factor this out if tileset size is constant...
        const root = ONE(":root");
        const scale = 5;
        const w = canvases[0].width * scale;
        const h = canvases[0].height * scale;

        root.style.setProperty("--tileset-background-size", `${w}px ${h}px`);
        root.style.setProperty("--tileset-background-color", this.editor.stateManager.present.palettes[0][0]);

        const columns = canvases[0].width / bipsi.constants.tileSize;
        const rows = canvases[0].height / bipsi.constants.tileSize;
        this.updateTileCount(rows * columns);
        this.items.forEach((label, index) => {
            const { x, y } = getTileCoords(canvases[0], index);
            label.style.backgroundPosition = `-${x * scale}px -${y * scale}px`;
        });
    }

    updateCSS() {
        document.documentElement.style.setProperty(
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
    }

    async startDrag(event, frameIndex) {
        const rendering = [
            this.editor.renderings.tilePaint0,
            this.editor.renderings.tilePaint1,
        ][frameIndex];

        const tileIndex = this.editor.tileBrowser.select.selectedIndex;
        const { tilesets } = this.editor.getSelections();
        const { x: tx, y: ty } = getTileCoords(tilesets[0].canvas, tileIndex);
 
        this.editor.stateManager.makeCheckpoint();
        const frame = await this.editor.forkTilesetFrame(frameIndex);
        const width = frame.canvas.width;

        const redraw = () => {
            this.editor.tileBrowser.redraw();
        };

        const drag = ui.drag(event);
        const positions = trackCanvasStroke(rendering.canvas, drag);

        const { x, y } = positions[0];
        const pixel = frame.getImageData(x + tx, y + ty, 1, 1).data;
        const value = pixel[3] === 0 ? 0xFFFFFFFF : 0;

        const plot = (x, y) => {
            withPixels(frame, (pixels) => pixels[(y + ty) * width + (x + tx)] = value);
        };

        plot(x, y);

        drag.addEventListener("move", (event) => {
            const { x: x0, y: y0 } = positions[positions.length - 2];
            const { x: x1, y: y1 } = positions[positions.length - 1];
            lineplot(x0, y0, x1, y1, plot);
            redraw();
        });

        drag.addEventListener("up", (event) => {
            const { x, y } = positions[positions.length - 1];
            plot(x, y);
            redraw();
            this.editor.stateManager.changed();
        });
    }
}

bipsi.Editor = class extends EventTarget {
    /**
     * Setup most of the stuff for the flickguy editor (the rest is in init
     * because constructors can't be async). This includes finding the existing
     * HTML UI so it doesn't really make sense to construct this more than once
     * but a class is easy syntax for wrapping functions and state together 🤷‍♀️
     */
    constructor() {
        super();

        // run full editor functionally? (or just simple playback?)
        this.editorMode = true;

        // are there changes to warn about losing?
        this.unsavedChanges = false;

        // is there a fully loaded project?
        this.ready = false;

        // to determine which resources are still in use for the project we
        // combine everything the flickguy needs plus anything this editor
        // needs
        const getManifest = (data) => [...bipsi.getManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<BipsiDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");
        this.rendering.imageSmoothingEnabled = false;

        this.renderings = {
            roomPaint: ONE("#room-paint").getContext("2d"),
            tilePaint0: ONE("#tile-paint-0").getContext("2d"),
            tilePaint1: ONE("#tile-paint-1").getContext("2d"),
            tilePaintA: ONE("#tile-paint-a").getContext("2d"),
        };

        this.tileBrowser = new bipsi.TileBrowser(this);
        this.tileEditor = new bipsi.TileEditor(this);
        this.paletteEditor = new bipsi.PaletteEditor(this);

        // thumbnails for various ui buttons
        // this.layerThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        // this.optionThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        // this.paletteThumbs = ZEROES(8).map(() => createRendering2D(1, 1));

        // find all the ui already defined in the html
        this.modeSelect = ui.radio("mode-select");

        this.modeSelect.tab(ONE("#event-edit"), "events");
        this.modeSelect.tab(ONE("#palette-edit"), "palettes");
        this.modeSelect.tab(ONE("#tile-select-tab"), "draw-room", "draw-tiles");

        this.modeSelect.tab(ONE("#tile-paint-tab"), "draw-tiles");
        this.modeSelect.tab(ONE("#tile-map-tab"), "draw-room");

        // initial selections
        this.modeSelect.selectedIndex = 0;

        // editor actions controlled by html buttons
        this.actions = {
            // layer buttons
            layerUp: ui.action("layer-up", () => this.shiftLayerUp()),
            layerDown: ui.action("layer-down", () => this.shiftLayerDown()),

            // editor toolbar
            undo: ui.action("undo", () => this.stateManager.undo()),
            redo: ui.action("redo", () => this.stateManager.redo()),
            copy: ui.action("copy", () => this.copyLayerOption()),
            paste: ui.action("paste", () => this.pasteLayerOption()),
            clear: ui.action("clear", () => this.clearLayerOption()),
            randomise: ui.action("randomise", () => this.randomise()),
            save: ui.action("save", () => this.save()),

            // editor menu
            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),
            update: ui.action("update", () => this.updateEditor()),

            // playback menu
            exportImage: ui.action("export-image", () => this.exportImage()),

            // special feature
            importPalettes: ui.action("import-palettes", () => this.importPalettes()),
            exportPalettes: ui.action("export-palettes", () => this.exportPalettes()),

            copyTile: ui.action("copy-tile", () => this.copySelectedTile()),
            pasteTile: ui.action("paste-tile", () => this.pasteSelectedTile()),
            clearTile: ui.action("clear-tile", () => this.clearSelectedTile()),

            shiftTileUp: ui.action("shift-tile-up", () => this.shiftSelectedTile(0, -1)),
            shiftTileDown: ui.action("shift-tile-down", () => this.shiftSelectedTile(0, 1)),
            shiftTileLeft: ui.action("shift-tile-left", () => this.shiftSelectedTile(-1, 0)),
            shiftTileRight: ui.action("shift-tile-right", () => this.shiftSelectedTile(1, 0)),
        };

        // can't undo/redo/paste yet
        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.paste.disabled = true;
        this.actions.pasteTile.disabled = true;

        // hotkeys
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey) {
                if (event.key === "z") this.actions.undo.invoke();
                if (event.key === "y") this.actions.redo.invoke();
                if (event.key === "s") {
                    event.preventDefault();
                    this.actions.save.invoke();
                }
            } else {
                const topkeys = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT"]; 
                topkeys.forEach((code, i) => {
                    if (event.code === code) this.modeSelect.selectedIndex = i;
                });
            }
        });

        // changes in mode select bar
        this.modeSelect.addEventListener("change", () => {
            
        });

        // whenever the project data is changed
        this.stateManager.addEventListener("change", () => {
            this.unsavedChanges = true;
            this.ready = true;
    
            this.paletteEditor.refreshDisplay();
            
            // enable/disable undo/redo buttons
            this.actions.undo.disabled = !this.stateManager.canUndo;
            this.actions.redo.disabled = !this.stateManager.canRedo;

            const data = this.stateManager.present;
            /** @type {CanvasRenderingContext2D} */
            const tileset = recolorMask(this.stateManager.resources.get(data.tilesets[0]), data.palettes[0][1]);
            const tileset2 = recolorMask(this.stateManager.resources.get(data.tilesets[1]), data.palettes[0][1]);

            this.tileBrowser.setFrames([tileset.canvas, tileset2.canvas]);

            // render room
            this.rendering.fillStyle = data.palettes[0][0];
            this.rendering.fillRect(0, 0, 128, 128);
            const room = this.stateManager.present.rooms[0];
            const size = bipsi.constants.tileSize;

            const columns = tileset.canvas.width / size;
            const rows = tileset.canvas.height / size;

            room.tilemap.forEach((row, dy) => {
                row.forEach((cell, dx) => {
                    const sx = size * (cell % 16);
                    const sy = size * Math.floor(cell / columns);

                    this.rendering.drawImage(
                        tileset.canvas,
                        sx, sy, size, size, 
                        dx * size, dy * size, size, size,
                    );
                });
            });

            this.tileBrowser.redraw();
        });
    }

    async init() {
        await this.paletteEditor.init();
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
        
        return { tilesets };
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

    async shiftSelectedTile(dx, dy) {
        return this.stateManager.makeChange(async (data) => {
            const tileset0 = await this.forkTilesetFrame(0);
            const tileset1 = await this.forkTilesetFrame(1);

            const sx = -Math.sign(dx);
            const sy = -Math.sign(dy);

            [tileset0, tileset1].forEach((tileset) => {
                const { x, y, size } = getTileCoords(tileset.canvas, this.tileBrowser.selectedTileIndex);
                const frame = copyRendering2D(tileset, undefined, { x, y, w: size, h: size });
                const temp = copyRendering2D(frame);

                fillRendering2D(frame);
                frame.drawImage(temp.canvas, dx,           dy          );
                frame.drawImage(temp.canvas, dx + size*sx, dy          ); 
                frame.drawImage(temp.canvas, dx + size*sx, dy + size*sy); 
                frame.drawImage(temp.canvas, dx,           dy + size*sy); 

                tileset.clearRect(x, y, size, size);
                tileset.drawImage(frame.canvas, x, y);
            });
        });
    }

    /**
     * Replace the current flickguy data with the given bundle.
     * @param {maker.ProjectBundle<BipsiDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.ready = false;

        // account for changes between flickguy versions
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
        await this.loadBundle(bipsi.makeBlankBundle());
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
        flickguy.storage.save(bundle, "slot0");
        
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

bipsi.start = async function () {
    const editor = new bipsi.Editor();
    await editor.init();

    bipsi.editor = editor;

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", () => editor.enterPlayerMode());
    const edit = ui.action("edit", () => editor.enterEditorMode());

    // determine if there is a project bundle embedded in this page
    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        // embedded project, load it in the player
        await editor.loadBundle(bundle);
        editor.enterPlayerMode();
    } else {
        // no embedded project, start editor with save or editor embed
        const save = await bipsi.storage.load("slot0").catch(() => undefined);
        const bundle = save || maker.bundleFromHTML(document, "#editor-embed");
        
        // load bundle and enter editor mode
        await editor.loadBundle(bundle);
        //await editor.loadBundle(bipsi.makeBlankBundle());
        editor.enterEditorMode();

        // unsaved changes warning
        window.addEventListener("beforeunload", (event) => {
            if (!editor.unsavedChanges) return;
            event.preventDefault();
            return event.returnValue = "Are you sure you want to exit?";
        });
    }

    // if there's an opener window, tell it we're open to messages (e.g message
    // telling us to load a bundle from the "update" button of another flickguy)
    if (window.opener) {
        const channel = new MessageChannel();
        channel.port1.onmessage = async (event) => {
            if (event.data.bundle) {
                return editor.loadBundle(event.data.bundle);
            }
        };
        window.opener.postMessage({ port: channel.port2 }, "*", [channel.port2]);
    }
}
