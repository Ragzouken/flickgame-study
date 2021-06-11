"strict"
const maker = {};

/**
 * @template TProject
 * @typedef {(project: TProject) => string[]} maker.ManifestFunction
 */

/**
 * @typedef {Object.<string, ResourceData>} maker.ResourceBundle
 */

/**
 * @template TProject
 * @typedef {Object} maker.ProjectBundle
 * @property {TProject} project
 * @property {maker.ResourceBundle} resources
 */

/**
 * @template TData
 * @template TInstance
 * @typedef {Object} maker.ResourceHandler
 * @property {(data: TData) => Promise<TInstance>} load
 * @property {(instance: TInstance) => Promise<TInstance>} copy
 * @property {(instance: TInstance) => Promise<TData>} save
 */

/** @type {Object.<string, maker.ResourceHandler<any, any>>} */
maker.resourceHandlers = {};

/** @type {maker.ResourceHandler<string, CanvasRenderingContext2D>} */
maker.resourceHandlers["canvas-datauri"] = {
    load: async (data) => imageToRendering2D(await loadImage(data)),
    copy: async (instance) => copyRendering2D(instance),
    save: async (instance) => instance.canvas.toDataURL(),
};

maker.ResourceManager = class {
    constructor() {
        this.lastId = 0;
        /** @type {Map<string, { type: string, instance: any }>} */
        this.resources = new Map();
    }

    /**
     * Generate a new unique id for a resource.
     * @returns {string}
     */
    generateId() {
        while (this.resources.has(this.lastId.toString())) {
            this.lastId += 1;
        }

        return this.lastId.toString();
    }
    
    /**
     * Clear all resources.
     */
    clear() {
        this.resources.clear();
    }

    /**
     * Get the resource instance with the given id.
     * @param {string} id 
     * @returns {any}
     */
    get(id) {
        return this.resources.get(id)?.instance;
    }

    /**
     * Add a resource instance at a specific id.
     * @param {string} id 
     * @param {any} instance 
     * @param {string} type 
     */
    set(id, instance, type) {
        this.resources.set(id, { type, instance });
    }

    /**
     * Add an instance as a new resource and return its new id.
     * @param {any} instance 
     * @param {string} type 
     * @returns {string}
     */
    add(instance, type) {
        const id = this.generateId();
        this.set(id, instance, type);
        return id;
    }

    /**
     * Copy the existing resource with the given id and add it as a new resource.
     * @param {string} id 
     * @returns 
     */
    async fork(id) {
        const source = this.resources.get(id);
        const forkId = this.generateId();
        const instance = await maker.resourceHandlers[source.type].copy(source.instance); 
        this.set(forkId, instance, source.type);
        return { id: forkId, instance };
    }

    /**
     * Discard all resources except those at the ids given.
     * @param {Iterable<string>} keepIds 
     */
    prune(keepIds) {
        const ids = new Set(keepIds);

        this.resources.forEach((_, id) => {
            if (!ids.has(id)) this.resources.delete(id);
        });
    }

    /**
     * Copy all resources from another resource manager.
     * @param {maker.ResourceManager} other 
     */
    async copyFrom(other) {
        const tasks = [];
        Array.from(other.resources).forEach(([id, { type, instance }]) => {
            const task = maker.resourceHandlers[type]
                         .copy(instance)
                         .then((copy) => this.set(id, copy, type));
            tasks.push(task);
        });

        return Promise.all(tasks);
    }

    /**
     * Save all resources in an object mapping id to type and save data.
     * @param {Iterable<string>} ids 
     * @returns {Promise<maker.ResourceBundle>}
     */
    async save(ids) {
        /** @type {maker.ResourceBundle} */
        const bundle = {};

        const resourceIds = new Set(ids);
        const relevant = Array.from(this.resources)
                         .filter(([id]) => resourceIds.has(id));

        const tasks = [];
        Array.from(relevant).forEach(([id, { type, instance }]) => {
            const task = maker.resourceHandlers[type]
                         .save(instance)
                         .then((data) => bundle[id] = { type, data });
            tasks.push(task);
        });

        await Promise.all(tasks);
        return bundle;
    }

    /**
     * Load all resources from the given bundle.
     * @param {maker.ResourceBundle} bundle 
     */
    async load(bundle) {
        const tasks = [];
        Object.entries(bundle).forEach(([id, { type, data }]) => {
            const task = maker.resourceHandlers[type]
                         .load(data)
                         .then((instance) => this.set(id, instance, type));
            tasks.push(task);
        });
        return Promise.all(tasks);
    }
}

