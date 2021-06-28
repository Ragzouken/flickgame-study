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

        fillRendering2D(this.editor.rendering, bg);
        const foreground = recolorMask(this.test_fg, fg);
        this.editor.rendering.drawImage(foreground.canvas, 0, 0, 256, 256);
        const highlight = recolorMask(this.test_hi, hi);
        this.editor.rendering.drawImage(highlight.canvas, 0, 0, 256, 256);
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

        window.setInterval(() => {
            const prev = this.thumbnailURIs.shift();
            if (prev) this.thumbnailURIs.push(prev);
            this.updateCSS();
        }, bipsi.constants.frameInterval);
    }

    async setFrames(canvases) {
        const prev = [...this.thumbnailURIs];
        const blobs = await Promise.all(canvases.map(canvasToBlob));
        this.thumbnailURIs = blobs.map(URL.createObjectURL);
        prev.map(URL.revokeObjectURL);
    }

    updateCSS() {
        document.documentElement.style.setProperty(
            "--tileset-background-image", 
            `url("${this.thumbnailURIs[0]}")`,
        );
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

        this.tileBrowser = new bipsi.TileBrowser(this);
        this.paletteEditor = new bipsi.PaletteEditor(this);

        // thumbnails for various ui buttons
        // this.layerThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        // this.optionThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        // this.paletteThumbs = ZEROES(8).map(() => createRendering2D(1, 1));

        // find all the ui already defined in the html
        this.modeSelect = ui.radio("mode-select");

        this.modeSelect.tab(ONE("#event-edit"), "events");
        this.modeSelect.tab(ONE("#palette-edit"), "palettes");
        this.modeSelect.tab(ONE("#tile-select"), "draw-room", "draw-tiles");

        // initial selections
        this.modeSelect.selectedIndex = 0;

        // tile select sprite
        ALL("#tile-select label").forEach((label, index) => {
            const width = 16;
            const x = bipsi.constants.tileSize * (index % 16);
            const y = bipsi.constants.tileSize * Math.floor(index / width);

            label.style.backgroundPosition = `calc(-${x}px -${y}px`;
        });

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
        };

        // can't undo/redo/paste yet
        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.paste.disabled = true;

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
            const tileset2 = recolorMask(this.stateManager.resources.get(data.tilesets[0]), data.palettes[0][2]);

            this.tileBrowser.setFrames([tileset.canvas, tileset2.canvas]);

            tileset.canvas.toBlob((blob) => {
                const root = ONE(":root");
                const scale = 5;
                const w = tileset.canvas.width * scale;
                const h = tileset.canvas.height * scale;

                root.style.setProperty("--tileset-background-size", `${w}px ${h}px`);
                root.style.setProperty("--tileset-background-color", data.palettes[0][0]);

                ALL("#tile-select label").forEach((label, index) => {
                    const width = 16;
                    const x = bipsi.constants.tileSize * scale * (index % 16);
                    const y = bipsi.constants.tileSize * scale * Math.floor(index / width);
        
                    label.style.backgroundPosition = `-${x}px -${y}px`;
                });
            });
        });

        // whenever a pointer moves anywhere on screen, update the paint cursors
        // --listen on the whole document because for e.g line drawing it is 
        // valid to move the mouse outside the edges of the drawing area
        document.addEventListener("pointermove", (event) => {
            //const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);
            //this.refreshPaintToolPreview(x, y);
        });
        
        // all painting begins by a pointer press on the rendering canvas
        //this.rendering.canvas.addEventListener("pointerdown", (event) => this.onPaintPointerDown(event));
    }

    async init() {
        await this.paletteEditor.init();
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
