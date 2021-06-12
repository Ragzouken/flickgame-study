/** @type {maker.ResourceHandler<string, CanvasRenderingContext2D>} */
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

/** @param {FlickgameDataProject} data */
function getFlickgameManifest(data) {
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

function fitCanvasToParent(canvas) {
    const [tw, th] = [canvas.parentElement.clientWidth, canvas.parentElement.clientHeight];
    const [sw, sh] = [tw / canvas.width, th / canvas.height];
    const scale = Math.min(sw, sh);
    canvas.style.setProperty("width", `${canvas.width * scale}px`);
    canvas.style.setProperty("height", `${canvas.height * scale}px`);
}

const defaultScene = "data:image/png;base64,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";

const palette = [
    "#140c1c", "#442434", "#30346d", "#4e4a4e",
    "#854c30", "#346524", "#d04648", "#757161",
    "#597dce", "#d27d2c", "#8595a1", "#6daa2c",
    "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
];

const brushes = [
    { name: "1px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABlJREFUOI1jYBgFwx38/////0C7YRQMDQAApd4D/cefQokAAAAASUVORK5CYII=" },
    { name: "2px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABpJREFUOI1jYBgFwx38hwJ8apjo5ZhRMKgBADvbB/vPRl6wAAAAAElFTkSuQmCC" },
    { name: "3px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACNJREFUOI1jYBgFgxz8////PyE1jMRoZmRkxKmOYheMgmEBAARbC/qDr1pMAAAAAElFTkSuQmCC" },
    { name: "4px circle", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAChJREFUOI1jYBgFgxz8hwJ8ahjxaUZRyMiIVS0TeW4jEhDjhVEwGAAAJhAT9IYiYRoAAAAASUVORK5CYII=" },
];

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
        this.stateManager = new maker.StateManager();
        this.rendering = createRendering2D(160, 100);
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
        this.activeSceneIndex = 0;
        this.render();
    }

    render() {
        const scene = this.stateManager.present.scenes[this.activeSceneIndex];
        const image = this.stateManager.resources.get(scene.image);
        
        this.rendering.clearRect(0, 0, 160, 100);
        this.rendering.drawImage(image.canvas, 0, 0);

        this.dispatchEvent(new CustomEvent("render"));
    }

    getJumpAt(x, y) {
        const scene = this.stateManager.present.scenes[this.activeSceneIndex];
        const image = this.stateManager.resources.get(scene.image);

        const [r, g, b, a] = image.getImageData(x, y, 1, 1).data;
        const hex = "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("");
        const index = palette.findIndex((color) => color === hex);
        return scene.jumps[index];
    }

    click(x, y) {
        const jump = this.getJumpAt(x, y);

        if (jump) { 
            this.activeSceneIndex = parseInt(jump, 10);
            this.render();
        }
    }

    show() {
        this.render();
    }
}

