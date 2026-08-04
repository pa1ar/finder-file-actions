# Finder File Actions Changelog

## [New commands, native undo, search fixes] - {PR_MERGE_DATE}

- Added "Create Folder" command that creates a new folder in the current Finder directory
- Added "Wrap in Folder" command that creates a new folder and moves the selected Finder files into it
- Added "Create Text File" command that creates a text file with an optional filename, auto-filling it with clipboard text when available
- Fixed "Create Text File" treating a typed filename as an extension and creating names such as `untitled.notes`
- Added Finder-native undo for Move to Folder and Copy to Folder
- Fixed folder search hanging in an endless loop caused by an inline callback in the `usePromise` deps array; `searchSpotlight` now returns `Promise<SpotlightSearchResult[]>` and results are consumed via `onData`, keeping deps stable
- Removed on-demand `osascript` calls during search that hit `spawn osascript EAGAIN` under fast typing; Spotlight alone surfaces system folders naturally
- Fixed "Copy to Folder" failing when "Move to Folder" command is disabled
- Fixed large same-volume moves falling back to slow streamed copy instead of instant rename
- Fixed unhandled read stream errors during large file copies
- Fixed deleted/renamed pinned folders staying stale until 24h cache expires
- Refreshed all command icons
- Updated @raycast/api to 1.104.24 and @raycast/utils to 2.2.7

## [Initial Version] - 2025-04-02
