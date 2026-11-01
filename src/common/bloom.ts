import { runAppleScript } from "run-applescript";
import path from "path";

// Bloom's AppleScript vocabulary, from Bloom.sdef:
//   window / tab / pane all expose `selection`, `selected files`, `selected items`
//   (list of file, cocoa key selectedURLs) and `rootPath` (text).
//
// Two Bloom quirks worth knowing:
//   1. AppleScript allows exactly ONE `on error` clause per `try` block. A second
//      clause is a compile error that makes osascript print nothing and exit
//      non-zero, which is indistinguishable from a user cancel.
//   2. Bloom does not implement `count` on an object specifier -- `count of windows`
//      raises -1708. Assigning to a variable first works, so always do that.

export const escapeAppleScriptString = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// Bloom is running and has at least one window open.
export async function isBloomRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      if not (application "Bloom" is running) then return "no"
      tell application "Bloom"
        set ws to windows
        if (count of ws) is 0 then return "nowindow"
      end tell
      return "yes"
    `);
    return result.trim() === "yes";
  } catch (error) {
    console.error("Error checking if Bloom is running:", error);
    return false;
  }
}

// The files currently selected in Bloom's front window. Returns [] when empty.
export async function getBloomSelection(): Promise<string[]> {
  const result = await runAppleScript(`
    if not (application "Bloom" is running) then return "__NOT_RUNNING__"
    tell application "Bloom"
      set sel to {}
      try
        set sel to selection of front window
      on error
        set sel to {}
      end try
    end tell
    if (count of sel) is 0 then return "__EMPTY__"
    set out to {}
    repeat with f in sel
      set raw to missing value
      try
        set raw to contents of f
      on error
        set raw to f
      end try
      set p to missing value
      try
        set p to POSIX path of (raw as alias)
      on error
        try
          set p to POSIX path of raw
        on error
          set p to raw as text
        end try
      end try
      if p is not missing value then set end of out to p
    end repeat
    if (count of out) is 0 then return "__EMPTY__"
    set AppleScript's text item delimiters to linefeed
    return out as text
  `);

  const trimmed = result.trim();
  if (trimmed === "__NOT_RUNNING__") {
    throw new Error("Bloom is not running");
  }
  if (trimmed === "__EMPTY__" || trimmed === "") {
    return [];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((p) => p.replace(/\/$/, ""));
}

// The directory Bloom's front window is showing; falls back to Desktop.
export async function getCurrentBloomDirectory(): Promise<string> {
  const fallback = path.join(process.env.HOME || "/", "Desktop");
  try {
    const result = await runAppleScript(`
      if not (application "Bloom" is running) then return ""
      tell application "Bloom"
        try
          return rootPath of front window
        on error
          return ""
        end try
      end tell
    `);
    const dir = result.trim().replace(/\/$/, "");
    return dir || fallback;
  } catch {
    return fallback;
  }
}

// Reveal an item in Bloom so the user can act on it.
export async function revealInBloom(itemPath: string): Promise<void> {
  try {
    await runAppleScript(`
      if not (application "Bloom" is running) then return
      tell application "Bloom"
        activate
        try
          reveal (POSIX file "${escapeAppleScriptString(itemPath)}")
        on error
          try
            make new tab with url "${escapeAppleScriptString(itemPath)}"
          end try
        end try
      end tell
    `);
  } catch (error) {
    console.error("Error revealing item in Bloom:", error);
  }
}