class FlickgameEditor extends EventTarget {
    constructor() {
        super();

        const getManifest = (data) => [...getFlickgameManifest(data), ...this.getManifest()];

        /** @type {maker.StateManager<FlickgameDataProject>} */
        this.stateManager = new maker.StateManager(getManifest);
        /** @type {CanvasRenderingContext2D} */
        this.rendering = ONE("#renderer").getContext("2d");
        this.rendering.canvas.style.setProperty("cursor", "crosshair");
        this.preview = createRendering2D(160, 100); 
        this.thumbnails = ZEROES(16).map(() => createRendering2D(160, 100));

        this.sceneSelect = ui.radio("scene-select");
        this.toolSelect = ui.radio("tool-select");
        this.brushSelect = ui.radio("brush-select");
        this.patternSelect = ui.radio("pattern-select");
        this.colorSelect = ui.radio("color-select");
        this.jumpSelect = ui.select("jump-select");
        this.jumpColorIndicator = ONE("#jump-source-color");

        this.heldColorPick = false;

        this.activeBrush = undefined;
        this.activePattern = undefined;
        this.lineStart = undefined;

        this.actions = {
            undo: ui.action("undo"),
            redo: ui.action("redo"),
            copy: ui.action("copy"),
            paste: ui.action("paste"),
            clear: ui.action("clear"),

            export_: ui.action("export", () => this.exportProject()),
            import_: ui.action("import", () => this.importProject()),
            reset: ui.action("reset", () => this.resetProject()),
            help: ui.action("help", () => this.toggleHelp()),
        };

        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.paste.disabled = true;
    
        this.helpContainer = ONE("#help");   

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

        /** @type {FlickgameDataScene} */
        this.copiedScene = undefined;

        this.sceneSelect.addEventListener("change", () => {
            this.render();
            this.refreshJumpSelect();
        });

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

        this.brushSelect.addEventListener("change", () => this.refreshActiveBrush());
        this.patternSelect.addEventListener("change", () => this.refreshActiveBrush());

        this.colorSelect.addEventListener("change", () => {
            this.refreshActiveBrush();
            this.refreshJumpSelect();
        });
    
        this.stateManager.addEventListener("change", () => {
            this.stateManager.present.scenes.forEach((scene, index) => {
                const image = this.stateManager.resources.get(scene.image).canvas;
                this.thumbnails[index].drawImage(image, 0, 0);
            });
    
            this.render();
    
            this.actions.undo.disabled = !this.stateManager.canUndo;
            this.actions.redo.disabled = !this.stateManager.canRedo;
    
            this.refreshJumpSelect();
        });

        this.actions.undo.addEventListener("invoke", () => this.stateManager.undo());
        this.actions.redo.addEventListener("invoke", () => this.stateManager.redo());
        this.actions.copy.addEventListener("invoke", () => this.copyScene());
        this.actions.paste.addEventListener("invoke", () => this.pasteScene());
        this.actions.clear.addEventListener("invoke", () => this.clearScene());

        ALL("#scene-select input").forEach((input, index) => {
            input.after(this.thumbnails[index].canvas);
        });
    
        ALL("#color-select label").forEach((label, index) => {
            label.style.backgroundColor = palette[index];
        });
    
        ALL("#brush-select label").forEach((label, index) => {
            ONE("input", label).title = brushes[index].name + " brush";
            ONE("img", label).src = brushes[index].image;
        });
    
        ALL("#pattern-select label").forEach((label, index) => {
            ONE("input", label).title = patterns[index].name + " pattern";
            ONE("img", label).src = patterns[index].image;
        });

        document.addEventListener("mousemove", (event) => {
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);
            this.refreshPreview(x, y);
        });
        
