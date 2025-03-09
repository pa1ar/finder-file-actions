# Finder File Actions

A Raycast extension that provides various actions for files selected in Finder.

## Commands

### Move to Folder

Quickly move or copy selected files in Finder to a destination folder of your choice. Alfred users will be familiar with this functionality.

#### Features

- Move or copy one or more files selected in Finder to any folder
- Fast and reliable folder search using macOS Spotlight (`mdfind`)
- Optimized search queries for better performance and relevance
- Smart sorting of search results based on relevance and recency
- Recently used folders for quick access
- Folder navigation with keyboard shortcuts
- Visual feedback for successful/failed operations
- Metadata display (last used date, modification date, file type)

#### Usage

1. Select one or more files in Finder
2. Trigger the "Move to Folder" command in Raycast
3. Search for your destination folder or navigate through directories
4. Press Enter to navigate to a folder, Cmd+Return to move files, or Cmd+Shift+Return to copy files

#### Keyboard Shortcuts

- `Enter`: Navigate to the selected folder
- `Cmd+Return`: Move files to the selected folder
- `Cmd+Shift+Return`: Copy files to the selected folder
- `Cmd+Shift+D`: Toggle details view

## Requirements

- macOS
- Raycast

## Implementation Details

This extension uses macOS Spotlight (mdfind) for fast and reliable folder search. Key features include:

- Efficient mdfind queries with proper escaping of special characters
- Comprehensive metadata retrieval for better sorting and display
- Smart caching of search results and recently used folders
- Relevance-based sorting of search results
- Automatic updating of recent folders after successful file operations

## Plugins

You can add your own custom `AppleScript` plugins to this extension. These appear as actions, under the sub-heading 'Plugins'.

The steps are as follows:

* Configure the extension via Raycast
    * Ensure the `Plugins Enabled` option is checked
    * Populate `Plugins Folder (Absolute Path)` with a valid **absolute** path to where you plugins reside
        * e.g: `/Users/YourUsername/Documents/FinderFileActionsPlugins`

* Create one or more plugins with the following schema (they are just `.js` files):

### e.g. Plugin Path

```
/Users/YourUsername/Documents/FinderFileActionsPlugins/custom-action.js
```

### e.g. Plugin file contents (custom-action.js)

```js
// note the export name!
exports.FolderSearchPlugin = {
  // the title of the action as shown
  // in the Actions Menu in Raycast.
  title: 'Custom Action',

  // the desired keyboard shortcut in the same
  // format as with Raycast's API but with only
  // single braces: `{` and `}`.
  shortcut: { modifiers: ["cmd", "shift"], key: 'a' },

  // the `Icon` name without the Icon enum prefix.
  icon: 'Link',

  // a function which takes the result that was selected at the time of execution and returns a valid AppleScript. This AppleScript is what gets executed.
  appleScript: (result) => {
    return `do shell script "open ${result.path}"`
  }
}
```

For reference, the `result` argument passed into the `appleScript` function is as follows (based on mdfind properties)

```js
{
  path: '/Users/YourUsername/Documents',
  kMDItemFSName: 'Documents',
  kMDItemFSCreationDate: '2022-04-22T20:42:52.000Z',
  kMDItemContentModificationDate: '2023-07-08T15:44:01.000Z',
  kMDItemKind: 'Folder',
  kMDItemLastUsedDate: '2023-09-14T10:09:45.000Z'
}
```

You will likely only need/use the `path` property.

## Credits

This extension is based on the [Folder Search](https://www.raycast.com/GastroGeek/folder-search) extension originally created by [GastroGeek](https://www.raycast.com/GastroGeek). The folder searching functionality and plugin system were adapted from the original extension, while adding new capabilities for file operations.