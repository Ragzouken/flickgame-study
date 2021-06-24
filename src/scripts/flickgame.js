const flickgame = {};

// browser saves will be stored under the id "flickgame-study"
flickgame.storage = new maker.ProjectStorage("flickgame-study");

/**
 * @typedef {Object} FlickgameDataScene
 * @property {string} image
 * @property {{[index: string]: string}} jumps
 */

/**
 * @typedef {Object} FlickgameDataProject
 * @property {FlickgameDataScene[]} scenes
 * @property {string[]} palette
 */

/**
 * Return a list of resource ids that a particular flickgame project depends on. 
 * @param {FlickgameDataProject} data 
 * @returns {string[]}
 */
flickgame.getManifest = function (data) {
    // a flickgame project uses a single image resource in each scene
    return data.scenes.map((scene) => scene.image);
}

// keep the image size constant in one place--haven't checked whether you can
// actually change these numbers and not break things
flickgame.sceneWidth = 160;
flickgame.sceneHeight = 100;

/** @returns {maker.ProjectBundle<FlickgameDataProject>} */
function makeBlankBundle() {
    const blank = createRendering2D(flickgame.sceneWidth, flickgame.sceneHeight);
    fillRendering2D(blank, "#140c1c");
    const scenes = ZEROES(16).map(() => ({ image: "0", jumps: {} }));
    const project = { scenes, palette: flickgame.defaultPalette };
    const resources = {
        "0": { type: "canvas-datauri", data: blank.canvas.toDataURL() },
    };

    return { project, resources };
}

/** 
 * Update the given flickgame project data so that it's valid for this current
 * version of flickgame.
 * @param {FlickgameDataProject} project 
 */
flickgame.updateProject = function(project) {
}