        this.rendering.canvas.addEventListener("pointerdown", async (event) => {
            if (this.heldColorPick) return;

            if (this.toolSelect.value === "freehand") {
                const scene = this.stateManager.present.scenes[this.sceneSelect.selectedIndex];

                const mask = createRendering2D(160, 100);
                const plot = (x, y) => mask.drawImage(this.activeBrush.canvas, (x - 7.5) | 0, (y - 7.5) | 0);
                const pattern = mask.createPattern(this.activePattern.canvas, 'repeat');

                this.stateManager.makeCheckpoint();
                const { id, instance } = await this.stateManager.resources.fork(scene.image);
                scene.image = id;

                const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);
                plot(x, y);
                mask.globalCompositeOperation = "source-in";
                fillRendering2D(mask, pattern);
                mask.globalCompositeOperation = "source-over";
                instance.drawImage(mask.canvas, 0, 0);
                this.stateManager.changed();

                let prev = { x, y };

                const drag = ui.drag(event);
                drag.addEventListener("up", (event) => {
                    const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                    plot(x, y);
                    mask.globalCompositeOperation = "source-in";
                    fillRendering2D(mask, pattern);
                    mask.globalCompositeOperation = "source-over";
                    instance.drawImage(mask.canvas, 0, 0);
                    this.stateManager.changed();
                });
                drag.addEventListener("move", (event) => {
                    const { x: x0, y: y0 } = prev;
                    const { x: x1, y: y1 } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                    lineplot(x0, y0, x1, y1, plot);
                    mask.globalCompositeOperation = "source-in";
                    fillRendering2D(mask, pattern);
                    mask.globalCompositeOperation = "source-over";
                    instance.drawImage(mask.canvas, 0, 0);
                    prev = { x: x1, y: y1 };
                    this.stateManager.changed();
                });
            } else if (this.toolSelect.value === "line") {
                const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);
                this.lineStart = { x, y };
                this.refreshPreview(x, y);

                const drag = ui.drag(event);
                drag.addEventListener("up", (event) => {
                    this.stateManager.makeChange(async (data) => {
                        const scene = this.stateManager.present.scenes[this.sceneSelect.selectedIndex];
    
                        const { x: x0, y: y0 } = this.lineStart;
                        const { x: x1, y: y1 } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                        const { id, instance } = await this.stateManager.resources.fork(scene.image);
                        scene.image = id;

                        const mask = createRendering2D(160, 100);
                        const plot = (x, y) => mask.drawImage(this.activeBrush.canvas, (x - 7.5) | 0, (y - 7.5) | 0);
                        lineplot(x0, y0, x1, y1, plot);
                        mask.globalCompositeOperation = "source-in";
                        fillRendering2D(mask, mask.createPattern(this.activePattern.canvas, 'repeat'));
                        instance.drawImage(mask.canvas, 0, 0);

                        this.lineStart = undefined;
                    });
                });
            }
        });

        this.rendering.canvas.addEventListener("pointerup", (event) => {
            if (event.button !== 1) event.preventDefault();
            const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event);

            if (this.toolSelect.value === "pick" || this.heldColorPick) {
                this.pickColor(x, y);
            } else if (this.toolSelect.value === "fill") {
                this.floodFill(x, y);
            } 
        });
    }

    async init() {
        this.brushRenders = await Promise.all(brushes.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        this.patternRenders = await Promise.all(patterns.map(({ image }) => loadImage(image).then(imageToRendering2D)));
        
        this.activeBrush = this.brushRenders[0];
        this.activePattern = this.patternRenders[0];
    }

    get selectedScene() {
        return this.stateManager.present.scenes[this.sceneSelect.selectedIndex];
    }

    render() {
        if (!this.selectedScene) return;
        const image = this.stateManager.resources.get(this.selectedScene.image);

        fillRendering2D(this.rendering);
        this.rendering.drawImage(image.canvas, 0, 0);
        this.rendering.drawImage(this.preview.canvas, 0, 0);

        this.dispatchEvent(new CustomEvent("render"));
    }

    refreshPreview(x, y) {
        if (!this.stateManager.present) return;

        fillRendering2D(this.preview);

        const valid = x !== undefined && y != undefined;
        const plot = (x, y) => this.preview.drawImage(this.activeBrush.canvas, (x - 7.5) | 0, (y - 7.5) | 0);

        if (this.heldColorPick) {
        } else if (valid && this.toolSelect.value === "freehand") {
            plot(x, y);
            this.preview.globalCompositeOperation = "source-in";
            fillRendering2D(this.preview, this.preview.createPattern(this.activePattern.canvas, 'repeat'));
            this.preview.globalCompositeOperation = "source-over";
        } else if (valid && this.lineStart && this.toolSelect.value === "line") {
            const { x: x0, y: y0 } = this.lineStart;
            lineplot(x0, y0, x, y, plot);
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
        if (this.sceneSelect.selectedIndex < 0 || this.colorSelect.selectedIndex < 0) return;

        const jump = this.selectedScene.jumps[this.colorSelect.value];
        this.jumpSelect.value = jump ? jump : "none";
        this.jumpColorIndicator.style.backgroundColor = palette[this.colorSelect.selectedIndex];
    }

    floodFill(x, y) {
        this.stateManager.makeChange(async (data) => {
            const scene = data.scenes[this.sceneSelect.selectedIndex];
            const { id, instance } = await this.stateManager.resources.fork(scene.image);
            scene.image = id;

            const mask = floodfillOutput(instance, x, y, 0xFFFFFFFF);
            mask.globalCompositeOperation = "source-in";
            fillRendering2D(mask, mask.createPattern(this.activePattern.canvas, 'repeat'));
            instance.drawImage(mask.canvas, 0, 0);
        });
    }

    pickColor(x, y) {
        const [r, g, b, a] = this.rendering.getImageData(x, y, 1, 1).data;
        const hex = "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("");
        this.colorSelect.selectedIndex = palette.findIndex((color) => color === hex);
    }

    copyScene() {
        this.copiedScene = COPY(this.selectedScene);
        this.actions.paste.disabled = false;
    }

    pasteScene() {
        this.stateManager.makeChange(async (data) => {
            const scene = COPY(this.copiedScene);
            data.scenes[this.sceneSelect.selectedIndex] = scene;
        });
    }

    clearScene() {
        this.stateManager.makeChange(async (data) => {
            const scene = data.scenes[this.sceneSelect.selectedIndex];
            const { id, instance } = await this.stateManager.resources.fork(scene.image);
            instance.fillStyle = palette[this.colorSelect.selectedIndex];
            instance.fillRect(0, 0, 160, 100);
            scene.image = id;
        });
    }

    /** @returns {string[]} */
    getManifest() {
        return this.copiedScene ? [this.copiedScene.image] : [];
    }

    async exportProject() {
        const bundle = await this.stateManager.makeBundle();

        const clone = /** @type {HTMLElement} */ (document.documentElement.cloneNode(true));
        ALL("[data-empty]", clone).forEach((element) => element.replaceChildren());
        ALL("[data-editor-only]", clone).forEach((element) => element.remove());
        ONE("#bundle-embed", clone).innerHTML = JSON.stringify(bundle);
        ONE("#editor", clone).hidden = true;

        const name = "flickgame.html";
        const blob = maker.textToBlob(clone.outerHTML, "text/html");
        maker.saveAs(blob, name);
    }

    async importProject() {
        const [file] = await maker.pickFiles("text/html");
        const text = await maker.textFromFile(file);
        const html = await maker.htmlFromText(text);
        const bundle = maker.bundleFromHTML(html);
        await this.stateManager.loadBundle(bundle);
    } 

    async resetProject() {
        await this.stateManager.loadBundle(makeBlankBundle());
        await this.stateManager.makeChange(async (data) => {
            const prev = data.scenes[0].image;
            const { id, instance } = await this.stateManager.resources.fork(prev);
            instance.drawImage(await loadImage(defaultScene), 0, 0);
            data.scenes[0].image = id;
        });
    }

    toggleHelp() {
        this.helpContainer.hidden = !this.helpContainer.hidden;
    }

    show() {
        this.sceneSelect.selectedIndex = 0;
        this.toolSelect.selectedIndex = 0;
        this.brushSelect.selectedIndex = getRandomInt(0, 4);
        this.patternSelect.selectedIndex = getRandomInt(0, 8);
        this.colorSelect.selectedIndex = getRandomInt(7, 16);
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
    
    playCanvas.addEventListener("mousemove", (event) => {
        const { x, y } = mouseEventToCanvasPixelCoords(playCanvas, event);
        const clickable = player.getJumpAt(x, y) !== undefined;
        playCanvas.style.setProperty("cursor", clickable ? "pointer" : "unset");
    });

    playCanvas.addEventListener("click", (event) => {
        const { x, y } = mouseEventToCanvasPixelCoords(playCanvas, event);
        player.click(x, y);
    });

    player.addEventListener("render", () => {
        playRendering.drawImage(player.rendering.canvas, 0, 0);
        fitCanvasToParent(playCanvas)
    });

    window.addEventListener("resize", () => fitCanvasToParent(playCanvas));
    fitCanvasToParent(playCanvas);

    return player;
}
