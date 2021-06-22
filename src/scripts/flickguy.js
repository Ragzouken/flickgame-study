const flickguy = {};

// browser saves will be stored under the id "flickguy"
flickguy.storage = new maker.ProjectStorage("flickguy");

// add a resource type called "canvas-datauri" that describes how to load a
// canvas rendering context from a datauri, how to copy one, and how to convert
// one back into a datauri
maker.resourceHandlers.set("canvas-datauri", {
    load: async (data) => imageToRendering2D(await loadImage(data)),
    copy: async (instance) => copyRendering2D(instance),
    save: async (instance) => instance.canvas.toDataURL("image/png", 1),
});

// type definitions for the structure of flickguy project data. useful for the
// code editor, ignored by the browser 
/**
 * @typedef {Object} FlickguyDataLayerOption
 * @property {string} image
 * @property {number?} palette
 */

/**
 * @typedef {Object} FlickguyDataLayer
 * @property {FlickguyDataLayerOption[]} options
 */

/**
 * @typedef {Object} FlickguyDataProject
 * @property {string[][]} palettes
 * @property {string[]} fixedPalette
 * @property {FlickguyDataLayer[]} layers
 * @property {number[]} selected
 */

/** 
 * @param {FlickguyDataProject} data 
 * @returns {string[]}
 */

// define how to determine which resources a particular flickguy project data
// depends on. in this case resources are the individual images, so the 
// dependencies are all image ids in the project
flickguy.getManifest = function (data) {
    // layer option images are the only resource dependencies in a flickguy
    return data.layers.flatMap((layer) => layer.options.map((option) => option.image));
}

// keep the image size constant in one place--haven't checked whether you can
// actually change these numbers and not break things
flickguy.layerWidth = 128;
flickguy.layerHeight = 128;
flickguy.exportScale = 4;

/** 
 * Create a valid bundle for an empty flickguy project.
 * @returns {maker.ProjectBundle<FlickguyDataProject>} 
 */
flickguy.makeBlankBundle = function () {
    const blank = createRendering2D(flickguy.layerWidth, flickguy.layerHeight);
    fillRendering2D(blank);
    const layers = ZEROES(8).map(() => ({  
        options: ZEROES(8).map(() => ({ image: "0", palette: 0 })),
    }));
    const project = { 
        palettes: flickguy.defaultPalettes, 
        fixedPalette: this.defaultFixedPalette,
        layers, 
        selected: ZEROES(8), 
    };
    const resources = {
        "0": { type: "canvas-datauri", data: blank.canvas.toDataURL() },
    };

    return { project, resources };
}

/** 
 * Update the given flickguy project data so that it's valid for this current
 * version of flickguy.
 * @param {FlickguyDataProject} project 
 */
flickguy.updateProject = function(project) {
    project.selected = project.selected || ZEROES(8);
    project.fixedPalette = project.fixedPalette || flickguy.defaultFixedPalette;
}

/**
 * In the given rendering, replace every instance of a color in the prev palette
 * with the corresponding color in the next palette, ignoring colors that don't
 * appear. This is broken in firefox because colors are not stored exactly. 
 * @param {CanvasRenderingContext2D} rendering 
 * @param {string[]} prev 
 * @param {string[]} next 
 */
function swapPalette(rendering, prev, next) {
    const mapping = new Map();
    prev.forEach((hex, index) => mapping.set(hexToUint32(prev[index]), hexToUint32(next[index])));

    withPixels(rendering, (pixels) => {
        for (let i = 0; i < pixels.length; ++i) {
            pixels[i] = mapping.get(pixels[i]) || pixels[i];
        }
    });
}

