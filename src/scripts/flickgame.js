// add a resource type called "canvas-datauri" that describes how to load a
// canvas rendering context from a datauri, how to copy one, and how to convert
// one back into a datauri
maker.resourceHandlers.set("canvas-datauri", {
    load: async (data) => imageToRendering2D(await loadImage(data)),
    copy: async (instance) => copyRendering2D(instance),
    save: async (instance) => instance.canvas.toDataURL(),
});

/**
 * @typedef {Object} FlickgameDataScene
 * @property {string} image
 * @property {{[index: string]: string}} jumps
 */

/**
 * @typedef {Object} FlickgameDataProject
 * @property {FlickgameDataScene[]} scenes
 */

/** 
 * @param {FlickgameDataProject} data 
 * @returns {string[]}
 */
function getFlickgameManifest(data) {
    // scene images are the only resource dependencies in a flickgame
    return data.scenes.map((scene) => scene.image);
}

/** @returns {maker.ProjectBundle<FlickgameDataProject>} */
function makeBlankBundle() {
    const blank = createRendering2D(160, 100);
    blank.fillStyle = "#140c1c";
    blank.fillRect(0, 0, 160, 100);
    const scenes = ZEROES(16).map(() => ({ image: "0", jumps: {} }));
    const project = { scenes };
    const resources = {
        "0": { type: "canvas-datauri", data: blank.canvas.toDataURL() },
    };

    return { project, resources };
}

/**
 * @param {FlickgameDataProject} data 
 * @param {number} srcIndex 
 * @param {number} colorIndex 
 * @param {number} dstIndex 
 */
