async function start() {
    // init player and editor
    const player = await makePlayer();
    const editor = await makeEditor();

    // setup play/edit buttons to switch between modes
    const play = ui.action("play", startPlaytest);
    const edit = ui.action("edit", startEditing);

    function showPlayer() {
        ONE("#player").hidden = false;
        ONE("#editor").hidden = true;
        player.show();
    }

    function showEditor() {
        ONE("#player").hidden = true;
        ONE("#editor").hidden = false;
        editor.show();
    }

    async function startPlaytest() {
        await player.copyFrom(editor.stateManager);
        showPlayer();
    }

    async function startEditing() {
        if (!editor.stateManager.present) {
            await editor.stateManager.copyFrom(player.stateManager);
        }
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