/**
 * Replace every color in the given rendering. Each existing color is matched
 * to the closest color in the prev palette and replaced with the corresponding
 * color in the next palette. 
 * @param {CanvasRenderingContext2D} rendering 
 * @param {string[]} prev 
 * @param {string[]} next 
 */
 function swapPaletteSafe(rendering, prev, next) {
    const mapping = new Map();
    const prevUint32 = prev.map((hex) => hexToUint32(hex));
    const nextUint32 = next.map((hex) => hexToUint32(hex));
    prevUint32.forEach((_, i) => mapping.set(prevUint32[i], nextUint32[i % nextUint32.length]));
    mapping.set(0, 0);

    function addMissing(prev) {
        let bestDistance = Infinity;
        let bestNext = nextUint32[0];

        const pr = prev >>>  0 & 0xFF;
        const pg = prev >>>  8 & 0xFF;
        const pb = prev >>> 16 & 0xFF;

        for (let i = 0; i < prevUint32.length; ++i) {
            const target = prevUint32[i];
            const tr = target >>>  0 & 0xFF;
            const tg = target >>>  8 & 0xFF;
            const tb = target >>> 16 & 0xFF;

            const dist = Math.abs(pr - tr) 
                       + Math.abs(pg - tg) 
                       + Math.abs(pb - tb);

            if (dist < bestDistance) {
                bestDistance = dist;
                bestNext = nextUint32[i];
            }
        }

        mapping.set(prev, bestNext);
        return bestNext;
    }

    withPixels(rendering, (pixels) => {
        for (let i = 0; i < pixels.length; ++i) {
            const prev = pixels[i];
            if (prev) pixels[i] = mapping.get(prev) || addMissing(prev);
        }
    });
}