/**
 * @template TState
 */
maker.StateManager = class extends EventTarget {
    /** @param {maker.ManifestFunction<TState>} getManifest */
    constructor(getManifest = undefined) {
        super();

        this.getManifest = getManifest || (() => []);
        this.resources = new maker.ResourceManager();

        /** @type {TState[]} */
        this.history = [];
        this.index = -1;
        this.historyLimit = 20;
    }

    /**
     * The present state in history.
     */
    get present() {
        return this.history[this.index];
    }

    /**
     * Is there any edit history to undo to?
     */
    get canUndo() {
        return this.index > 0;
    }

    /**
     * Are there any undone edits to redo?
     */
    get canRedo() {
        return this.index < this.history.length - 1;
    }

    /**
     * Replace all state with the project and resources in the given project
     * bundle.
     * @param {maker.ProjectBundle<TState>} bundle
     */
    async loadBundle(bundle) {
        this.history.length = 0;
        this.history.push(bundle.project);
        this.index = 0;
        this.resources.clear();
        await this.resources.load(bundle.resources);

        this.changed();
    }

    /**
     * Replace all state by copying from another state manager.
     * @param {maker.StateManager<TState>} other 
     */
    async copyFrom(other) {
        this.history = COPY(other.history);
        this.index = other.index;
        this.resources.clear();
        await this.resources.copyFrom(other.resources);
        
        this.changed();
    }
    
    /**
     * Copy the present state and dependent resources into a project bundle.
     * @returns {Promise<maker.ProjectBundle<TState>>}
     */
    async makeBundle() {
        const project = COPY(this.present);
        const resources = await this.resources.save(this.getManifest(this.present));

        return { project, resources };
    }

    /**
     * Save the current state as a checkpoint in history that can be returned to
     * with undo/redo.
     */
    makeCheckpoint() {
        this.history.length = this.index + 1;
        
        const currentData = this.present;

        this.history[this.index] = COPY(currentData);
        this.history.push(currentData);
        
        if (this.index < this.historyLimit) {
            this.index += 1;
        } else {
            // delete earliest history
            this.history.splice(0, 1);
            this.pruneResources();
        }
    }

    /**
     * Dispatch the change event signalling that the present state has been
     * updated.
     */
    changed() {
        this.dispatchEvent(new CustomEvent("change"));
    }

    /**
     * Discard all resources that are no longer required accord to the manifest
     * function.
     */
    pruneResources() {
        this.resources.prune(this.history.flatMap(this.getManifest));
    }

    /**
     * Make a history checkpoint, replace the current state with a forked
     * version via callback, and then dispatch the change event.
     * @param {(data: TState) => Promise} action 
     */
    async makeChange(action) {
        this.makeCheckpoint();
        await action(this.present);
        this.changed();
    }

    /**
     * Revert the state to the previous checkpoint in history.
     */
    undo() {
        if (!this.canUndo) return;
        this.index -= 1;
        this.changed();
    }

    /**
     * Return the state to the most recently undone checkpoint in history.
     */
    redo() {
        if (!this.canRedo) return;
        this.index += 1;
        this.changed();
    }
};

/**
 * Ask the browser to download the given blob as a file with the given name.
 * @param {Blob} blob 
 * @param {string} name
 */
maker.saveAs = function(blob, name) {
    const element = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    element.href = url;
    element.download = name;
    element.click();
    window.URL.revokeObjectURL(url);
};

/**
 * Open the browser file picker, optionally restricted to files of a given file
 * type pattern and optionally accepting multiple files. 
 * @param {string} accept 
 * @param {boolean} multiple 
 * @returns {Promise<File[]>}
 */
 maker.pickFiles = async function(accept = "*", multiple = false) {
    return new Promise((resolve) => {
        const fileInput = html("input", { type: "file", accept, multiple });
        fileInput.addEventListener("change", () => resolve(Array.from(fileInput.files)));
        fileInput.click();
    });
}
