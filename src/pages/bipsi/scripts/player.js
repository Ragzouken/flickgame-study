const CONT_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAADNJREFUCJmNzrENACAMA0E/++/8NAhRBEg6yyc5SePUoNqwDICnWP04ww1tWOHfUqqf1UwGcw4T9WFhtgAAAABJRU5ErkJggg==";
const STOP_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAACJJREFUCJljZICC/////2fAAhgZGRn////PwIRNEhsYCgoBIkQHCf7H+yAAAAAASUVORK5CYII="

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
 * @param {string} id 
 */
function eventById(data, id) {
    return allEvents(data).find((event) => event.id === id);
}

/**
 * @param {BipsiDataProject} data 
 * @param {BipsiDataEvent} event 
 */
function roomFromEvent(data, event) {
    return data.rooms.find((room) => room.events.includes(event));
}

bipsi.Player = class extends EventTarget {
    constructor(font) {
        super();
        // home for data of the project we're playing
        this.stateManager = new maker.StateManager(bipsi.getManifest);
        // final composite of any graphics
        this.rendering = createRendering2D(256, 256);

        this.dialoguePlayer = new DialoguePlayer(font);

        this.ready = false;
        this.frameCount = 0;
    }

    async init() {
        await this.dialoguePlayer.load();
    }

    /** @type {BipsiDataProject} */
    get data() {
        return this.stateManager.present;
    }

    /**
     * @param {maker.StateManager<BipsiDataProject>} stateManager 
     */
    async copyFrom(stateManager) {
        this.clear();
        await this.stateManager.copyFrom(stateManager);
        this.start();
    }

    /**
     * @param {maker.ProjectBundle<BipsiDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.clear();
        await this.stateManager.loadBundle(bundle);
        this.start();
    }

    start() {
        const avatar = allEvents(this.data).find((event) => eventIsTagged(event, "is-player"));
        this.avatarId = avatar.id;
        this.ready = true;

        const title = oneField(avatar, "game-title", "dialogue")?.data;
        if (title) this.dialoguePlayer.queueScript(title);

        console.log("TITLE?", title)
    }

    clear() {
        this.ready = false;
        this.dialoguePlayer.restart();
    }

    update(dt) {
        if (!this.ready) return;

        this.dialoguePlayer.update(dt);
        this.render();
    }

    render() {
        if (!this.ready) return;

        const avatar = eventById(this.data, this.avatarId);
        const room = roomFromEvent(this.data, avatar);
        const palette = this.data.palettes[room.palette];
        const [background, foreground, highlight] = palette;

        const frame = this.frameCount % this.data.tilesets.length;
        const tileset = this.stateManager.resources.get(this.data.tilesets[frame]);

        const tilesets = {
            foreground: recolorMask(tileset, foreground),
            highlight: recolorMask(tileset, highlight),
        }

        fillRendering2D(TEMP_128, background);
        drawTilemap(TEMP_128, tilesets.foreground, room.tilemap, background);
        drawTilemap(TEMP_128, tilesets.highlight, room.highmap, background);
        drawEvents(TEMP_128, tilesets.highlight, room.events, background);

        this.rendering.drawImage(TEMP_128.canvas, 0, 0, 256, 256);

        // render dialogue box if necessary
        if (this.dialoguePlayer.active) {
            let { width, height } = this.dialoguePlayer.dialogueRendering.canvas;
            
            const x = 24;
            const y = 256 - 38 - 24;

            this.dialoguePlayer.render();
            this.rendering.drawImage(this.dialoguePlayer.dialogueRendering.canvas, x, y, width, height);
        }

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    move(dx, dy) {
        if (this.dialoguePlayer.active) {
            this.dialoguePlayer.skip();
            return;
        } 

        const avatar = eventById(this.data, this.avatarId);
        const room = roomFromEvent(this.data, avatar);

        const [px, py] = avatar.position;
        const [tx, ty] = [px+dx, py+dy];

        const redirected = this.touch(tx, ty);
        const blocked = cellIsSolid(room, tx, ty);
        const confined = tx < 0 || tx >= 16 || ty < 0 || ty >= 16;

        if (!redirected && !blocked && !confined) {
            avatar.position = [tx, ty];
        }
    }

    touch(x, y) {
        const avatar = eventById(this.data, this.avatarId);
        const room = roomFromEvent(this.data, avatar);

        const [event] = getEventsAt(room.events, x, y);
        if (!event) return;

        // test
        const say = oneField(event, "say", "dialogue")?.data;
        const exit = oneField(event, "exit", "location")?.data;
        const once = eventIsTagged(event, "one-time");
        const ending = oneField(event, "ending", "dialogue")?.data;

        if (say !== undefined) {
            this.dialoguePlayer.queueScript(say);
        }

        if (exit !== undefined) {
            const nextRoom = this.data.rooms[exit.room];
            arrayDiscard(room.events, avatar);
            nextRoom.events.push(avatar);
            avatar.position = [...exit.position];
        }

        if (once) {
            arrayDiscard(roomFromEvent(this.data, event).events, event);
        }

        if (ending !== undefined) {
            this.dialoguePlayer.queueScript(ending);
        }

        return exit !== undefined;
    }
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
        this.setPage(nextPage);
    }

    queueScript(script) {
        const pages = scriptToPages(script, { font: this.font, lineWidth: 208, lineCount: 2 });
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
        });
    }
}