function setSceneJump(data, srcIndex, colorIndex, dstIndex) {
    data.scenes[srcIndex].jumps[colorIndex.toString()] = dstIndex.toString();
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
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

// datauri for a default title scene image
const defaultScene = "data:image/png;base64,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";

// default palette copied from flickgame
const palette = [
    "#140c1c", "#442434", "#30346d", "#4e4a4e",
    "#854c30", "#346524", "#d04648", "#757161",
    "#597dce", "#d27d2c", "#8595a1", "#6daa2c",
    "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
];

// brush names and datauris
const brushes = [
    { name: "1px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABlJREFUOI1jYBgFwx38/////0C7YRQMDQAApd4D/cefQokAAAAASUVORK5CYII=" },
    { name: "2px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABpJREFUOI1jYBgFwx38hwJ8apjo5ZhRMKgBADvbB/vPRl6wAAAAAElFTkSuQmCC" },
    { name: "3px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACNJREFUOI1jYBgFgxz8////PyE1jMRoZmRkxKmOYheMgmEBAARbC/qDr1pMAAAAAElFTkSuQmCC" },
    { name: "4px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAChJREFUOI1jYBgFgxz8hwJ8ahjxaUZRyMiIVS0TeW4jEhDjhVEwGAAAJhAT9IYiYRoAAAAASUVORK5CYII=" },
];

// brush pattern names and datauris
const patterns = [
    { name: "solid", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAANQTFRF////p8QbyAAAAA1JREFUGJVjYBgFyAAAARAAATPJ8WoAAAAASUVORK5CYII=" },
    { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAAZQTFRF////AAAAVcLTfgAAAAJ0Uk5T/wDltzBKAAAAEElEQVQYlWNgYCQAGUaUCgBFEACBOeFM/QAAAABJRU5ErkJggg==" },
    { name: "grate", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACpJREFUOI1j+P///38GJEAqH0WQXJosm7FqJoseDYPRMBgNA4b/////BwD1yX6QPhXhyAAAAABJRU5ErkJggg==" },
    { name: "light", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACJJREFUOI1j+P///38GJEAqn3pg4FwyGgajYTCwNg8alwAAPvx/gQ2QnLUAAAAASUVORK5CYII=" },
    { name: "circles", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAIVJREFUOI2lkksSgDAIQ0nH+185bqRGClTHbFqY8vgVdokkTQQA7vd7FEkiC84g6nMbalTKsivg6IKrIIWOL8F69/MVoNOoJmx2969v4vtpZGvUvrMEJIndniNsqW6Sws4V2v2TxxC7aVcV/t5C+8t2FUxAN+0dYGmBogo6swPYDikDq/8ElN2X5dPxSkwAAAAASUVORK5CYII=" },
    { name: "worms", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHlJREFUOI2tUlsOwCAIaxfvf+XuR5yZvJaMHwlgWx7ANEny3swHgGFBkkRhe90C6jBl6g6Gr6DH54rJBelIj+KX28s0krTBmR8Wp/0FrUnSP1voFJcKu+s6cuVx4NmCBzyiD+bbBiLwluSd/a0kBOrk1wyyAUbnbPEbw9o6+o7mZV0AAAAASUVORK5CYII=" },
    { name: "slants", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADVJREFUOI1j+P///38GJEAqnwGfJDF8JpymkQrI9Qp1XEBJQFLuAkqjkXqxQK5rRtPBYEgHABdWj38s+V8BAAAAAElFTkSuQmCC" },
    { name: "tiles", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFNJREFUOI3Nk8EKACAIQ/f/P71OQVCzLQryJAz3VBQAQJIoYtR7vqwpRWEoCY4hSX7Q/k60jE+pcgeK6o65pyauT3cQ06SeXOKUX2vfHcMqSB6qAfbO4x1nFCH3AAAAAElFTkSuQmCC" },
];

class FlickgamePlayer extends EventTarget {
    constructor() {
        super();
        // home for data of the project we're playing
        this.stateManager = new maker.StateManager();
        // final composite of any graphics
        this.rendering = createRendering2D(160, 100);
        // start the player in scene 0
        this.activeSceneIndex = 0;
    }

    async copyFrom(stateManager) {
        await this.stateManager.copyFrom(stateManager);
        this.reset();
    }

    async loadBundle(bundle) {
        await this.stateManager.loadBundle(bundle);
        this.reset();
    }

    reset() {
        // return to scene 0
        this.jump(0);
    }

    render() {
        // find the canvas resource of the current scene's image
        const scene = this.stateManager.present.scenes[this.activeSceneIndex];
        const image = this.stateManager.resources.get(scene.image);
        
        // clear the rendering and draw the current scene
        this.rendering.clearRect(0, 0, 160, 100);
        this.rendering.drawImage(image.canvas, 0, 0);

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    getJumpAt(x, y) {
        // find the canvas resource of the current scene's image
        const scene = this.stateManager.present.scenes[this.activeSceneIndex];
        const image = this.stateManager.resources.get(scene.image);

        // get the pixel data at the given coordinates
        const [r, g, b] = image.getImageData(x, y, 1, 1).data;
        // convert to hexadecimal to compare with the flickgame palette
        const hex = rgbToHex({ r, g, b});
        const index = palette.findIndex((color) => color === hex);

        // consult the current scene's jump table for the corresponding color
        return scene.jumps[index];
    }

    click(x, y) {
        // check if the clicked position has a jump, if it does then jump
        const jump = this.getJumpAt(x, y);
        if (jump) this.jump(jump);
    }

    jump(sceneIndex) {
        // update the active scene and re-render
        this.activeSceneIndex = sceneIndex;
        this.render();
    }

    enter() {
        // we might not have rendered yet
        this.render();
    }
}

class FlickgameEditor extends EventTarget {
    constructor() {
        super();

        // to determine which resources are still in use for the project we
        // combine everything the flickgame needs plus anything this editor
        // needs
        const getManifest = (data) => [...getFlickgameManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<FlickgameDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");
        this.rendering.canvas.style.setProperty("cursor", "crosshair");
        this.preview = createRendering2D(160, 100); 
        this.thumbnails = ZEROES(16).map(() => createRendering2D(160, 100));

        // find all the ui already defined in the html
        this.sceneSelect = ui.radio("scene-select");
        this.toolSelect = ui.radio("tool-select");
        this.brushSelect = ui.radio("brush-select");
        this.patternSelect = ui.radio("pattern-select");
        this.colorSelect = ui.radio("color-select");
        this.jumpSelect = ui.select("jump-select");
        this.jumpColorIndicator = ONE("#jump-source-color");
        this.helpContainer = ONE("#help");   

        // initial selections
        this.sceneSelect.selectedIndex = 0;
        this.toolSelect.selectedIndex = 0;
        this.brushSelect.selectedIndex = getRandomInt(0, 4);
        this.patternSelect.selectedIndex = getRandomInt(0, 8);
        this.colorSelect.selectedIndex = getRandomInt(7, 16);

        // add thumbnails to the scene select bar
        ALL("#scene-select input").forEach((input, index) => {
            input.after(this.thumbnails[index].canvas);
        });
    
        // recolor the color select buttons to the corresponding color
        ALL("#color-select label").forEach((label, index) => {
            label.style.backgroundColor = palette[index];
        });
    
        // add brush icons and tooltips to brush select buttons
        ALL("#brush-select label").forEach((label, index) => {
            ONE("input", label).title = brushes[index].name + " brush";
            ONE("img", label).src = brushes[index].image;
        });

        // add pattern icons and tooltips to brush select buttons
        ALL("#pattern-select label").forEach((label, index) => {
            ONE("input", label).title = patterns[index].name + " pattern";
            ONE("img", label).src = patterns[index].image;
        });

        // state of the paint tools:
        // is the color pick key held down?
        this.heldColorPick = false;
        // current brush and pattern recolored with current color
        this.activeBrush = undefined;
        this.activePattern = undefined;
        // saved start coordinates during a line draw
        this.lineStart = undefined;
        // scene currently in the clipboard
        this.copiedScene = undefined;

        // editor actions controlled by html buttons
        this.actions = {
            undo: ui.action("undo", () => this.stateManager.undo()),
            redo: ui.action("redo", () => this.stateManager.redo()),
            copy: ui.action("copy", () => this.copyScene()),
            paste: ui.action("paste", () => this.pasteScene()),
            clear: ui.action("clear", () => this.clearScene()),

            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),
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

            for (let i = 0; i < 8; ++i) {
                if (event.code === `Digit${i+1}`) {
                    this.sceneSelect.selectedIndex = event.shiftKey ? i+8 : i;
                }
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

        // changes in scene select bar
        this.sceneSelect.addEventListener("change", () => {
            this.render();
            this.refreshJumpSelect();
        });

        // changes in the jump select dropdown
        this.jumpSelect.addEventListener("change", () => {
            if (!this.selectedScene) return;
    
            this.stateManager.makeChange(async (data) => {
                setSceneJump(
                    data, 
                    this.sceneSelect.selectedIndex, 
                    this.colorSelect.selectedIndex, 
                    this.jumpSelect.selectedIndex,
                );
            });
        });

        // changes in the brush and pattern select bars
        this.brushSelect.addEventListener("change", () => this.refreshActiveBrush());
        this.patternSelect.addEventListener("change", () => this.refreshActiveBrush());

        // changes in the color select
        this.colorSelect.addEventListener("change", () => {
            this.refreshActiveBrush();
            this.refreshJumpSelect();
        });
    
        // whenever the project data is changed
        this.stateManager.addEventListener("change", () => {
            // redraw all the scene select thumbnails
            this.stateManager.present.scenes.forEach((scene, index) => {
                const image = this.stateManager.resources.get(scene.image).canvas;
                this.thumbnails[index].drawImage(image, 0, 0);
            });
    
            // redraw the current scene view
            this.render();
    
            // enable/disable undo/redo buttons
            this.actions.undo.disabled = !this.stateManager.canUndo;
            this.actions.redo.disabled = !this.stateManager.canRedo;
    
            // update jump select ui
            this.refreshJumpSelect();
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

            // treat this as the beginning of a possible drag
            const drag = ui.drag(event);
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);

            // prepare the pattern mask and plot function
            const mask = createRendering2D(160, 100);
            const plotMask = (x, y) => mask.drawImage(this.activeBrush.canvas, (x - 7) | 0, (y - 7) | 0);
            const pattern = mask.createPattern(this.activePattern.canvas, 'repeat');
            const drawPatternedMask = (instance) => {
                mask.globalCompositeOperation = "source-in";
                fillRendering2D(mask, pattern);
                mask.globalCompositeOperation = "source-over";
                instance.drawImage(mask.canvas, 0, 0);
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
                // fork the current scene's image for editing and make an 
                // undo/redo checkpoint
                const scene = this.stateManager.present.scenes[this.sceneSelect.selectedIndex];
                this.stateManager.makeCheckpoint();
                const instance = await this.forkSceneImage(scene);

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
                    // fork the current scene's image for editing and make an 
                    // undo/redo checkpoint
                    const scene = this.stateManager.present.scenes[this.sceneSelect.selectedIndex];
                    this.stateManager.makeCheckpoint();
                    const instance = await this.forkSceneImage(scene);
                    
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
        // load the default scene graphic
        this.defaultSceneGraphic = await loadImage(defaultScene);

        // load all the brush and pattern images
        this.brushRenders = await Promise.all(brushes.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        this.patternRenders = await Promise.all(patterns.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        
        // make brush and pattern valid
        this.refreshActiveBrush();
    }

    get selectedScene() {
        return this.stateManager.present.scenes[this.sceneSelect.selectedIndex];
    }

    async forkSceneImage(scene) {
        // create a new copy of the image resource
        const { id, instance } = await this.stateManager.resources.fork(scene.image);
        // replace the scene's image with the new copy
        scene.image = id;
        // return the instance of the image for editing
        return instance;
    }

    render() {
        if (!this.selectedScene) return;
        // get the current scene's image
        const image = this.stateManager.resources.get(this.selectedScene.image);

        // draw paint preview over current scene image
        fillRendering2D(this.rendering);
        this.rendering.drawImage(image.canvas, 0, 0);
        this.rendering.drawImage(this.preview.canvas, 0, 0);

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
            this.preview.globalCompositeOperation = "source-in";
            fillRendering2D(this.preview, this.preview.createPattern(this.activePattern.canvas, 'repeat'));
            this.preview.globalCompositeOperation = "source-over";
        } else if (this.toolSelect.value === "freehand" || this.toolSelect.value === "line") {
            // draw the patterned brush at the current pointer location
            plot(x, y);
            this.preview.globalCompositeOperation = "source-in";
            fillRendering2D(this.preview, this.preview.createPattern(this.activePattern.canvas, 'repeat'));
            this.preview.globalCompositeOperation = "source-over";
        } 

        this.render();
    }

    refreshActiveBrush() {
        const pattern = this.patternRenders[this.patternSelect.selectedIndex];
        const brush = this.brushRenders[this.brushSelect.selectedIndex];
        const color = palette[this.colorSelect.selectedIndex];
        if (!pattern || !brush || !color) return;
        this.activeBrush = recolorMask(brush, color);
        this.activePattern = recolorMask(pattern, color);
    }

    refreshJumpSelect() {
        const jump = this.selectedScene.jumps[this.colorSelect.value];
        this.jumpSelect.value = jump ? jump : "none";
        this.jumpColorIndicator.style.backgroundColor = palette[this.colorSelect.selectedIndex];
    }

    floodFill(x, y) {
        this.stateManager.makeChange(async (data) => {
            // fork scene's image
            const scene = data.scenes[this.sceneSelect.selectedIndex];
            const instance = await this.forkSceneImage(scene);

            // find newly filled pixels
            const mask = floodfillOutput(instance, x, y, 0xFFFFFFFF);
            // pattern the filled pixels
            mask.globalCompositeOperation = "source-in";
            fillRendering2D(mask, mask.createPattern(this.activePattern.canvas, 'repeat'));
            // draw the final patterned fill
            instance.drawImage(mask.canvas, 0, 0);
        });
    }

    pickColor(x, y) {
        const [r, g, b] = this.rendering.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex({ r, g, b});
        this.colorSelect.selectedIndex = palette.findIndex((color) => color === hex);
    }

    copyScene() {
        // make a copy of scene data and enable pasting
        this.copiedScene = COPY(this.selectedScene);
        this.actions.paste.disabled = false;
    }

    pasteScene() {
        this.stateManager.makeChange(async (data) => {
            // replace selected scene with a copy of the copied scene--this is
            // so it remains independent from the scene kept in the clipboard
            const scene = COPY(this.copiedScene);
            data.scenes[this.sceneSelect.selectedIndex] = scene;
        });
    }

    clearScene() {
        this.stateManager.makeChange(async (data) => {
            const scene = data.scenes[this.sceneSelect.selectedIndex];
            const instance = await this.forkSceneImage(scene);
            instance.fillStyle = palette[this.colorSelect.selectedIndex];
            instance.fillRect(0, 0, 160, 100);
        });
    }

    /** @returns {string[]} */
    getManifest() {
        // the editor adds a dependency to the image in the copied scene, if any
        // --we don't want this resource to be cleaned up accidentally because
        // we might still want to paste it even after it stops being used in
        // other scenes
        return this.copiedScene ? [this.copiedScene.image] : [];
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
        const name = "flickgame.html";
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
        await this.stateManager.loadBundle(makeBlankBundle());
        // draw a default graphic in the first scene
        await this.stateManager.makeChange(async (data) => {
            const instance = await this.forkSceneImage(data.scenes[0]);
            instance.drawImage(this.defaultSceneGraphic, 0, 0);
        });
    }

    toggleHelp() {
        this.helpContainer.hidden = !this.helpContainer.hidden;
    }

    enter() {
        this.render();
    }
}

async function makeEditor() {
    const editor = new FlickgameEditor();
    await editor.init();
    return editor;
}

async function makePlayer() {
    const player = new FlickgamePlayer();

    const playCanvas = /** @type {HTMLCanvasElement} */ (ONE("#player canvas"));
    const playRendering = /** @type {CanvasRenderingContext2D} */ (playCanvas.getContext("2d"));
    
    // update mouse cursor to reflect whether a clickable pixel is hovered or not
    playCanvas.addEventListener("mousemove", (event) => {
        const { x, y } = mouseEventToCanvasPixelCoords(playCanvas, event);
        const clickable = player.getJumpAt(x, y) !== undefined;
        playCanvas.style.setProperty("cursor", clickable ? "pointer" : "unset");
    });

    // forward canvas clicks to the player
    playCanvas.addEventListener("click", (event) => {
        const { x, y } = mouseEventToCanvasPixelCoords(playCanvas, event);
        player.click(x, y);
    });

    // update the canvas size every render just in case..
    player.addEventListener("render", () => {
        playRendering.drawImage(player.rendering.canvas, 0, 0);
        fitCanvasToParent(playCanvas)
    });

    // update the canvas size whenever the browser window resizes
    window.addEventListener("resize", () => fitCanvasToParent(playCanvas));
    
    // update the canvas size initially
    fitCanvasToParent(playCanvas);

    return player;
}
