async function start() {
    // init player and editor
    const player = await makePlayer();
    const editor = await makeEditor();

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", playFromEditor);
    const edit = ui.action("edit", editFromPlayer);

    const playerContainer = ONE("#player");
    const editorContainer = ONE("#editor");

    function showPlayer() {
        playerContainer.hidden = false;
        editorContainer.hidden = true;
        player.enter();
    }

    function showEditor() {
        playerContainer.hidden = true;
        editorContainer.hidden = false;
        editor.enter();
    }

    async function playFromEditor() {
        await player.copyFrom(editor.stateManager);
        showPlayer();
    }

    async function editFromPlayer() {
        await editor.stateManager.copyFrom(player.stateManager);
        showEditor();
    }

    // determine if there is a project bundle embedded in this page
    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        // embedded project, load it in the player
        editor.helpContainer.hidden = false;
        await player.loadBundle(bundle);
        showPlayer();
    } else {
        // no embedded project, start editor blank
        await editor.resetProject();
        showEditor();
    }
}
