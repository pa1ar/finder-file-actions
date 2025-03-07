# Move to Folder

A Raycast extension that allows you to quickly move selected files in Finder to a destination folder of your choice.

## Features

- Move one or more files selected in Finder to any folder
- Fast and reliable folder search using macOS Spotlight (mdfind)
- Optimized search queries for better performance and relevance
- Smart sorting of search results based on relevance and recency
- Recently used folders for quick access
- Folder navigation with keyboard shortcuts
- Visual feedback for successful/failed operations
- Metadata display (last used date, modification date, file type)

## Usage

1. Select one or more files in Finder
2. Trigger the "Move to Folder" command in Raycast
3. Search for your destination folder or navigate through directories
4. Press ⌘+Enter to navigate to a folder or ⌘+M to move files to the selected destination

## Keyboard Shortcuts

- `⌘+Enter`: Navigate to the selected folder
- `⌘+M`: Move files to the selected folder

## Requirements

- macOS
- Raycast

## Implementation Details

This extension uses macOS Spotlight (mdfind) for fast and reliable folder search. Key features include:

- Efficient mdfind queries with proper escaping of special characters
- Comprehensive metadata retrieval for better sorting and display
- Smart caching of search results and recently used folders
- Relevance-based sorting of search results
- Automatic updating of recent folders after successful file moves

## Plugins

You can add your own custom `AppleScript` plugins to this extension. These appear as actions, under the sub-heading 'Plugins'.

The steps are as follows:

* Configure the extension via Raycast
    * Ensure the `Plugins Enabled` option is checked
    * Populate `Plugins Folder (Absolute Path)` with a valid **absolute** path to where you plugins reside
        * e.g: `/Users/YourUsername/Documents/MoveToFolderPlugins`

* Create one or more plugins with the following schema (they are just `.js` files):

### e.g. Plugin Path

```
/Users/YourUsername/Documents/MoveToFolderPlugins/custom-action.js
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