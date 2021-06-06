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

async function start() {
    const palette = [
        "#140c1c",
        "#442434",
        "#30346d",
        "#4e4a4e",
        "#854c30",
        "#346524",
        "#d04648",
        "#757161",
        "#597dce",
        "#d27d2c",
        "#8595a1",
        "#6daa2c",
        "#d2aa99",
        "#6dc2ca",
        "#dad45e",
        "#deeed6",
    ];

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

    ALL("#color-select label").forEach((label, index) => {
        label.style.backgroundColor = palette[index];
    });

    colorSelect.addEventListener("change", () => {
        jumpColorIndicator.style.backgroundColor = palette[colorSelect.selectedIndex];
    });

    sceneSelect.selectedIndex = 0;
    toolSelect.selectedIndex = 0;
    brushSelect.selectedIndex = getRandomInt(0, 4);
    patternSelect.selectedIndex = getRandomInt(0, 8);
    colorSelect.selectedIndex = getRandomInt(7, 16);
    jumpSelect.selectedIndex = getRandomInt(0, 17);

    undo.disabled = true;
    redo.disabled = true;
    paste.disabled = true;
}
