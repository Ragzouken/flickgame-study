/**
 * @param {BipsiDataEvent} event 
 * @param {string} key 
 */
function eventIsTagged(event, key) {
    return event.fields.findIndex((field) => field.type === "tag" && field.key === key) >= 0;
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

bipsi.Player = class extends EventTarget {
    constructor() {
        super();
        // home for data of the project we're playing
        this.stateManager = new maker.StateManager(bipsi.getManifest);
        // final composite of any graphics
        this.rendering = createRendering2D(256, 256);

        this.ready = false;
        this.frameCount = 0;
    }

    /** @type {BipsiDataProject} */
    get data() {
        return this.stateManager.present;
    }

    /**
     * @param {maker.StateManager<BipsiDataProject>} stateManager 
     */
    async copyFrom(stateManager) {
        this.ready = false;
        await this.stateManager.copyFrom(stateManager);
        this.reset();
    }

    /**
     * @param {maker.ProjectBundle<BipsiDataProject>} bundle
     */
    async loadBundle(bundle) {
        this.ready = false;
        await this.stateManager.loadBundle(bundle);
        this.reset();
    }

    reset() {
        this.data.rooms.forEach((room, roomIndex) => {
            room.events.forEach((event, eventIndex) => {
                if (eventIsTagged(event, "is-player")) {
                    this.avatar = { roomIndex, eventIndex };
                }
            });
        });
        this.ready = true;
    }

    render() {
        if (!this.ready) return;

        const frame = this.frameCount % this.data.tilesets.length;
        const tileset = this.stateManager.resources.get(this.data.tilesets[frame]);
        const room = this.data.rooms[this.avatar.roomIndex];
        const palette = this.data.palettes[room.palette];
        const [background, foreground, highlight] = palette;

        const tilesets = {
            foreground: recolorMask(tileset, foreground),
            highlight: recolorMask(tileset, highlight),
        }

        fillRendering2D(TEMP_128, background);
        drawTilemap(TEMP_128, tilesets.foreground, room.tilemap, background);
        drawTilemap(TEMP_128, tilesets.highlight, room.highmap, background);
        drawEvents(TEMP_128, tilesets.highlight, room.events, background);

        this.rendering.drawImage(TEMP_128.canvas, 0, 0, 256, 256);

        // signal, to anyone listening, that rendering happened
        this.dispatchEvent(new CustomEvent("render"));
    }

    move(dx, dy) {
        const room = this.data.rooms[this.avatar.roomIndex];
        const avatar = room.events[this.avatar.eventIndex];

        const [px, py] = avatar.position;
        const [tx, ty] = [px+dx, py+dy];

        const redirected = this.touch(tx, ty);
        const blocked = cellIsSolid(room, tx, ty);
        const confined = tx < 0 || tx >= 16 || ty < 0 || ty >= 16;

        if (!redirected && !blocked && !confined) {
            avatar.position = [tx, ty];
        }

        this.render();
    }

    touch(x, y) {
        const room = this.data.rooms[this.avatar.roomIndex];
        const [event] = getEventsAt(room.events, x, y);
        if (!event) return;

        // test
        const exit = oneField(event, "exit", "location")?.data;
        const once = eventIsTagged(event, "one-time");
        // TODO: need event ids otherwise avatar event index will be fucked...

        if (exit) {
            const avatar = room.events[this.avatar.eventIndex];
            const nextRoom = this.data.rooms[exit.room];
            arrayDiscard(room.events, avatar);
            nextRoom.events.push(avatar);
            this.avatar.eventIndex = nextRoom.events.indexOf(avatar);
            this.avatar.roomIndex = exit.room;
            avatar.position = [...exit.position];
            return true;
        }
    }
}
