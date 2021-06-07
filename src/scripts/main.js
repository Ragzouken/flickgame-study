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
 * @template {keyof WindowEventMap} K
 * @param {Window | Document | Element} element 
 * @param {K} type 
 * @param {(event: WindowEventMap[K]) => any} listener
 * @returns {() => void}
 */
function LISTEN(element, type, listener) {
    element.addEventListener(type, listener);
    return () => element.removeEventListener(type, listener);
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

class RadioGroupWrapper extends EventTarget {
    /** @param {HTMLInputElement[]} inputs */
    constructor(inputs) {
        super();
        this.inputs = inputs;

        inputs.forEach((input) => {
            input.addEventListener("change", () => {
                if (!input.checked) return;
                this.dispatchEvent(new CustomEvent("change"));
            });
        });
    }

    get selectedIndex() {
        return this.inputs.findIndex((button) => button.checked); 
    }

    set selectedIndex(value) {
        this.inputs[value].click();
    }

    get selectedInput() {
        return this.inputs[this.selectedIndex];
    }

    get value() {
        return this.selectedInput?.value;
    }
}

class ButtonAction extends EventTarget {
    /** @param {HTMLButtonElement[]} buttons */
    constructor(buttons) {
        super();
        this.buttons = buttons;
        this.disabled = false;

        buttons.forEach((button) => {
            button.addEventListener("click", () => this.invoke());
        });
    }

    get disabled() {
        return this._disabled;
    }

    set disabled(value) {
        this._disabled = value;
        this.buttons.forEach((button) => button.disabled = value);
    }

    invoke(force = false) {
        if (!force && this.disabled) return;
        this.dispatchEvent(new CustomEvent("invoke"));
    }
}

/**
 * @param {string} name
 */
function RADIO(name) {
    const buttons = ALL(`input[type="radio"][name="${name}"]`);
    return new RadioGroupWrapper(buttons);
}

/**
 * @param {string} name
 * @returns {HTMLButtonElement}
 */
 function BUTTON(name) {
    return ONE(`button[name="${name}"]`);
}

/**
 * @param {string} name
 * @returns {ButtonAction}
 */
 function ACTION(name) {
    const buttons = ALL(`button[name="${name}"]`);
    return new ButtonAction(buttons);
}

/**
 * @param {string} name
 * @returns {HTMLSelectElement}
 */
function SELECT(name) {
    return ONE(`select[name="${name}"]`);
}

function RENDERING2D(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext("2d");
}

/** @param {HTMLImageElement} image */
function imageToRendering2D(image) {
    const rendering = RENDERING2D(image.naturalWidth, image.naturalHeight);
    rendering.drawImage(image, 0, 0);
    return rendering;
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>} image
 */
 async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = document.createElement("img");
        image.addEventListener("load", () => resolve(image));
        image.src = src;
    });
}

class FlickgameStateManager extends EventTarget {
    constructor() {
        super();

        /** @type {Map<string, CanvasRenderingContext2D>} */
        this.rendering2ds = new Map();
    }

    /** @param {FlickgameDataProject} data */
    async load(data) {
        this.data = data;
        this.lastId = 0;

        const promises = Object.entries(data.images).map(async ([id, datauri]) => {
            const image = await loadImage(datauri);
            const rendering = imageToRendering2D(image);
            this.rendering2ds.set(id, rendering);
        });
        await Promise.all(promises);

        this.dispatchEvent(new CustomEvent("change"));
    }

    nextId() {
        while (this.rendering2ds.has(this.lastId.toString())) {
            this.lastId += 1;
        }

        return this.lastId.toString();
    }

    addRendering(rendering) {
        const id = this.nextId();
        this.rendering2ds.set(id, rendering);
        return id;
    }
}

/** @returns {FlickgameDataProject} */
function makeBlankProject() {
    const blank = RENDERING2D(160, 100);
    blank.fillStyle = "#140c1c";
    blank.fillRect(0, 0, 160, 100);
    const scenes = Array(16).fill().map(() => ({ image: "0", jumps: {} }));
    const images = { "0": blank.canvas.toDataURL() };

    return { scenes, images };
}

