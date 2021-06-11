/**
 * @param {HTMLCanvasElement} canvas 
 * @param {MouseEvent} event 
 */
function mouseEventToCanvasPixelCoords(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    const [mx, my] = [event.clientX - bounds.x, event.clientY - bounds.y];
    const scale = canvas.width / canvas.clientWidth; 
    const [px, py] = [Math.floor(mx * scale), Math.floor(my * scale)];
    return { x: px, y: py };
}

class PointerDrag extends EventTarget {
    /** 
     * @param {MouseEvent} event
     */
    constructor(event, { clickMovementLimit = 5 } = {}) {
        super();
        this.pointerId = event.pointerId;
        this.clickMovementLimit = 5;
        this.totalMovement = 0;

        this.downEvent = event;
        this.lastEvent = event; 

        this.listeners = {
            "pointerup": (event) => {
                if (event.pointerId !== this.pointerId) return;
    
                this.lastEvent = event;
                this.unlisten();
                this.dispatchEvent(new CustomEvent("pointerup", { detail: event }));
                if (this.totalMovement <= clickMovementLimit) {
                    this.dispatchEvent(new CustomEvent("click", { detail: event }));
                }
            },

            "pointermove": (event) => {
                if (event.pointerId !== this.pointerId) return;
    
                this.totalMovement += Math.abs(event.movementX);
                this.totalMovement += Math.abs(event.movementY);
                this.lastEvent = event;
                this.dispatchEvent(new CustomEvent("pointermove", { detail: event }));
            }
        }

        document.addEventListener("pointerup", this.listeners.pointerup);
        document.addEventListener("pointermove", this.listeners.pointermove);
    }

    unlisten() {
        document.removeEventListener("pointerup", this.listeners.pointerup);
        document.removeEventListener("pointermove", this.listeners.pointermove);
    }
}

/**
 * @param {string} query 
 * @param {ParentNode} element 
 * @returns {HTMLElement}
 */
const ONE = (query, element = undefined) => (element || document).querySelector(query);
/**
 * @param {string} query 
 * @param {HTMLElement | Document} element 
 * @returns {HTMLElement[]}
 */
const ALL = (query, element = undefined) => Array.from((element || document).querySelectorAll(query));

/**
 * @template T
 * @param {T} object
 * @returns {T}
 */
const COPY = (object) => JSON.parse(JSON.stringify(object));

/**
 * @param {number} length 
 * @returns {number[]}
 */
