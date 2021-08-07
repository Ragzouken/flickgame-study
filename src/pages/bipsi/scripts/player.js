const CONT_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAADNJREFUCJmNzrENACAMA0E/++/8NAhRBEg6yyc5SePUoNqwDICnWP04ww1tWOHfUqqf1UwGcw4T9WFhtgAAAABJRU5ErkJggg==";
const STOP_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAACJJREFUCJljZICC/////2fAAhgZGRn////PwIRNEhsYCgoBIkQHCf7H+yAAAAAASUVORK5CYII="

// async equivalent of Function constructor
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

/**
 * @param {BipsiDataEvent} event 
 * @param {string} key 
 */
function eventIsTagged(event, key) {
    return oneField(event, key, "tag") !== undefined;
}

/**
 * @param {BipsiDataRoom} room
 * @param {number} x 
 * @param {number} y 
 */
function cellIsSolid(room, x, y) {
    const wall = room.wallmap[y][x] > 0;
    const solid = getEventsAt(room.events, x, y).some((event) => eventIsTagged(event, "solid"));
    return solid || wall;
}

/**
 * 
 * @param {BipsiDataEvent} event 
 * @param {string} name 
 * @param {string} type 
 */
function allFields(event, name, type=undefined) {
    return event.fields.filter((field) => field.key === name && field.type === (type ?? field.type));
}

/**
 * 
 * @param {BipsiDataEvent} event 
 * @param {string} name 
 * @param {string} type 
 */
 function oneField(event, name, type=undefined) {
    return event.fields.find((field) => field.key === name && field.type === (type ?? field.type));
}

/**
 * @param {BipsiDataProject} data 
 */
function allEvents(data) {
    return data.rooms.flatMap((room) => room.events);
}

/**
 * @param {BipsiDataProject} data 
 * @param {BipsiDataEvent} event 
 */
