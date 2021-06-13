const crewmaker = {};

// add a resource type called "canvas-datauri" that describes how to load a
// canvas rendering context from a datauri, how to copy one, and how to convert
// one back into a datauri
maker.resourceHandlers.set("canvas-datauri", {
    load: async (data) => imageToRendering2D(await loadImage(data)),
    copy: async (instance) => copyRendering2D(instance),
    save: async (instance) => instance.canvas.toDataURL(),
});

/**
 * @typedef {Object} CrewmakerDataLayerOption
 * @property {string} image
 * @property {number} palette
 */

/**
 * @typedef {Object} CrewmakerDataLayer
 * @property {CrewmakerDataLayerOption[]} options
 */

/**
 * @typedef {Object} CrewmakerDataProject
 * @property {CrewmakerDataLayer[]} layers
 */

/** 
 * @param {CrewmakerDataProject} data 
 * @returns {string[]}
 */
crewmaker.getManifest = function (data) {
    // layer option images are the only resource dependencies in a crewmaker
    return data.layers.flatMap((layer) => layer.options.map((option) => option.image));
}

crewmaker.layerWidth = 128;
crewmaker.layerHeight = 128;

/** @returns {maker.ProjectBundle<CrewmakerDataProject>} */
crewmaker.makeBlankBundle = function () {
    const blank = createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight);
    fillRendering2D(blank);
    const layers = ZEROES(8).map(() => ({  
        options: ZEROES(8).map(() => ({ image: "0", palette: 0 })),
    }));
    const project = { layers };
    const resources = {
        "0": { type: "canvas-datauri", data: blank.canvas.toDataURL() },
    };

    return { project, resources };
}

// default palettes (8 palettes of 8 colors)
crewmaker.palettes = [
    [
        "#000000", "#442434", "#30346d", "#4e4a4e",
        "#854c30", "#346524", "#d04648", "#757161",
    ],
    [

        "#000000", "#d27d2c", "#8595a1", "#6daa2c",
        "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
    ],
    [
        "#000000", "#442434", "#30346d", "#4e4a4e",
        "#854c30", "#346524", "#d04648", "#757161",
    ],
    [

        "#000000", "#d27d2c", "#8595a1", "#6daa2c",
        "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
    ],
    [
        "#000000", "#442434", "#30346d", "#4e4a4e",
        "#854c30", "#346524", "#d04648", "#757161",
    ],
    [

        "#000000", "#d27d2c", "#8595a1", "#6daa2c",
        "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
    ],
    [
        "#000000", "#442434", "#30346d", "#4e4a4e",
        "#854c30", "#346524", "#d04648", "#757161",
    ],
    [

        "#000000", "#d27d2c", "#8595a1", "#6daa2c",
        "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
    ],
];

/**
 * @param {CanvasRenderingContext2D} rendering 
 * @param {string[]} prev 
 * @param {string[]} next 
 */
function swapPalette(rendering, prev, next) {
    const mapping = new Map();
    prev.forEach((hex, index) => mapping.set(hexToUint32(prev[index]), hexToUint32(next[index])));

    withPixels(rendering, (pixels) => {
        for (let i = 0; i < pixels.length; ++i) {
            pixels[i] = mapping.get(pixels[i]);
        }
    });
}

// brush names and datauris
crewmaker.brushes = [
    { name: "1px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABlJREFUOI1jYBgFwx38/////0C7YRQMDQAApd4D/cefQokAAAAASUVORK5CYII=" },
    { name: "2px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABpJREFUOI1jYBgFwx38hwJ8apjo5ZhRMKgBADvbB/vPRl6wAAAAAElFTkSuQmCC" },
    { name: "3px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACNJREFUOI1jYBgFgxz8////PyE1jMRoZmRkxKmOYheMgmEBAARbC/qDr1pMAAAAAElFTkSuQmCC" },
    { name: "4px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAChJREFUOI1jYBgFgxz8hwJ8ahjxaUZRyMiIVS0TeW4jEhDjhVEwGAAAJhAT9IYiYRoAAAAASUVORK5CYII=" },
];