async function start() {
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
        { name: "solid", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAADUExURf///6fEG8gAAAAJcEhZcwAADsIAAA7CARUoSoAAAAANSURBVBjTYyAJMDAAAAAwAAHT27rKAAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
        { name: "dither", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURf///wAAAFXC034AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABFJREFUKFNjYGAkAEeSCkYGAEUQAIFA2DR1AAAAAElFTkSuQmCC" },
    ];

    const demo = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABkBAMAAADzmCa8AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAMUExURRQMHG2qLN7u1tJ9LAlotEkAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMUSURBVGjezdmJkesgDABQIA1ABx6lgUzov7cPEmAwh4Vh50d7xgsv4jBZiPgfYTZ70ujd4F5P7E7wKaigcVHq5yDAUV80HtsLmu2gfg7WnegmDIFSr4JHBNGU5pyKrYb0wLNoGHICJTY8/QWegJCDIvOeg0cOZj04BUJWKwfzm5kPqiaoryAsgTQPF8DjCob5olfB89dqRgNwJ2IbHJXig2obCHe1sNA82K8Fm0EsMzPKdyA8AxsdRanhdfbyNQLh9AQ7TqaqCY9A0QVhMwhFPABVCcImsOOtggo2gFnF2psZlQYIyyAUY9JIcEasQYAlUeWgeHUSBP64lKD9dMHJ5QYSCPD+wkqzA/jGCvbjnsBaWBEDaL/+h/24R7aXIU90xd4fLsjpSWwjgu7p0RqC90kiqLwixMv3Xr8LeUkm0CeI8b0Bxzn6eRJB8u4SHIgv38gIpgBGdEA3jRGECL55XFdE0HeZuze8JyDvwaMW1E2rE0hV/Lesya76UWWkhim69opToLLJP3CbUSekBim+LDW020tRjEt6vgC32+ziM1iiVf7PaGLUqM0uwdGaXxDpch/0wyLai34oUF6gfYKCtF+oMywbdE2wHgJa3dvZDcGzTOHhHm0AUosbbe7f/8MNgQ2gK/TuJVjFAHxZm561XLNGC9RoYxpbXGUoFkOxe5AbwVF/BfaKSVHsee/BuwT9UY6ZAo8LKCuQeeBEoILrVuBSexI8IpgJxpwdp6vDlxtQVCAeLsWOa5zm9INuUP9Zge5Lz4MhzxqMqH9Un+bcpin6oNSroEwgDo2h8z+hJ0B64UynS+FsCY8m3QeB0jwFfWIR9OOCwx2bz/MU5NtxX1sn0Es42pSleQSeg0Dd6Oc43ir5yecjMFBxhLH9PDBfGzxoRMgo3cL0mDl1VLFenyB1GQ1ENvSMKF5QENTX8XQjMnX/qRyUrb731/QkmE5NW3NYnn3JBmNN07zL6BJzahf/FUjzO2/69EOaXwanRpMRcdXfBpL102B86dwX1zcslkOazW/gSvZazw1c+3fGRIOF+Af8sQAWZmiH2QAAAABJRU5ErkJggg==");
    const renderer = ONE("#renderer").getContext("2d");

    const sceneSelect = RADIO("scene-select");
    const toolSelect = RADIO("tool-select");
    const brushSelect = RADIO("brush-select");
    const patternSelect = RADIO("pattern-select");
    const colorSelect = RADIO("color-select");
    const jumpSelect = SELECT("jump-select");

    const undo = ACTION("undo");
    const redo = ACTION("redo");
    const copy = ACTION("copy");
    const paste = ACTION("paste");
    const clear = ACTION("clear");

    const export_ = ACTION("export");
    const import_ = ACTION("import");
    const reset = ACTION("reset");

    const jumpColorIndicator = ONE("#jump-source-color");

    const test = ONE("#renderer");
    const thumbnails = Array(16).fill().map(() => {
        const thumbnail = RENDERING2D(160, 100);
        thumbnail.drawImage(test, 0, 0);
        return thumbnail;
    });

    ALL("#scene-select input").forEach((input, index) => {
        input.after(thumbnails[index].canvas);
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

    colorSelect.addEventListener("change", () => {
        jumpColorIndicator.style.backgroundColor = palette[colorSelect.selectedIndex];
    });

    const stateManager = new FlickgameStateManager();

    stateManager.addEventListener("change", () => {
        stateManager.data.scenes.forEach((scene, index) => {
            const image = stateManager.rendering2ds.get(scene.image).canvas;
            thumbnails[index].drawImage(image, 0, 0);
        });

        const currentScene = stateManager.data.scenes[sceneSelect.selectedIndex];
        renderer.drawImage(stateManager.rendering2ds.get(currentScene.image).canvas, 0, 0);
    });

    sceneSelect.addEventListener("change", () => {
        const currentScene = stateManager.data.scenes[sceneSelect.selectedIndex];
        renderer.drawImage(stateManager.rendering2ds.get(currentScene.image).canvas, 0, 0);
    });

    await stateManager.load(makeBlankProject());
    const init = RENDERING2D(160, 100);
    init.drawImage(demo, 0, 0);
    stateManager.data.scenes[0].image = stateManager.addRendering(init);
    stateManager.dispatchEvent(new CustomEvent("change"));

    sceneSelect.selectedIndex = 0;
    toolSelect.selectedIndex = 0;
    brushSelect.selectedIndex = getRandomInt(0, 4);
    patternSelect.selectedIndex = getRandomInt(0, 8);
    colorSelect.selectedIndex = getRandomInt(7, 16);
    jumpSelect.selectedIndex = getRandomInt(0, 17);

    undo.disabled = true;
    redo.disabled = true;
    paste.disabled = true;

    clear.addEventListener("invoke", () => {
        const scene = stateManager.data.scenes[sceneSelect.selectedIndex];
        const edit = RENDERING2D(160, 100);
        edit.drawImage(stateManager.rendering2ds.get(scene.image).canvas, 0, 0);
        edit.fillStyle = palette[getRandomInt(0, 16)];
        edit.fillRect(0, 0, 160, 100);
        scene.image = stateManager.addRendering(edit);
        stateManager.dispatchEvent(new CustomEvent("change"));
    });

    // TODO: think about.. project data could have textual references to "resources"
    // each paint adds new resource to manager and updates state. then saving is
    // saving state + pruned resource manager? -- essentially git lfs
}