function roomFromEvent(data, event) {
    return data.rooms.find((room) => room.events.includes(event));
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * @param {EventTarget} target 
 * @param {string} event 
 * @returns 
 */
async function wait(target, event) {
    return new Promise((resolve) => {
        target.addEventListener(event, resolve, { once: true });
    });
}

bipsi.Player = class extends EventTarget {
    constructor(font) {
        super();
        // home for data of the project we're playing
        this.stateManager = new maker.StateManager(bipsi.getManifest);
        this.stateBackup = new maker.StateManager(bipsi.getManifest);
        // final composite of any graphics
        this.rendering = createRendering2D(256, 256);

        this.dialoguePlayer = new DialoguePlayer(font);

        this.time = 0;
        this.ready = false;
        this.title = false;
        this.frameCount = 0;
        this.busy = false;

        // an awaitable that generates a new promise that resolves once no dialogue is active
        /** @type {PromiseLike<void>} */
        this.dialogueWaiter = {
            then: (resolve, reject) => {
                if (!this.dialoguePlayer.active) {
                    resolve();
                } else {
                    return wait(this.dialoguePlayer, "done").then(resolve, reject);
                }
            },
        };
    }

    async init() {
        await this.dialoguePlayer.load();
    }

    /** @type {BipsiDataProject} */
    get data() {
        return this.stateManager.present;
    }

    async backup() {
        this.stateBackup.copyFrom(this.stateManager);
    }

    /**
     * @param {maker.StateManager<BipsiDataProject>} stateManager 
     */
    async copyFrom(stateManager) {
        this.clear();
        await this.stateManager.copyFrom(stateManager);
        await this.backup();
        this.start();
    }

    /**
     * @param {maker.ProjectBundle<BipsiDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.clear();
        await this.stateManager.loadBundle(bundle);
        await this.backup();
        this.start();
    }

    async restart() {
        this.clear();
        await this.stateManager.copyFrom(this.stateBackup);
        this.start();
    }

    async start() {
        const avatar = allEvents(this.data).find((event) => eventIsTagged(event, "is-player"));
        if (avatar === undefined) {
            this.dialoguePlayer.queueScript("[ COULDN'T FIND PLAYER EVENT ]");
            return;
        }

        this.avatarId = avatar.id;
        this.ready = true;

        const room = roomFromEvent(this.data, avatar);
        arrayDiscard(room.events, avatar);
        room.events.push(avatar);

        const title = oneField(avatar, "game-title", "dialogue")?.data;
        if (title) {
            this.title = true;
            this.dialoguePlayer.queueScript(title);
            await this.dialogueWaiter;
            this.title = false;
        }
    }

    clear() {
        this.ready = false;
        this.dialoguePlayer.restart();
    }

    update(dt) {
        if (!this.ready) return;

        this.time += dt;
        while (this.time >= .400) {
            this.frameCount += 1;
            this.time -= .4;
        }

        this.dialoguePlayer.update(dt);
        this.render();
    }

    render() {
        if (!this.ready) return;

        const avatar = getEventById(this.data, this.avatarId);
        const room = roomFromEvent(this.data, avatar);
        const palette = this.data.palettes[room.palette];
        const [background, foreground, highlight] = palette;

        const tileset = this.stateManager.resources.get(this.data.tileset);
        const tilesetFG = recolorMask(tileset, foreground, TEMP_TILESET0);
        const tilesetHI = recolorMask(tileset, highlight, TEMP_TILESET1);

        fillRendering2D(TEMP_128, background);

        if (!this.title) {
            const frame = this.frameCount % 2;
            const tileToFrame = makeTileToFrameMap(this.data.tiles, frame);

            drawTilemap(TEMP_128, tilesetFG, tileToFrame, room.tilemap, background);
            drawTilemap(TEMP_128, tilesetHI, tileToFrame, room.highmap, background);
            drawEvents(TEMP_128, tilesetHI, tileToFrame, room.events, background);
        }

        this.rendering.drawImage(TEMP_128.canvas, 0, 0, 256, 256);

        // render dialogue box if necessary
        if (this.dialoguePlayer.active) {
            const t = 24;
            const m = 109;
            const b = 194;

            const top = avatar.position[1] >= 8;

            const x = 24;
            const y = this.title ? m : top ? t : b;

            this.dialoguePlayer.render();
            this.rendering.drawImage(this.dialoguePlayer.dialogueRendering.canvas, x, y);
        }

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    async proceed() {
        if (!this.ready) return;

        if (this.dialoguePlayer.active) {
            this.dialoguePlayer.skip();
        } 
    }

    async move(dx, dy) {
        if (!this.ready || this.dialoguePlayer.active || this.busy) return;

        this.busy = true;

        const avatar = getEventById(this.data, this.avatarId);
        const room = roomFromEvent(this.data, avatar);

        const [px, py] = avatar.position;
        const [tx, ty] = [px+dx, py+dy];

        const blocked = cellIsSolid(room, tx, ty);
        const confined = tx < 0 || tx >= 16 || ty < 0 || ty >= 16;

        if (!blocked && !confined) avatar.position = [tx, ty];

        const [fx, fy] = avatar.position;
        const [event0] = getEventsAt(room.events, tx, ty, avatar);
        const [event1] = getEventsAt(room.events, fx, fy, avatar);
        const event = event0 ?? event1;

        if (event) await this.touch(event);

        this.busy = false;
    }

    async touch(event) {
        const touch = oneField(event, "touch", "javascript")?.data;

        if (touch !== undefined) {
            const defines = generateScriptingDefines(this, event);
            const names = Object.keys(defines).join(", ");
            const preamble = `const { ${names} } = COMMANDS;\n`;

            try {
                const script = new AsyncFunction("COMMANDS", preamble + touch);
                await script(defines);
            } catch (e) {
                const error = `SCRIPT ERROR:\n${e}`;
                console.log(error);
                this.dialoguePlayer.queueScript(error);
                await this.dialogueWaiter;
            }
        } else {
            return standardEventTouch(this, event);
        }
    }
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
async function standardEventTouch(player, event) {
    await runEventDialogue(player, event);
    await runEventExit(player, event);
    await runEventRemove(player, event);
    await runEventEnding(player, event);
    await runEventMisc(player, event);
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
async function runEventDialogue(player, event) {
    const says = allFields(event, "say", "dialogue");
    const sayMode = oneField(event, "say-mode", "text")?.data;
    
    if (event.says === undefined) {
        event.says = says.map((say) => say.data);
        event.sayProgress = 0;
        if (sayMode === "shuffle") shuffleArray(event.says);
    }

    if (event.says.length > 0) {
        event.sayProgress = event.sayProgress ?? 0;
        const say = event.says[event.sayProgress];
        player.dialoguePlayer.queueScript(say);
        event.sayProgress += 1;

        if (event.sayProgress >= event.says.length) {
            if (sayMode === "shuffle" || sayMode === "cycle") {
                event.says = undefined;
            } else {
                event.sayProgress = event.says.length - 1;
            }
        }
    }

    return player.dialogueWaiter;
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
async function runEventExit(player, event) {
    const avatar = getEventById(player.data, player.avatarId);
    const room = roomFromEvent(player.data, avatar);
    const exit = oneField(event, "exit", "location")?.data;

    if (exit !== undefined) {
        const nextRoom = player.data.rooms[exit.room];
        arrayDiscard(room.events, avatar);
        nextRoom.events.push(avatar);
        avatar.position = [...exit.position];
    }
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
async function runEventRemove(player, event) {
    if (eventIsTagged(event, "one-time")) {
        arrayDiscard(roomFromEvent(player.data, event).events, event);
    }
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
 async function runEventEnding(player, event) {
    const ending = oneField(event, "ending", "dialogue")?.data;

    if (ending !== undefined) {
        player.title = true;
        player.dialoguePlayer.queueScript(ending);
        await player.dialogueWaiter;
        player.title = false; 
        player.restart();
    }
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 * @returns {Promise}
 */
 async function runEventMisc(player, event) {
    const setAvatar = oneField(event, "set-avatar", "tile")?.data;
    const avatar = getEventById(player.data, player.avatarId);

    if (setAvatar !== undefined) {
        replaceFields(avatar, "graphic", "tile", setAvatar);
    }
}

function fakedownToTag(text, fd, tag) {
    const pattern = new RegExp(`${fd}([^${fd}]+)${fd}`, 'g');
    return text.replace(pattern, `{+${tag}}$1{-${tag}}`);
}

function parseFakedown(text) {
    text = fakedownToTag(text, '##', 'shk');
    text = fakedownToTag(text, '~~', 'wvy');
    text = fakedownToTag(text, '==', 'rbw');
    text = fakedownToTag(text, '__', 'r');
    return text;
}

class DialoguePlayer extends EventTarget {
    get active() {
        return this.currentPage !== undefined;
    }

    get currentGlyph() {
        return this.currentPage ? this.currentPage[this.showGlyphCount] : undefined;
    } 

    constructor(font) {
        super();
        this.font = font;
        this.dialogueRendering = createRendering2D(8, 8);
        this.restart();
    }

    async load() {
        this.contIcon = await loadImage(CONT_ICON_DATA);
        this.stopIcon = await loadImage(STOP_ICON_DATA);
    }

    restart() {
        this.showCharTime = .05;
        /** @type {BlitsyPage[]} */
        this.queuedPages = [];
        this.pagesSeen = 0;

        this.setPage(undefined);
    }

    /** @param {BlitsyPage} page */
    setPage(page) {
        this.currentPage = page;
        this.pageTime = 0;
        this.showGlyphCount = 0;
        this.showGlyphElapsed = 0;
        this.pageGlyphCount = page ? page.length : 0;

        if (page !== undefined) {
            this.dispatchEvent(new CustomEvent("next-page", { detail: page }));
        } else {
            this.dispatchEvent(new CustomEvent("done"));
        }
    }

    /** @param {number} dt */
    update(dt) {
        if (!this.active) return;

        this.pageTime += dt;
        this.showGlyphElapsed += dt;

        this.applyStyle();

        while (this.showGlyphElapsed > this.showCharTime && this.showGlyphCount < this.pageGlyphCount) {
            this.showGlyphElapsed -= this.showCharTime;
            this.revealNextChar();
            this.applyStyle();
        }
    }

    render() {
        const padding = 8;
        const lines = 2;
        const height = ((lines + 1) * 4) + this.font.lineHeight * lines + 15;
        const width = 208;

        resizeRendering2D(this.dialogueRendering, width, height);
        fillRendering2D(this.dialogueRendering, "#000000");
        const render = renderPage(this.currentPage, width, height, padding, padding);
        this.dialogueRendering.drawImage(render.canvas, 0, 0);

        if (this.showGlyphCount === this.pageGlyphCount) {
            const prompt = this.queuedPages.length > 0 
                         ? this.contIcon 
                         : this.stopIcon;
            this.dialogueRendering.drawImage(prompt, width-padding-prompt.width, height-4-prompt.height);
        }
    }

    revealNextChar() {
        this.showGlyphCount = Math.min(this.showGlyphCount + 1, this.pageGlyphCount);
        
        if (!this.currentPage) return;

        this.currentPage.forEach((glyph, i) => {
            if (i < this.showGlyphCount) glyph.hidden = false;
        });
    }

    revealAll() {
        if (!this.currentPage) return;

        this.showGlyphCount = this.currentPage.length;
        this.revealNextChar();
    }

    cancel() {
        this.queuedPages.length = 0;
        this.currentPage = undefined;
    }

    skip() {
        if (this.showGlyphCount === this.pageGlyphCount) {
            this.moveToNextPage();
        } else {
            this.showGlyphCount = this.pageGlyphCount;

            if (this.currentPage)
                this.currentPage.forEach((glyph) => glyph.hidden = false);
        }
    }

    moveToNextPage() {
        const nextPage = this.queuedPages.shift();
        this.pagesSeen += 1;
        this.setPage(nextPage);
    }

    queueScript(script) {
        script = parseFakedown(script);
        const pages = scriptToPages(script, { font: this.font, lineWidth: 192, lineCount: 2 });
        this.queuedPages.push(...pages);
        
        if (!this.currentPage)
            this.moveToNextPage();
    
        const last = pages[pages.length - 1];
        return new Promise((resolve) => {
            const onNextPage = (event) => {
                const page = event.detail;
                if (page !== last && !this.queuedPages.includes(last)) {
                    this.removeEventListener("next-page", onNextPage);
                    resolve();
                }
            };

            this.addEventListener("next-page", onNextPage);
        });
    }

    applyStyle() {
        if (!this.currentPage) return;

        if (this.currentGlyph) {
            if (this.currentGlyph.styles.has("delay")) {
                this.showCharTime = parseFloat(this.currentGlyph.styles.get("delay"));
            } else {
                this.showCharTime = .05;
            }
        }

        this.currentPage.forEach((glyph, i) => {
            if (glyph.styles.has("r"))
                glyph.hidden = false;
            if (glyph.styles.has("clr"))
                glyph.fillStyle = glyph.styles.get("clr");
            if (glyph.styles.has("shk")) 
                glyph.offset = { x: getRandomInt(-1, 2), y: getRandomInt(-1, 2) };
            if (glyph.styles.has("wvy"))
                glyph.offset.y = (Math.sin(i + this.pageTime * 5) * 3) | 0;
            if (glyph.styles.has("rbw")) {
                const h = Math.abs(Math.sin(performance.now() / 600 - i / 8));
                glyph.fillStyle = rgbToHex(HSVToRGB({ h, s: 1, v: 1 }));
            }
        });
    }
}

/**
 * @param {BipsiDataEvent} event 
 * @param {string} name 
 * @param {string?} type 
 */
function clearFields(event, name, type=undefined) {
    const fields = allFields(event, name, type);
    fields.forEach((field) => arrayDiscard(event.fields, field));
}

/**
 * @param {BipsiDataEvent} event 
 * @param {string} name 
 * @param {string} type 
 * @param {any[]} values
 */
function replaceFields(event, name, type, ...values) {
    clearFields(event, name, type);
    values.forEach((value) => {
        event.fields.push({
            key: name,
            type,
            data: value,
        });
    });
}

/**
 * @param {bipsi.Player} player 
 * @param {BipsiDataEvent} event 
 */
function generateScriptingDefines(player, event) {
    // edit here to add new scripting functions
    const defines = {};
    
    defines.PLAYER = player;
    defines.AVATAR = getEventById(player.data, player.avatarId);
    defines.EVENT = event;

    defines.SET_FIELDS = (event, name, type, ...values) => replaceFields(event, name, type, ...values);

    defines.FIELD = (event, name, type=undefined) => oneField(event, name, type)?.data;
    defines.FIELDS = (event, name, type=undefined) => allFields(event, name, type).map((field) => field.data);

    defines.LOG = (text) => console.log(text);
    defines.SAY = async (dialogue) => player.dialoguePlayer.queueScript(dialogue);
    defines.DELAY = async (seconds) => sleep(seconds * 1000);
    defines.DIALOGUE = player.dialogueWaiter;
    defines.DIALOG = defines.DIALOGUE;

    return defines;
}