const ZEROES = (length) => Array(length).fill(0);

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName 
 * @param {*} attributes 
 * @param  {...(Node | string)} children 
 * @returns {HTMLElementTagNameMap[K]}
 */
 function html(tagName, attributes = {}, ...children) {
    const element = /** @type {HTMLElementTagNameMap[K]} */ (document.createElement(tagName)); 
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    children.forEach((child) => element.append(child));
    return element;
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

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

        this.sceneSelect = maker.ui.radio("scene-select");
        this.toolSelect = maker.ui.radio("tool-select");
        this.brushSelect = maker.ui.radio("brush-select");
        this.patternSelect = maker.ui.radio("pattern-select");
        this.colorSelect = maker.ui.radio("color-select");
        this.jumpSelect = maker.ui.select("jump-select");
        this.jumpColorIndicator = ONE("#jump-source-color");

        this.heldColorPick = false;

        /** @type {CanvasRenderingContext2D[]} */
        this.brushRenders = ZEROES(4);
        brushes.forEach(async ({ image }, index) => {
            const img = await loadImage(image);
            const rendering = imageToRendering2D(img);
            this.brushRenders[index] = rendering;
            this.activeBrush = this.brushRenders[0];
        });

        /** @type {CanvasRenderingContext2D[]} */
        this.patternRenders = ZEROES(8);
        patterns.forEach(async ({ image }, index) => {
            const img = await loadImage(image);
            const rendering = imageToRendering2D(img);
            this.patternRenders[index] = rendering;
            this.activePattern = this.patternRenders[0];
        });

        this.activeBrush = undefined;
        this.activePattern = undefined;
        this.lineStart = undefined;

        this.actions = {
            undo: maker.ui.action("undo"),
            redo: maker.ui.action("redo"),
            copy: maker.ui.action("copy"),
            paste: maker.ui.action("paste"),
            clear: maker.ui.action("clear"),
        };

        this.actions.undo.disabled = true;
        this.actions.redo.disabled = true;
        this.actions.paste.disabled = true;

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

                const drag = new PointerDrag(event);
                drag.addEventListener("pointerup", (event) => {
                    const { x, y } = mouseEventToCanvasPixelCoords(this.rendering.canvas, event.detail);
                    plot(x, y);
                    mask.globalCompositeOperation = "source-in";
                    fillRendering2D(mask, pattern);
                    mask.globalCompositeOperation = "source-over";
                    instance.drawImage(mask.canvas, 0, 0);
                    this.stateManager.changed();
                });
                drag.addEventListener("pointermove", (event) => {
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

                const drag = new PointerDrag(event);
                drag.addEventListener("pointerup", (event) => {
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
            const { id, instance } = await this.stateManager.resources.get(scene.image);
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
}

async function start() {
    const player = new FlickgamePlayer();
    const editor = new FlickgameEditor();

    const play = maker.ui.action("play");
    const edit = maker.ui.action("edit");
    const export_ = maker.ui.action("export");
    const import_ = maker.ui.action("import");
    const reset = maker.ui.action("reset");
    const help = maker.ui.action("help");

    function showPlayer() {
        ONE("#player").hidden = false;
        ONE("#editor").hidden = true;
        resizePlayer();
    }

    function showEditor() {
        ONE("#player").hidden = true;
        ONE("#editor").hidden = false;

        editor.sceneSelect.selectedIndex = 0;
        editor.toolSelect.selectedIndex = 0;
        editor.brushSelect.selectedIndex = getRandomInt(0, 4);
        editor.patternSelect.selectedIndex = getRandomInt(0, 8);
        editor.colorSelect.selectedIndex = getRandomInt(7, 16);
        editor.render();
    }

    play.addEventListener("invoke", async () => {
        await player.copyFrom(editor.stateManager);
        showPlayer();
    });

    edit.addEventListener("invoke", async () => {
        if (!editor.stateManager.present) {
            const bundle = await player.stateManager.makeBundle();
            await editor.stateManager.loadBundle(bundle);
        }
        showEditor();
    });

    reset.addEventListener("invoke", resetProject);
    export_.addEventListener("invoke", exportProject);
    import_.addEventListener("invoke", importProject);

    const helpContainer = ONE("#help");

    help.addEventListener("invoke", () => helpContainer.hidden = !helpContainer.hidden);

    async function resetProject() {
        editor.stateManager.loadBundle(makeBlankBundle());
    }

    async function exportProject() {
        const bundle = await editor.stateManager.makeBundle();

        const clone = /** @type {HTMLElement} */ (document.documentElement.cloneNode(true));
        ALL("[data-empty]", clone).forEach((element) => element.replaceChildren());
        ALL("[data-editor-only]", clone).forEach((element) => element.remove());
        ONE("body", clone).setAttribute("data-play", "true");
        //ONE("title", clone).innerHTML = "";
        ONE("#bundle-embed", clone).innerHTML = JSON.stringify(bundle);

        const name = "flickgame.html";
        const blob = maker.textToBlob(clone.outerHTML, "text/html");
        maker.saveAs(blob, name);
    }

    async function importProject() {
        const [file] = await maker.pickFiles("text/html");
        const text = await maker.textFromFile(file);
        const html = await maker.htmlFromText(text);

        const json = ONE("#bundle-embed", html).innerHTML;
        const bundleData = JSON.parse(json);
        editor.stateManager.loadBundle(bundleData);
    }

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
    });

    function resizePlayer() {
        const container = playCanvas.parentElement;
        const [tw, th] = [container.clientWidth, container.clientHeight];
        const [sw, sh] = [tw / playCanvas.width, th / playCanvas.height];
        const scale = Math.min(sw, sh);
        playCanvas.style.setProperty("width", `${playCanvas.width * scale}px`);
        playCanvas.style.setProperty("height", `${playCanvas.height * scale}px`);
    }

    window.addEventListener("resize", resizePlayer);

    const embedded = ONE("#bundle-embed")?.textContent;
    if (embedded) {
        help.invoke();
        const bundle = JSON.parse(embedded);
        await player.loadBundle(bundle);
        showPlayer();
    } else {
        await editor.stateManager.loadBundle(makeBlankBundle());

        const demo = await loadImage("data:image/png;base64,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");
        editor.stateManager.makeChange(async (data) => {
            const prev = data.scenes[0].image;
            const { id, instance } = await editor.stateManager.resources.fork(prev);
            instance.drawImage(demo, 0, 0);
            data.scenes[0].image = id;
        });

        showEditor();
    }
}