crewmaker.Editor = class extends EventTarget {
    constructor() {
        super();

        this.editorMode = true;

        // to determine which resources are still in use for the project we
        // combine everything the crewmaker needs plus anything this editor
        // needs
        const getManifest = (data) => [...crewmaker.getManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<CrewmakerDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");

        this.stackActive = createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight);
        this.stackUnder = createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight);
        this.stackOver = createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight);
        
        this.preview = createRendering2D(this.rendering.canvas.width, this.rendering.canvas.height);
        this.layerThumbs = ZEROES(8).map(() => createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight));
        this.optionThumbs = ZEROES(8).map(() => createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight));
        this.paletteThumbs = ZEROES(8).map(() => createRendering2D(1, 1));

        // find all the ui already defined in the html
        this.layerSelect = ui.radio("layer-select");
        this.optionSelect = ui.radio("option-select");
        this.paletteSelect = ui.radio("palette-select");
        this.stackLayers = ui.toggle("stack-layers");

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

        this.selectedOptions = ZEROES(8);

        // add thumbnails to the layer select bar
        ALL("#layer-select input").forEach((input, index) => {
            input.after(this.layerThumbs[index].canvas);
        });

        // add thumbnails to the option select bar
        ALL("#option-select input").forEach((input, index) => {
            input.after(this.optionThumbs[index].canvas);
        });

        // add thumbnails to the palette select bar
        ALL("#palette-select input").forEach((input, index) => {
            input.after(this.paletteThumbs[index].canvas);
        });

        this.refreshColorSelect();
        // generate palette thumbnails
        this.paletteThumbs.forEach((thumbnail, index) => {
            const gap = 0;
            const size = 12;
            const pad = 0;

            resizeRendering2D(thumbnail, 4 * size + 3 * gap + pad * 2, 2 * size + 1 * gap + pad * 2);
            const palette = crewmaker.palettes[index];
            for (let y = 0; y < 2; ++y) {
                for (let x = 0; x < 4; ++x) {
                    thumbnail.fillStyle = palette[y * 4 + x];
                    thumbnail.fillRect(x * (size + gap) + pad, y * (size + gap) + pad, size, size);
                }
            }
        });

        // add brush icons and tooltips to brush select buttons
        ALL("#brush-select label").forEach((label, index) => {
            ONE("input", label).title = crewmaker.brushes[index].name + " brush";
            ONE("img", label).src = crewmaker.brushes[index].image;
        });

        // state of the paint tools:
        // is the color pick key held down?
        this.heldColorPick = false;
        // current brush and pattern recolored with current color
        this.activeBrush = undefined;
        this.activePattern = undefined;
        // saved start coordinates during a line draw
        this.lineStart = undefined;
        // layer option currently in the clipboard
        this.copiedLayerOption = undefined;

        // editor actions controlled by html buttons
        this.actions = {
            undo: ui.action("undo", () => this.stateManager.undo()),
            redo: ui.action("redo", () => this.stateManager.redo()),
            copy: ui.action("copy", () => this.copyLayerOption()),
            paste: ui.action("paste", () => this.pasteLayerOption()),
            clear: ui.action("clear", () => this.clearLayerOption()),

            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),

            exportImage: ui.action("export-image", () => this.exportImage()),
        };

        // can't undo/redo/paste yet
        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.paste.disabled = true;

        // hotkeys
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && event.key === "z") this.actions.undo.invoke();
            if (event.ctrlKey && event.key === "y") this.actions.redo.invoke();
            if (event.ctrlKey && event.key === "c") this.actions.copy.invoke();
            if (event.ctrlKey && event.key === "v") this.actions.paste.invoke();
            if (event.ctrlKey && event.key === "x") {
                this.actions.copy.invoke();
                this.actions.clear.invoke();
            }

            if (event.code === "KeyQ") this.toolSelect.selectedIndex = 0;
            if (event.code === "KeyW") this.toolSelect.selectedIndex = 1;
            if (event.code === "KeyE") this.toolSelect.selectedIndex = 2;
            if (event.code === "KeyR") this.toolSelect.selectedIndex = 3;

            if (event.code === "KeyA") this.brushSelect.selectedIndex = 0;
            if (event.code === "KeyS") this.brushSelect.selectedIndex = 1;
            if (event.code === "KeyD") this.brushSelect.selectedIndex = 2;
            if (event.code === "KeyF") this.brushSelect.selectedIndex = 3;

            this.heldColorPick = event.altKey;
        });

        document.addEventListener("keyup", (event) => {
            this.heldColorPick = event.altKey;
        });

        // changes in layer select bar
        this.layerSelect.addEventListener("change", () => {
            // switch option to remembered option for this layer
            this.optionSelect.selectedIndex = this.selectedOptions[this.layerSelect.selectedIndex];
            this.render();
            this.refreshLayerOptionThumbnails();
        });

        this.optionSelect.addEventListener("change", () => {
            // remember selected option for this layer
            this.selectedOptions[this.layerSelect.selectedIndex] = this.optionSelect.selectedIndex;
            
            // switch to the natural palette of this option
            const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
            const option = layer.options[this.optionSelect.selectedIndex];
            this.paletteSelect.selectedIndex = option.palette;
            
            this.render();
        });

        // changes in palette select bar
        this.paletteSelect.addEventListener("change", async () => {
            const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
            const option = layer.options[this.optionSelect.selectedIndex];
            
            const prev = crewmaker.palettes[option.palette];
            const next = crewmaker.palettes[this.paletteSelect.selectedIndex];
            
            this.stateManager.makeCheckpoint();
            const instance = await this.forkLayerOptionImage(option);
            swapPalette(instance, prev, next);
            option.palette = this.paletteSelect.selectedIndex;
            this.stateManager.changed();

            this.refreshColorSelect();
        });

        // changes in stack layers toggle
        this.stackLayers.addEventListener("change", () => {
            this.render();
        });

        // changes in the brush and pattern select bars
        this.brushSelect.addEventListener("change", () => this.refreshActiveBrush());

        // changes in the color select
        this.colorSelect.addEventListener("change", () => {
            this.refreshActiveBrush();
        });
    
        // whenever the project data is changed
        this.stateManager.addEventListener("change", () => {
            // option graphics may have changed, so redraw thumbnails
            this.refreshLayerThumbnails();
            this.refreshLayerOptionThumbnails();

            // redraw the current scene view
            this.render();
    
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
        
        // finger or mouse presses on the drawing area--could begin a drag or
        // end quickly in a click
        this.rendering.canvas.addEventListener("pointerdown", async (event) => {
            // for mouse ignore non-left-clicks
            if (event.button !== 0) return;
            // ignore in player mode
            if (!this.editorMode) return;

            // treat this as the beginning of a possible drag
            const drag = ui.drag(event);
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);

            // prepare the plot function
            const mask = createRendering2D(crewmaker.layerWidth, crewmaker.layerHeight);
            const plotMask = (x, y) => mask.drawImage(this.activeBrush.canvas, (x - 7) | 0, (y - 7) | 0);
            //const pattern = mask.createPattern(this.activePattern.canvas, 'repeat');
            const drawPatternedMask = (instance) => {
                //mask.globalCompositeOperation = "source-in";
                //fillRendering2D(mask, pattern);
                //mask.globalCompositeOperation = "source-over";

                const erase = this.colorSelect.selectedIndex === 0;
                instance.globalCompositeOperation = erase ? "destination-out" : "source-over";
                instance.drawImage(mask.canvas, 0, 0);
                instance.globalCompositeOperation = "source-over";
                this.stateManager.changed();
            };

            // color picker selected or color pick hotkey held
            if (this.toolSelect.value === "pick" || this.heldColorPick) {
                drag.addEventListener("click", () => this.pickColor(x, y));
            // flood fill selected
            } else if (this.toolSelect.value === "fill") {
                drag.addEventListener("click", () => this.floodFill(x, y));
            // freehand drawing selected
            } else if (this.toolSelect.value === "freehand") {
                // fork the current options's image for editing and make an 
                // undo/redo checkpoint
                const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
                const option = layer.options[this.optionSelect.selectedIndex];
                this.stateManager.makeCheckpoint();
                const instance = await this.forkLayerOptionImage(option);

                // draw the brush at the position the drag begins
                plotMask(x, y);
                drawPatternedMask(instance);

                let prev = { x, y };

                // draw the brush at the last position of the drag
                drag.addEventListener("up", (event) => {
                    const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                    plotMask(x, y);
                    drawPatternedMask(instance);
                });

                // as the pointer moves, draw brush lines between the points
                drag.addEventListener("move", (event) => {
                    const { x: x0, y: y0 } = prev;
                    const { x: x1, y: y1 } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                    lineplot(x0, y0, x1, y1, plotMask);
                    drawPatternedMask(instance);
                    prev = { x: x1, y: y1 };
                });
            // line drawing selected
            } else if (this.toolSelect.value === "line") {
                // need to save this to draw the line preview
                this.lineStart = { x, y };
                this.refreshPreview(x, y);

                // only actually draw the line at the end
                drag.addEventListener("up", async (event) => {
                    // fork the current options's image for editing and make an 
                    // undo/redo checkpoint
                    const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
                    const option = layer.options[this.optionSelect.selectedIndex];
                    this.stateManager.makeCheckpoint();
                    const instance = await this.forkLayerOptionImage(option);
                    
                    // line from pointer down position to pointer up position
                    const { x: x0, y: y0 } = this.lineStart;
                    const { x: x1, y: y1 } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);

                    lineplot(x0, y0, x1, y1, plotMask);
                    drawPatternedMask(instance);

                    // stop tracking line drawing
                    this.lineStart = undefined;
                });
            } 
        });
    }

    async init() {
        // load all the brush images
        this.brushRenders = await Promise.all(crewmaker.brushes.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        
        // make brush and pattern valid
        this.refreshActiveBrush();
    }

    async forkLayerOptionImage(option) {
        // create a new copy of the image resource
        const { id, instance } = await this.stateManager.resources.fork(option.image);
        // replace the option's image with the new copy
        option.image = id;
        // return the instance of the image for editing
        return instance;
    }

    render() {
        // clear everything
        fillRendering2D(this.stackActive);
        fillRendering2D(this.stackUnder);
        fillRendering2D(this.stackOver);
        fillRendering2D(this.rendering);

        // composite layers into below, current, above
        this.stateManager.present.layers.forEach((layer, index) => {
            // get the layer's current option scene's image
            const option = layer.options[this.selectedOptions[index]];
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

    refreshPreview(x, y) {
        if (!this.stateManager.present) return;

        // clear existing preview
        fillRendering2D(this.preview);

        // prepare plot function
        const plot = (x, y) => this.preview.drawImage(this.activeBrush.canvas, (x - 7) | 0, (y - 7) | 0);

        if (this.heldColorPick) {
            // no preview for color picking
        } else if (this.lineStart) {
            // draw a patterned line between the pointer down location and the
            // current pointer location
            const { x: x0, y: y0 } = this.lineStart;
            lineplot(x0, y0, x, y, plot);
            //this.preview.globalCompositeOperation = "source-in";
            //fillRendering2D(this.preview, this.preview.createPattern(this.activePattern.canvas, 'repeat'));
            //this.preview.globalCompositeOperation = "source-over";
        } else if (this.toolSelect.value === "freehand" || this.toolSelect.value === "line") {
            // draw the patterned brush at the current pointer location
            plot(x, y);
            //this.preview.globalCompositeOperation = "source-in";
            //fillRendering2D(this.preview, this.preview.createPattern(this.activePattern.canvas, 'repeat'));
            //this.preview.globalCompositeOperation = "source-over";
        } 

        this.render();
    }

    refreshActiveBrush() {
        //const pattern = this.patternRenders[this.patternSelect.selectedIndex];
        const brush = this.brushRenders[this.brushSelect.selectedIndex];
        const palette = crewmaker.palettes[this.paletteSelect.selectedIndex];
        const color = palette[this.colorSelect.selectedIndex];
        //if (!pattern || !brush || !color) return;
        this.activeBrush = this.colorSelect.selectedIndex > 0 ? recolorMask(brush, color) : brush;
        //this.activePattern = recolorMask(pattern, color);
    }

    refreshColorSelect() {
        const palette = crewmaker.palettes[this.paletteSelect.selectedIndex];

        // recolor the color select buttons to the corresponding color
        ALL("#color-select label").forEach((label, index) => {
            label.style.background = index > 0 ? palette[index] : "var(--trans-gradient)";
        });
    }

    refreshLayerThumbnails() {
        this.layerThumbs.forEach((thumbnail, index) => {
            const layer = this.stateManager.present.layers[index];

            fillRendering2D(thumbnail);

            layer.options.forEach((layer) => {
                const image = this.stateManager.resources.get(layer.image);
                thumbnail.drawImage(image.canvas, 0, 0);
            });

            thumbnail.globalCompositeOperation = "source-in";
            fillRendering2D(thumbnail, "#ffffff");
            thumbnail.globalCompositeOperation = "source-over";
        });
    }

    refreshLayerOptionThumbnails() {
        const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
        this.optionThumbs.forEach((thumbnail, index) => {
            fillRendering2D(thumbnail);
            const image = this.stateManager.resources.get(layer.options[index].image);
            thumbnail.drawImage(image.canvas, 0, 0);
        });
    }

    floodFill(x, y) {
        this.stateManager.makeChange(async (data) => {
            // fork the current options's image
            const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
            const option = layer.options[this.optionSelect.selectedIndex];
            const instance = await this.forkLayerOptionImage(option);

            const palette = crewmaker.palettes[this.paletteSelect.selectedIndex];
            const color = palette[this.colorSelect.selectedIndex];
            const uint32 = this.colorSelect.selectedIndex > 0 ? hexToUint32(color) : 0;
            floodfill(instance, x, y, uint32);

            // find newly filled pixels
            // const mask = floodfillOutput(instance, x, y, 0xFFFFFFFF);
            // pattern the filled pixels
            // mask.globalCompositeOperation = "source-in";
            // fillRendering2D(mask, mask.createPattern(this.activePattern.canvas, 'repeat'));
            // draw the final patterned fill
            // instance.drawImage(mask.canvas, 0, 0);
        });
    }

    pickColor(x, y) {
        const [r, g, b, a] = this.rendering.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex({ r, g, b});
        
        this.colorSelect.selectedIndex = a === 0 
                                       ? 0
                                       : palette.findIndex((color) => color === hex);
    }

    copyLayerOption() {
        // make a copy of option data and enable pasting
        const layer = this.stateManager.present.layers[this.layerSelect.selectedIndex];
        this.copiedLayerOption = COPY(layer.options[this.optionSelect.selectedIndex]);
        this.actions.paste.disabled = false;
    }

    pasteLayerOption() {
        this.stateManager.makeChange(async (data) => {
            // replace selected layer option with a copy of the copied option
            // --this is so it remains independent from the option kept in the
            // clipboard
            const layer = data.layers[this.layerSelect.selectedIndex];
            layer.options[this.optionSelect.selectedIndex] = COPY(this.copiedLayerOption);
        });
    }

    clearLayerOption() {
        this.stateManager.makeChange(async (data) => {
            const layer = data.layers[this.layerSelect.selectedIndex];
            const option = layer.options[this.optionSelect.selectedIndex];
            const instance = await this.forkLayerOptionImage(option);
            fillRendering2D(instance);
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
        // hide the editor in the page copy so it doesn't show before loading
        ONE("#editor", clone).hidden = true;

        // prompt the browser to download the page
        const name = "crewmaker.html";
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
        await this.stateManager.loadBundle(bundle);
    } 

    async resetProject() {
        // open a blank project in the editor
        await this.stateManager.loadBundle(crewmaker.makeBlankBundle());
    }
    
    exportImage() {
        this.rendering.canvas.toBlob((blob) => {
            maker.saveAs(blob, "your-character.png");
        });        
    }

    toggleHelp() {
        this.helpContainer.hidden = !this.helpContainer.hidden;
    }

    enterPlayerMode() {
        this.editorMode = false;
        ALL("[data-hidden-in-editor]").forEach((element) => element.hidden = false);
        ALL("[data-hidden-in-player]").forEach((element) => element.hidden = true);
        this.rendering.canvas.style.setProperty("cursor", "unset");
        this.render();
    }

    enterEditorMode() {
        this.editorMode = true;
        ALL("[data-hidden-in-editor]").forEach((element) => element.hidden = true);
        ALL("[data-hidden-in-player]").forEach((element) => element.hidden = false);
        this.rendering.canvas.style.setProperty("cursor", "crosshair");
        this.render();
    }
}

crewmaker.start = async function () {
    const editor = new crewmaker.Editor();
    await editor.init();

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", () => editor.enterPlayerMode());
    const edit = ui.action("edit", () => editor.enterEditorMode());

    // determine if there is a project bundle embedded in this page
    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        // embedded project, load it in the player
        await editor.stateManager.loadBundle(bundle);
        editor.enterPlayerMode();
    } else {
        // no embedded project, start editor blank
        await editor.resetProject();
        editor.enterEditorMode();
    }
}