/**
 * Return a random integer at least min and below max. Why is that the normal
 * way to do random ints? I have no idea.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
 function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// default palettes (8 palettes of 8 colors)
flickguy.defaultPalettes = [
    ["#000000","#94216a","#ff2674","#ff80a4","#34111f","#73392e","#c76e46","#ffb762"],["#000000","#d62411","#ff8426","#ffd100","#73392e","#c76e46","#eb9c6e","#ffdaac"],["#000000","#007899","#10d275","#bfff3c","#430067","#94216a","#ff2674","#ff80a4"],["#000000","#94216a","#ff2674","#ff80a4","#002859","#007899","#10d275","#bfff3c"],["#000000","#d62411","#ff8426","#ffd100","#1b1023","#002859","#007899","#68aed4"],["#000000","#002859","#007899","#68aed4","#430067","#94216a","#ff2674","#ff80a4"],["#000000","#007899","#10d275","#bfff3c","#7f0622","#d62411","#ff8426","#ffd100"],["#000000","#002859","#007899","#68aed4","#7f0622","#d62411","#ff8426","#ffd100"]
];

flickguy.defaultFixedPalette = [
    "#000000","#fafdff","#ff80a4","#68aed4","#d62411","#ff8426","#ffd100","#bfff3c","#10d275","#007899","#234975","#430067","#94216a","#ff2674","#73392e","#16171a",
];

// brush names and datauris
flickguy.brushes = [
    { name: "1px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABlJREFUOI1jYBgFwx38/////0C7YRQMDQAApd4D/cefQokAAAAASUVORK5CYII=" },
    { name: "2px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABpJREFUOI1jYBgFwx38hwJ8apjo5ZhRMKgBADvbB/vPRl6wAAAAAElFTkSuQmCC" },
    { name: "3px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACNJREFUOI1jYBgFgxz8////PyE1jMRoZmRkxKmOYheMgmEBAARbC/qDr1pMAAAAAElFTkSuQmCC" },
    { name: "4px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAChJREFUOI1jYBgFgxz8hwJ8ahjxaUZRyMiIVS0TeW4jEhDjhVEwGAAAJhAT9IYiYRoAAAAASUVORK5CYII=" },
];

flickguy.Editor = class extends EventTarget {
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
        const getManifest = (data) => [...flickguy.getManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<FlickguyDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");

        // temporary rendering for compositing layers in editor
        this.stackActive = createRendering2D(flickguy.layerWidth, flickguy.layerHeight);
        this.stackUnder = createRendering2D(flickguy.layerWidth, flickguy.layerHeight);
        this.stackOver = createRendering2D(flickguy.layerWidth, flickguy.layerHeight);
        
        // preview for paint tools e.g line cursor
        this.preview = createRendering2D(this.rendering.canvas.width, this.rendering.canvas.height);
        
        // thumbnails for various ui buttons
        this.layerThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        this.optionThumbs = ZEROES(8).map(() => createRendering2D(flickguy.layerWidth, flickguy.layerHeight));
        this.paletteThumbs = ZEROES(8).map(() => createRendering2D(1, 1));

        // find all the ui already defined in the html
        this.layerSelect = ui.radio("layer-select");
        this.optionSelect = ui.radio("option-select");
        this.paletteSelect = ui.radio("palette-select");
        this.stackLayers = ui.toggle("stack-layers");
        this.fixedPalette = ui.toggle("fixed-palette");

        this.toolSelect = ui.radio("tool-select");
        this.brushSelect = ui.radio("brush-select");
        this.colorSelect = ui.radio("color-select");
        this.helpContainer = ONE("#help");   

        // initial selections
        this.layerSelect.selectedIndex = 0;
        this.optionSelect.selectedIndex = 0;
        this.paletteSelect.selectedIndex = 0;

        this.toolSelect.selectedIndex = 0;
        this.brushSelect.selectedIndex = 0;
        this.colorSelect.selectedIndex = 1;

        // add thumbnails to the layer select bar
        ALL("#layer-select canvas").forEach((canvas, index) => {
            canvas.replaceWith(this.layerThumbs[index].canvas);
        });

        // add thumbnails to the option select bar
        ALL("#option-select canvas").forEach((canvas, index) => {
            canvas.replaceWith(this.optionThumbs[index].canvas);
        });

        // add thumbnails to the palette select bar
        ALL("#palette-select canvas").forEach((canvas, index) => {
            canvas.replaceWith(this.paletteThumbs[index].canvas);
        });

        // add brush icons and tooltips to brush select buttons
        ALL("#brush-select label").forEach((label, index) => {
            ONE("input", label).title = flickguy.brushes[index].name + " brush";
            ONE("img", label).src = flickguy.brushes[index].image;
        });

        // state of the paint tools:
        // is the color pick key held down?
        this.heldColorPick = false;
        // current brush recolored with current color
        this.activeBrush = undefined;
        // saved start coordinates during a line draw
        this.lineStart = undefined;
        // saved start coordinates during shift
        this.shiftStart = undefined;
        // layer option currently in the clipboard
        this.copiedLayerOption = undefined;

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
                if (event.key === "c") this.actions.copy.invoke();
                if (event.key === "v") this.actions.paste.invoke();
                if (event.key === "x") {
                    this.actions.copy.invoke();
                    this.actions.clear.invoke();
                }
                if (event.key === "s") {
                    event.preventDefault();
                    this.actions.save.invoke();
                }
                if (event.key === ",") this.randomise({ palettes: false });
                if (event.key === ".") this.randomise({ options: false });
            } else {
                if (event.code === "KeyQ") this.toolSelect.selectedIndex = 0;
                if (event.code === "KeyW") this.toolSelect.selectedIndex = 1;
                if (event.code === "KeyE") this.toolSelect.selectedIndex = 2;
                if (event.code === "KeyR") this.toolSelect.selectedIndex = 3;
    
                if (event.code === "KeyA") this.brushSelect.selectedIndex = 0;
                if (event.code === "KeyS") this.brushSelect.selectedIndex = 1;
                if (event.code === "KeyD") this.brushSelect.selectedIndex = 2;
                if (event.code === "KeyF") this.brushSelect.selectedIndex = 3;
            }

            this.heldColorPick = event.altKey;
        });

        // stop temporarily color picking if the alt key is released
        document.addEventListener("keyup", (event) => {
            this.heldColorPick = event.altKey;
        });

        // changes in layer select bar
        this.layerSelect.addEventListener("change", () => {
            this.refreshLayerDisplay();
        });

        // switching option within a layer
        this.optionSelect.addEventListener("change", async () => {
            // remember selected option for this layer
            this.stateManager.present.selected[this.layerSelect.selectedIndex] = this.optionSelect.selectedIndex;
            
            const { option } = this.getSelections();

            if (option.palette !== undefined) {
                // recolor new option to current color selection
                await this.setOptionPalette(
                    this.stateManager.present,
                    this.layerSelect.selectedIndex,
                    this.optionSelect.selectedIndex,
                    this.paletteSelect.selectedIndex,
                );
            }
            
            this.refreshColorSelect();
            this.render();
        });

        // changes in palette select bar
        this.paletteSelect.addEventListener("change", async () => {
            await this.setOptionPalette(
                this.stateManager.present,
                this.layerSelect.selectedIndex,
                this.optionSelect.selectedIndex,
                this.paletteSelect.selectedIndex,
            );

            this.render();
            this.refreshColorSelect();
        });

        // changes in stack layers toggle
        this.stackLayers.addEventListener("change", () => {
            this.render();
        });

        // changes in the brush and color select
        this.brushSelect.addEventListener("change", () => this.refreshActiveBrush());
        this.colorSelect.addEventListener("change", () => this.refreshActiveBrush());
    
        this.fixedPalette.addEventListener("change", () => {
            return this.stateManager.makeChange(async (data) => {
                return this.setOptionPalette(
                    data,
                    this.layerSelect.selectedIndex,
                    this.optionSelect.selectedIndex,
                    this.fixedPalette.checked ? undefined : this.paletteSelect.selectedIndex,
                );
            });
        });

        // whenever the project data is changed
        this.stateManager.addEventListener("change", () => {
            this.unsavedChanges = true;
            this.ready = true;

            this.refreshPaletteThumbs();
            this.refreshLayerThumbnails();
            this.refreshLayerDisplay();
    
            // enable/disable undo/redo buttons
            this.actions.undo.disabled = !this.stateManager.canUndo;
            this.actions.redo.disabled = !this.stateManager.canRedo;
        });

        // whenever a pointer moves anywhere on screen, update the paint cursors
        // --listen on the whole document because for e.g line drawing it is 
        // valid to move the mouse outside the edges of the drawing area
        document.addEventListener("pointermove", (event) => {
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);
            this.refreshPreview(x, y);
        });
        
        // all painting begins by a pointer press on the rendering canvas
        this.rendering.canvas.addEventListener("pointerdown", (event) => this.onPaintPointerDown(event));
    }

    async init() {
        // load all the brush images
        this.brushRenders = await Promise.all(flickguy.brushes.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        
        // make brush and pattern valid
        this.refreshActiveBrush();
    }

    /**
     * Return the various "selected" / "active" objects from editor state and
     * either the given project data or the present project data.
     * @param {FlickguyDataProject} data
     */
    getSelections(data = undefined) {
        data = data || this.stateManager.present;
        const layer = data.layers[this.layerSelect.selectedIndex];
        const option = layer.options[this.optionSelect.selectedIndex];
        const palette = data.palettes[option.palette] || data.fixedPalette;
        const brush = this.brushRenders[this.brushSelect.selectedIndex];
        const color = palette[this.colorSelect.selectedIndex];
        const instance = this.stateManager.resources.get(option.image);

        return { layer, option, palette, color, instance, brush };
    }

    /**
     * Replace the current flickguy data with the given bundle.
     * @param {maker.ProjectBundle<FlickguyDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.ready = false;

        // account for changes between flickguy versions
        flickguy.updateProject(bundle.project);

        await this.stateManager.loadBundle(bundle);
        this.unsavedChanges = false;
    }

    /**
     * @param {FlickguyDataLayerOption} option 
     * @returns {Promise<CanvasRenderingContext2D>}
     */
    async forkLayerOptionImage(option) {
        // create a new copy of the image resource
        const { id, instance } = await this.stateManager.resources.fork(option.image);
        // replace the option's image with the new copy
        option.image = id;
        // return the instance of the image for editing
        return instance;
    }

    render() {
        if (!this.ready) return;

        // clear everything
        fillRendering2D(this.stackActive);
        fillRendering2D(this.stackUnder);
        fillRendering2D(this.stackOver);
        fillRendering2D(this.rendering);

        // composite layers into below, current, above
        this.stateManager.present.layers.forEach((layer, index) => {
            // get the layer's current option scene's image
            const option = layer.options[this.stateManager.present.selected[index]];
            const image = this.stateManager.resources.get(option.image);
            
            if (index < this.layerSelect.selectedIndex) this.stackUnder.drawImage(image.canvas, 0, 0);
            if (index > this.layerSelect.selectedIndex) this.stackOver.drawImage(image.canvas, 0, 0);
            if (index === this.layerSelect.selectedIndex) this.stackActive.drawImage(image.canvas, 0, 0);
        });

        // should other layers be drawn transparent?
        const onion = this.editorMode && !this.stackLayers.checked;
        const inactiveAlpha = onion ? .35 : 1;

        // all layers below the active layer
        this.rendering.globalAlpha = inactiveAlpha;
        this.rendering.drawImage(this.stackUnder.canvas, 0, 0);
        // the active layer + paint preview
        this.rendering.globalAlpha = 1;
        this.rendering.drawImage(this.stackActive.canvas, 0, 0);
        this.rendering.drawImage(this.preview.canvas, 0, 0);
        // all layers above the active layer
        this.rendering.globalAlpha = inactiveAlpha;
        this.rendering.drawImage(this.stackOver.canvas, 0, 0);
        this.rendering.globalAlpha = 1;

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    /**
     * Handle a pointer down event on the paint area--this is how all painting
     * begins.
     * @param {PointerEvent} event
     */
    async onPaintPointerDown(event) {
        // for mouse ignore non-left-clicks
        if (event.button !== 0) return;
        // ignore in player mode
        if (!this.editorMode) return;

        // treat this as the beginning of a possible drag
        const drag = ui.drag(event);
        const positions = trackCanvasStroke(this.rendering.canvas, drag);

        // prepare the plot function

        // temporary layer for painting to
        const mask = createRendering2D(flickguy.layerWidth, flickguy.layerHeight);
        // painting is done to the temporary layer. all brushes are 16x16
        const plotMask = (x, y) => mask.drawImage(this.activeBrush.canvas, (x - 7) | 0, (y - 7) | 0);
        // convenience function to draw accounting for the transparent color
        // and then notify changes
        const drawMask = (instance) => {
            // the first color of every palette is transparent
            const erase = this.colorSelect.selectedIndex === 0;
            // mask is the "source", image is the "destination". to erase
            // we cut DESTINATION pixels OUT according to source. to paint
            // normally we copy SOURCE pixels OVER destination pixels.
            instance.globalCompositeOperation = erase ? "destination-out" : "source-over";
            instance.drawImage(mask.canvas, 0, 0);
            instance.globalCompositeOperation = "source-over";
            // notify change so thumbnails etc can update
            this.stateManager.changed();
        };

        const startStroke = () => {
            // checkpoint to undo to before this edit
            this.stateManager.makeCheckpoint();
            // make edit on a new copy of this image
            const { option } = this.getSelections();
            return this.forkLayerOptionImage(option);
        };

        /**
         * @param {HTMLCanvasElement} canvas 
         * @param {ui.PointerDrag} drag 
         */
        function trackCanvasStroke(canvas, drag) {
            const positions = [mouseEventToCanvasPixelCoords(canvas, drag.downEvent)];
            const update = (event) => positions.push(mouseEventToCanvasPixelCoords(canvas, event.detail));
            drag.addEventListener("up", update);
            drag.addEventListener("move", update);
            return positions;
        }

        // color picker selected or color pick hotkey held
        if (this.toolSelect.value === "pick" || this.heldColorPick) {
            drag.addEventListener("click", () => this.pickColor(positions[0].x, positions[0].y));
        // flood fill selected
        } else if (this.toolSelect.value === "fill") {
            drag.addEventListener("click", () => this.floodFill(positions[0].x, positions[0].y));
        // freehand drawing selected
        } else if (this.toolSelect.value === "freehand") {
            const instance = await startStroke();

            // draw the brush at the position the drag begins
            plotMask(positions[0].x, positions[0].y);
            drawMask(instance);

            // draw the brush at the last position of the drag
            drag.addEventListener("up", () => {
                const { x, y } = positions[positions.length-1];
                plotMask(x, y);
                drawMask(instance);
            });

            // as the pointer moves, draw brush lines between the points
            drag.addEventListener("move", () => {
                const { x: x0, y: y0 } = positions[positions.length-2];
                const { x: x1, y: y1 } = positions[positions.length-1];
                lineplot(x0, y0, x1, y1, plotMask);
                drawMask(instance);
            });
        // line drawing selected
        } else if (this.toolSelect.value === "line") {
            // need to save this to draw the line preview
            this.lineStart = positions[0];
            this.refreshPreview(positions[0].x, positions[0].y);

            // only actually draw the line at the end
            drag.addEventListener("up", async (event) => {
                const instance = await startStroke();
                
                // line from pointer down position to pointer up position
                const { x: x0, y: y0 } = positions[0];
                const { x: x1, y: y1 } = positions[positions.length-1];

                lineplot(x0, y0, x1, y1, plotMask);
                drawMask(instance);

                // stop tracking line drawing
                this.lineStart = undefined;
            });
        } else if (this.toolSelect.value === "shift") {
            this.shiftStart = positions[0];

            drag.addEventListener("up", async (event) => {
                const { x: x0, y: y0 } = positions[0];
                const { x: x1, y: y1 } = positions[positions.length-1];

                fillRendering2D(this.preview);
                this.preview.drawImage(this.stackActive.canvas, x1 - x0, y1 - y0);

                const instance = await startStroke();
                fillRendering2D(instance);
                instance.drawImage(this.preview.canvas, 0, 0);
                
                this.shiftStart = undefined;
                this.refreshPreview(x1, y1);
            });
        }
    }

    refreshPreview(x, y) {
        if (!this.editorMode || !this.activeBrush) return;

        // clear existing preview
        fillRendering2D(this.preview);

        // prepare plot function
        const plot = (x, y) => this.preview.drawImage(this.activeBrush.canvas, (x - 7) | 0, (y - 7) | 0);

        // move tool has a special cursor, crosshair for everything else
        const cursor = this.toolSelect.value === "shift" ? "move" : "crosshair";
        this.rendering.canvas.style.setProperty("cursor", cursor);

        if (this.shiftStart) {
            // show another copy of the current layer as moved by the mouse
            const { x: ox, y: oy } = this.shiftStart;
            this.preview.drawImage(this.stackActive.canvas, x - ox, y - oy);
        } else if (this.heldColorPick) {
            // no preview for color picking
        } else if (this.lineStart) {
            // draw a line between the pointer down location and the current 
            // pointer location
            const { x: x0, y: y0 } = this.lineStart;
            lineplot(x0, y0, x, y, plot);
        } else if (this.toolSelect.value === "freehand" || this.toolSelect.value === "line") {
            // draw the colored brush at the current pointer location
            plot(x, y);
        } 

        this.render();
    }

    refreshLayerDisplay() {
        // can't shift layers beyond the edges
        this.actions.layerUp.disabled = this.layerSelect.selectedIndex < 1;
        this.actions.layerDown.disabled = this.layerSelect.selectedIndex > 6;

        // switch option to remembered option for this layer
        this.optionSelect.setSelectedIndexSilent(this.stateManager.present.selected[this.layerSelect.selectedIndex]);

        // switch palette select to match option's current palette if any
        const { option } = this.getSelections();
        if (option.palette !== undefined) {
            this.paletteSelect.selectedIndex = option.palette;
        }

        this.refreshLayerOptionThumbnails();
        this.refreshColorSelect();
        this.refreshActiveBrush();

        this.render();
    }

    refreshActiveBrush() {
        if (!this.ready) return;

        const { brush, color } = this.getSelections();

        // make a recolored copy of the brush for painting with
        this.activeBrush = this.colorSelect.selectedIndex > 0 
                         ? recolorMask(brush, color) 
                         : brush;
    }

    refreshPaletteThumbs() {
        // generate palette thumbnails
        this.paletteThumbs.forEach((thumbnail, index) => {
            const size = 12;

            thumbnail.canvas.width = 4 * size;
            thumbnail.canvas.height = 2 * size;

            const palette = this.stateManager.present.palettes[index];
            for (let y = 0; y < 2; ++y) {
                for (let x = 0; x < 4; ++x) {
                    thumbnail.fillStyle = palette[y * 4 + x];
                    thumbnail.fillRect(x * size, y * size, size, size);
                }
            }
        });
    }

    refreshColorSelect() {
        const { option, palette } = this.getSelections();

        this.fixedPalette.setCheckedSilent(option.palette === undefined);
        ONE("#tools").classList.toggle("fixed-palette", option.palette === undefined);

        // recolor the color select buttons to the corresponding color
        ALL("#color-select label").forEach((label, index) => {
            label.style.background = index > 0 ? palette[index] : "var(--trans-gradient)";
        });

        this.colorSelect.selectedIndex = Math.min(palette.length-1, this.colorSelect.selectedIndex);
    }

    refreshLayerThumbnails() {
        this.layerThumbs.forEach((thumbnail, index) => {
            const layer = this.stateManager.present.layers[index];

            fillRendering2D(thumbnail);

            layer.options.forEach((layer) => {
                const image = this.stateManager.resources.get(layer.image);
                thumbnail.drawImage(image.canvas, 0, 0);
            });

            // bleach all color to white and transparent
            thumbnail.globalCompositeOperation = "source-in";
            fillRendering2D(thumbnail, "#ffffff");
            thumbnail.globalCompositeOperation = "source-over";
        });
    }

    refreshLayerOptionThumbnails() {
        const { layer } = this.getSelections();

        this.optionThumbs.forEach((thumbnail, index) => {
            fillRendering2D(thumbnail);
            const image = this.stateManager.resources.get(layer.options[index].image);
            thumbnail.drawImage(image.canvas, 0, 0);

            // bleach all color to white and transparent
            thumbnail.globalCompositeOperation = "source-in";
            fillRendering2D(thumbnail, "#ffffff");
            thumbnail.globalCompositeOperation = "source-over";
        });
    }

    floodFill(x, y) {
        this.stateManager.makeChange(async (data) => {
            // fork the current options's image
            const { option, color } = this.getSelections(data);
            const instance = await this.forkLayerOptionImage(option);
            const uint32 = this.colorSelect.selectedIndex > 0 ? hexToUint32(color) : 0;
            floodfill(instance, x, y, uint32);
        });
    }

    pickColor(x, y) {
        // get the single pixel from the relevant image
        const { palette, instance } = this.getSelections();
        const [r, g, b, a] = instance.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex({ r, g, b});
        
        // if it's transparent, it's color 0, otherwise search palette
        const paletteIndex = a === 0 
                           ? 0
                           : palette.findIndex((color) => color === hex);
        this.colorSelect.selectedIndex = paletteIndex; 
    }

    swapLayers(prevIndex, nextIndex) {
        this.stateManager.makeChange(async (data) => {
            // swap layers and selecteds
            [data.layers[nextIndex], data.layers[prevIndex]] = [data.layers[prevIndex], data.layers[nextIndex]];
            [data.selected[nextIndex], data.selected[prevIndex]] = [data.selected[prevIndex], data.selected[nextIndex]];
            
            // if one of the layers was currently selected, move with it
            if (this.layerSelect.selectedIndex === prevIndex) {
                this.layerSelect.selectedIndex = nextIndex;
            } else if (this.layerSelect.selectedIndex === nextIndex) {
                this.layerSelect.selectedIndex = prevIndex;
            }
            
            // update thumbnails and rendering
            this.refreshLayerDisplay();
        });
    }

    shiftLayerUp() {
        if (this.layerSelect.selectedIndex < 1) return;
        this.swapLayers(
            this.layerSelect.selectedIndex, 
            this.layerSelect.selectedIndex-1,
        );
    }

    shiftLayerDown() {
        if (this.layerSelect.selectedIndex > 6) return;
        this.swapLayers(
            this.layerSelect.selectedIndex, 
            this.layerSelect.selectedIndex+1,
        );
    }

    copyLayerOption() {
        // make a copy of option data and enable pasting
        const { option } = this.getSelections();
        this.copiedLayerOption = COPY(option);
        this.actions.paste.disabled = false;
    }

    pasteLayerOption() {
        this.stateManager.makeChange(async (data) => {
            // replace selected layer option with a copy of the copied option
            const { layer } = this.getSelections(data);
            layer.options[this.optionSelect.selectedIndex] = COPY(this.copiedLayerOption);
        });
    }

    clearLayerOption() {
        this.stateManager.makeChange(async (data) => {
            const { option } = this.getSelections(data);
            const instance = await this.forkLayerOptionImage(option);
            fillRendering2D(instance);
        });
    }

    /**
     * @param {FlickguyDataProject} data 
     * @param {number} layerIndex 
     * @param {number} optionIndex 
     * @param {number} paletteIndex
     */
    async setOptionPalette(data, layerIndex, optionIndex, paletteIndex) {
        const option = data.layers[layerIndex].options[optionIndex];

        const prev = option.palette !== undefined
                   ? data.palettes[option.palette]
                   : data.fixedPalette;
        option.palette = paletteIndex;
        const next = option.palette !== undefined
                   ? data.palettes[option.palette]
                   : data.fixedPalette;

        // only swap if necessary
        if (prev !== next) {
            const instance = await this.forkLayerOptionImage(option);
            swapPaletteSafe(instance, prev, next);
        }
    }

    async randomise({ palettes = true, options = true } = {}) {
        await this.stateManager.makeChange(async (data) => {
            // get existing selections
            let optionIndexes = data.selected;
            let paletteIndexes = optionIndexes.map((option, layer) => data.layers[layer].options[option].palette);

            // randomise selections
            if (palettes) paletteIndexes = ZEROES(8).map(() => getRandomInt(0, 8));
            if (options) optionIndexes = ZEROES(8).map(() => getRandomInt(0, 8)); 

            // apply new selections and palettes for each layer
            await Promise.all(data.layers.map(async (layer, index) => {
                data.selected[index] = optionIndexes[index];
                const option = layer.options[optionIndexes[index]];

                if (option.palette !== undefined) {
                    await this.setOptionPalette(
                        data, 
                        index, 
                        optionIndexes[index], 
                        paletteIndexes[index],
                    );
                }
            }));
        });
    }

    /** @returns {string[]} */
    getManifest() {
        // the editor adds a dependency to the image in the copied scene, if any
        // --we don't want this resource to be cleaned up accidentally because
        // we might still want to paste it even after it stops being used in
        // other scenes
        return this.copiedLayerOption ? [this.copiedLayerOption.image] : [];
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
        const name = "flickguy.html";
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
        await this.loadBundle(flickguy.makeBlankBundle());
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

    exportImage() {
        // scale up the image for sharing
        const scaled = createRendering2D(
            this.rendering.canvas.width * flickguy.exportScale,
            this.rendering.canvas.height * flickguy.exportScale,
        );
        scaled.imageSmoothingEnabled = false;
        scaled.drawImage(
            this.rendering.canvas, 
            0, 0, scaled.canvas.width, scaled.canvas.height,
        );

        // convert image to blob and ask browser to download it
        scaled.canvas.toBlob((blob) => maker.saveAs(blob, "your-guy.png"));        
    }

    async exportPalettes() {
        const rendering = createRendering2D(8, 10);

        withPixels(rendering, (pixels) => {
            this.stateManager.present.palettes.forEach((palette, y) => {
                palette.forEach((hex, x) => {
                    pixels[y * 8 + x] = hexToUint32(hex);
                });
            });

            this.stateManager.present.fixedPalette.forEach((hex, i) => {
                pixels[8 * 8 + i] = hexToUint32(hex);
            })
        });

        rendering.canvas.toBlob((blob) => maker.saveAs(blob, "flickguy-palettes.png"));
    }

    async importPalettes() {
        // ask user to provide palette image
        const [file] = await maker.pickFiles("image/*");
        const dataUri = await maker.dataURIFromFile(file);
        const image = await loadImage(dataUri);
        const rendering = imageToRendering2D(image);

        const prevPalettes = this.stateManager.present.palettes;
        const nextPalettes = ZEROES(8).map(() => REPEAT(8, "#000000"));
        
        const prevFixedPalette = this.stateManager.present.fixedPalette;
        const nextFixedPalette = REPEAT(16, "#000000");

        // read palettes from image (8 rows of 8 colors, ignore first column)
        withPixels(rendering, (pixels) => {
            for (let p = 0; p < 8; ++p) {
                for (let i = 1; i < 8; ++i) {
                    nextPalettes[p][i] = rgbToHex(uint32ToRGB(pixels[p * 8 + i]));
                }
            }

            for (let i = 0; i < 16; ++i) {
                nextFixedPalette[i] = rgbToHex(uint32ToRGB(pixels[8 * 8 + i]));
            }
        });

        // palette swap all images to the corresponding palette from the new set
        await this.stateManager.makeChange(async (data) => {
            data.palettes = nextPalettes;
            data.fixedPalette = nextFixedPalette;
            const promises = data.layers.flatMap((layer) => {
                return layer.options.map(async (option) => {
                    const instance = await this.forkLayerOptionImage(option);

                    if (option.palette !== undefined) {
                        swapPaletteSafe(
                            instance, 
                            prevPalettes[option.palette], 
                            nextPalettes[option.palette],
                        );
                    } else {
                        swapPaletteSafe(
                            instance,
                            prevFixedPalette,
                            nextFixedPalette,
                        );
                    }
                });
            });

            return Promise.all(promises);
        });
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
        // normal browser cursor in player mode
        this.rendering.canvas.style.setProperty("cursor", "unset");

        this.render();
    }

    enterEditorMode() {
        this.editorMode = true;
        // used to show/hide elements in css
        document.documentElement.setAttribute("data-app-mode", "editor");
        // default to crosshair paint cursor in editor mode
        this.rendering.canvas.style.setProperty("cursor", "crosshair");

        this.render();

        // check if storage is available for saving
        this.actions.save.disabled = !flickguy.storage.available;
    }

    toggleHelp() {
        this.helpContainer.hidden = !this.helpContainer.hidden;
    }
}

flickguy.start = async function () {
    const editor = new flickguy.Editor();
    await editor.init();

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
        const save = await flickguy.storage.load("slot0").catch(() => undefined);
        const bundle = save || maker.bundleFromHTML(document, "#editor-embed");
        
        // load bundle and enter editor mode
        await editor.loadBundle(bundle);
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

    flickguy.editor = editor;
}