/**
 * Replace every color in the given rendering. Each existing color is matched
 * to the closest color in the prev palette and replaced with the corresponding
 * color in the next palette. 
 * @param {CanvasRenderingContext2D} rendering 
 * @param {string[]} prev 
 * @param {string[]} next 
 */
 flickgame.swapPalette = function(rendering, prev, next) {
    const prevUint32 = prev.map((hex) => hexToUint32(hex));
    const nextUint32 = next.map((hex) => hexToUint32(hex));

    swapPaletteSafe(rendering, prevUint32, nextUint32);
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

// default palette copied from flickgame
flickgame.defaultPalette = [
    "#140c1c", "#442434", "#30346d", "#4e4a4e",
    "#854c30", "#346524", "#d04648", "#757161",
    "#597dce", "#d27d2c", "#8595a1", "#6daa2c",
    "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
];

// brush names and datauris
flickgame.brushes = [
    { name: "1px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABlJREFUOI1jYBgFwx38/////0C7YRQMDQAApd4D/cefQokAAAAASUVORK5CYII=" },
    { name: "2px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABpJREFUOI1jYBgFwx38hwJ8apjo5ZhRMKgBADvbB/vPRl6wAAAAAElFTkSuQmCC" },
    { name: "3px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACNJREFUOI1jYBgFgxz8////PyE1jMRoZmRkxKmOYheMgmEBAARbC/qDr1pMAAAAAElFTkSuQmCC" },
    { name: "4px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAChJREFUOI1jYBgFgxz8hwJ8ahjxaUZRyMiIVS0TeW4jEhDjhVEwGAAAJhAT9IYiYRoAAAAASUVORK5CYII=" },
];

// brush pattern names and datauris
flickgame.patterns = [
    { name: "solid", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAANQTFRF////p8QbyAAAAA1JREFUGJVjYBgFyAAAARAAATPJ8WoAAAAASUVORK5CYII=" },
    { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAAZQTFRF////AAAAVcLTfgAAAAJ0Uk5T/wDltzBKAAAAEElEQVQYlWNgYCQAGUaUCgBFEACBOeFM/QAAAABJRU5ErkJggg==" },
    { name: "grate", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACpJREFUOI1j+P///38GJEAqH0WQXJosm7FqJoseDYPRMBgNA4b/////BwD1yX6QPhXhyAAAAABJRU5ErkJggg==" },
    { name: "light", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACJJREFUOI1j+P///38GJEAqn3pg4FwyGgajYTCwNg8alwAAPvx/gQ2QnLUAAAAASUVORK5CYII=" },
    { name: "circles", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAIVJREFUOI2lkksSgDAIQ0nH+185bqRGClTHbFqY8vgVdokkTQQA7vd7FEkiC84g6nMbalTKsivg6IKrIIWOL8F69/MVoNOoJmx2969v4vtpZGvUvrMEJIndniNsqW6Sws4V2v2TxxC7aVcV/t5C+8t2FUxAN+0dYGmBogo6swPYDikDq/8ElN2X5dPxSkwAAAAASUVORK5CYII=" },
    { name: "worms", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHlJREFUOI2tUlsOwCAIaxfvf+XuR5yZvJaMHwlgWx7ANEny3swHgGFBkkRhe90C6jBl6g6Gr6DH54rJBelIj+KX28s0krTBmR8Wp/0FrUnSP1voFJcKu+s6cuVx4NmCBzyiD+bbBiLwluSd/a0kBOrk1wyyAUbnbPEbw9o6+o7mZV0AAAAASUVORK5CYII=" },
    { name: "slants", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADVJREFUOI1j+P///38GJEAqnwGfJDF8JpymkQrI9Qp1XEBJQFLuAkqjkXqxQK5rRtPBYEgHABdWj38s+V8BAAAAAElFTkSuQmCC" },
    { name: "tiles", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFNJREFUOI3Nk8EKACAIQ/f/P71OQVCzLQryJAz3VBQAQJIoYtR7vqwpRWEoCY4hSX7Q/k60jE+pcgeK6o65pyauT3cQ06SeXOKUX2vfHcMqSB6qAfbO4x1nFCH3AAAAAElFTkSuQmCC" },
];

flickgame.Player = class extends EventTarget {
    constructor() {
        super();
        // home for data of the project we're playing
        this.stateManager = new maker.StateManager();
        // final composite of any graphics
        this.rendering = createRendering2D(flickgame.sceneWidth, flickgame.sceneHeight);
        // start the player in scene 0
        this.activeSceneIndex = 0;
    }

    async init() {
        return this;
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
        fillRendering2D(this.rendering);
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
        const index = this.stateManager.present.palette.findIndex((color) => color === hex);

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

flickgame.Editor = class extends EventTarget {
    constructor() {
        super();

        // to determine which resources are still in use for the project we
        // combine everything the flickgame needs plus anything this editor
        // needs
        const getManifest = (data) => [...flickgame.getManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<FlickgameDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");
        this.rendering.canvas.style.setProperty("cursor", "crosshair");
        this.preview = createRendering2D(flickgame.sceneWidth, flickgame.sceneHeight); 
        this.thumbnails = ZEROES(16).map(() => createRendering2D(flickgame.sceneWidth, flickgame.sceneHeight));

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
    
        // add brush icons and tooltips to brush select buttons
        ALL("#brush-select label").forEach((label, index) => {
            ONE("input", label).title = flickgame.brushes[index].name + " brush";
            ONE("img", label).src = flickgame.brushes[index].image;
        });

        // add pattern icons and tooltips to brush select buttons
        ALL("#pattern-select label").forEach((label, index) => {
            ONE("input", label).title = flickgame.patterns[index].name + " pattern";
            ONE("img", label).src = flickgame.patterns[index].image;
        });

        // state of the paint tools:
        // is the color pick key held down?
        this.heldColorPick = undefined;
        // current brush and pattern recolored with current color
        this.activeBrush = undefined;
        this.activePattern = undefined;
        // saved start coordinates during a line draw
        this.lineStart = undefined;
        // scene currently in the clipboard
        this.copiedScene = undefined;

        // editor actions controlled by html buttons
        this.actions = {
            // editor toolbar
            undo: ui.action("undo", () => this.stateManager.undo()),
            redo: ui.action("redo", () => this.stateManager.redo()),
            copy: ui.action("copy", () => this.copyScene()),
            paste: ui.action("paste", () => this.pasteScene()),
            clear: ui.action("clear", () => this.clearScene()),
            save: ui.action("save", () => this.save()),

            // editor menu
            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),
            update: ui.action("update", () => this.updateEditor()),

            // special feature
            importPalettes: ui.action("import-palette", () => this.importPalette()),
            exportPalettes: ui.action("export-palette", () => this.exportPalette()),
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

            if (event.altKey && this.heldColorPick === undefined) {
                this.heldColorPick = this.toolSelect.selectedIndex;
                this.toolSelect.selectedIndex = 3;
                event.preventDefault();
            }
        });

        // stop temporarily color picking if the alt key is released
        document.addEventListener("keyup", (event) => {
            if (!event.altKey && this.heldColorPick !== undefined) {
                this.toolSelect.selectedIndex = this.heldColorPick;
                this.heldColorPick = undefined;
            }
        });

        // changes in scene select bar
        this.sceneSelect.addEventListener("change", () => {
            this.render();
            this.refreshJumpSelect();
        });

        // changes in the jump select dropdown
        this.jumpSelect.addEventListener("change", () => {
            this.stateManager.makeChange(async (data) => {
                const { scene } = this.getSelections();
                scene.jumps[this.colorSelect.value] = this.jumpSelect.value;
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
            this.unsavedChanges = true;
            this.ready = true;

            this.refreshSceneThumbs();
            this.refreshActiveBrush();
            this.refreshColorSelect();
            this.refreshJumpSelect();
    
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

            // treat this as the beginning of a possible drag
            const drag = ui.drag(event);
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);

            // prepare the pattern mask and plot function
            const mask = createRendering2D(flickgame.sceneWidth, flickgame.sceneHeight);
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
        // load all the brush and pattern images
        this.brushRenders = await Promise.all(flickgame.brushes.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        this.patternRenders = await Promise.all(flickgame.patterns.map(({ image }) => loadImage(image).then(imageToRendering2D)));

        return this;
    }

    /**
     * Replace the current flickgame data with the given bundle.
     * @param {maker.ProjectBundle<FlickgameDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.ready = false;

        // account for changes between flickgame versions
        flickgame.updateProject(bundle.project);

        await this.stateManager.loadBundle(bundle);
        this.unsavedChanges = false;
    }

    /**
     * Return the various "selected" / "active" objects from editor state and
     * either the given project data or the present project data.
     * @param {FlickgameDataProject} data
     */
    getSelections(data = undefined) {
        data = data || this.stateManager.present;
        const scene = data.scenes[this.sceneSelect.selectedIndex];
        const palette = data.palette;
        const color = palette[this.colorSelect.selectedIndex];
        const brush = this.brushRenders[this.brushSelect.selectedIndex];
        const pattern = this.patternRenders[this.patternSelect.selectedIndex];
        const instance = this.stateManager.resources.get(scene.image);

        return { data, scene, palette, color, instance, brush, pattern };
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
        if (!this.ready) return;

        const { instance } = this.getSelections();

        // draw paint preview over current scene image
        fillRendering2D(this.rendering);
        this.rendering.drawImage(instance.canvas, 0, 0);
        this.rendering.drawImage(this.preview.canvas, 0, 0);

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    refreshPreview(x, y) {
        if (!this.ready) return;

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
        if (!this.ready) return;

        const { pattern, brush, color } = this.getSelections();

        this.activeBrush = recolorMask(brush, color);
        this.activePattern = recolorMask(pattern, color);
    }

    refreshSceneThumbs() {
        // redraw all the scene select thumbnails
        this.stateManager.present.scenes.forEach((scene, index) => {
            const image = this.stateManager.resources.get(scene.image).canvas;
            this.thumbnails[index].drawImage(image, 0, 0);
        });
    }

    refreshColorSelect() {
        const { palette } = this.getSelections();

        // recolor the color select buttons to the corresponding color
        ALL("#color-select label").forEach((label, index) => {
            label.style.background = palette[index];
        });
    }

    refreshJumpSelect() {
        const { scene, color } = this.getSelections();

        const jump = scene.jumps[this.colorSelect.value];
        this.jumpSelect.value = jump ? jump : "none";
        this.jumpColorIndicator.style.backgroundColor = color;
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
        const { palette, instance } = this.getSelections();

        const [r, g, b] = instance.getImageData(x, y, 1, 1).data;
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
            fillRendering2D(instance, palette[this.colorSelect.selectedIndex]);
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

        // track how many remixes this is (remixes have soft-limits to encourage finding updates)
        const generation = parseInt(clone.getAttribute("data-remix-generation"));
        clone.setAttribute("data-remix-generation", `${generation + 1}`);

        // default to player mode
        clone.setAttribute("data-app-mode", "player");

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
        await this.loadBundle(bundle);
    }

    async resetProject() {
        // open a blank project in the editor
        await this.loadBundle(makeBlankBundle());
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

    async exportPalette() {
        const rendering = createRendering2D(8, 1);

        withPixels(rendering, (pixels) => {
            this.stateManager.present.palette.forEach((hex, x) => {
                    pixels[x] = hexToUint32(hex);
            });
        });

        rendering.canvas.toBlob((blob) => maker.saveAs(blob, "flickgame-palette.png"));
    }

    async importPalette() {
        // ask user to provide palette image
        const [file] = await maker.pickFiles("image/*");
        const dataUri = await maker.dataURIFromFile(file);
        const image = await loadImage(dataUri);
        const rendering = imageToRendering2D(image);

        const prevPalette = this.stateManager.present.palette;
        const nextPalette = REPEAT(8, "#000000");
        
        // read palettes from image (16 colors)
        withPixels(rendering, (pixels) => {
            for (let i = 0; i < 16; ++i) {
                nextPalette[i] = rgbToHex(uint32ToRGB(pixels[i]));
            }
        });

        // palette swap all images to the corresponding palette
        await this.stateManager.makeChange(async (data) => {
            data.palette = nextPalette;
            const promises = data.scenes.map(async (scene) => {
                const instance = await this.forkSceneImage(scene);

                flickgame.swapPalette(
                    instance,
                    prevPalette,
                    nextPalette,
                );
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
        flickgame.storage.save(bundle, "slot0");
        
        // successful save, no unsaved changes
        this.unsavedChanges = false;

        // allow saving again when enough time has passed to see visual feedback
        await timer;
        this.actions.save.disabled = false;
    }

    async enterPlayerMode() {
        this.editorMode = false;
        // used to show/hide elements in css
        document.documentElement.setAttribute("data-app-mode", "player");
        // normal browser cursor in player mode
        this.rendering.canvas.style.setProperty("cursor", "unset");

        await flickgame.player.copyFrom(this.stateManager);
        flickgame.player.enter();
    }

    enterEditorMode() {
        this.editorMode = true;
        // used to show/hide elements in css
        document.documentElement.setAttribute("data-app-mode", "editor");
        // default to crosshair paint cursor in editor mode
        this.rendering.canvas.style.setProperty("cursor", "crosshair");

        this.render();

        // check if storage is available for saving
        this.actions.save.disabled = !flickgame.storage.available;
    }

    toggleHelp() {
        this.helpContainer.hidden = !this.helpContainer.hidden;
    }
}

async function makePlayer() {
    const player = new flickgame.Player();
    await player.init();

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
        fitCanvasToParent(playCanvas);
    });

    // update the canvas size whenever the browser window resizes
    window.addEventListener("resize", () => fitCanvasToParent(playCanvas));
    
    // update the canvas size initially
    fitCanvasToParent(playCanvas);

    return player;
}

flickgame.start = async function () {
    const editor = await new flickgame.Editor().init();
    const player = await makePlayer();

    flickgame.editor = editor;
    flickgame.player = player;

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", () => editor.enterPlayerMode());
    const edit = ui.action("edit", () => editor.enterEditorMode());

    // determine if there is a project bundle embedded in this page
    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        // embedded project, load it in the player
        await editor.loadBundle(bundle);
        play.invoke();
    } else {
        // no embedded project, start editor with save or editor embed
        const save = await flickgame.storage.load("slot0").catch(() => undefined);
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
    // telling us to load a bundle from the "update" button of another flickgame)
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

