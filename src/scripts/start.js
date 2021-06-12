async function start() {
    const player = await makePlayer();
    const editor = await makeEditor();

    const play = ui.action("play", startPlaytest);
    const edit = ui.action("edit", startEditing);

    function showPlayer() {
        ONE("#player").hidden = false;
        ONE("#editor").hidden = true;
        player.render();
    }

    function showEditor() {
        ONE("#player").hidden = true;
        ONE("#editor").hidden = false;
        editor.resetSelections();
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

    const bundle = maker.bundleFromHTML(document);

    if (bundle) {
        editor.helpContainer.hidden = false;
        await player.loadBundle(bundle);
        showPlayer();
    } else {
        await editor.resetProject();
        showEditor();
    }
}
