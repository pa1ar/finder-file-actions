import { getPreferenceValues } from "@raycast/api";
import path from "path";

import { getBloomSelection, getCurrentBloomDirectory, isBloomRunning, revealInBloom } from "./bloom";
import { getCurrentFinderDirectory, isFinderFrontmost, selectInFinder } from "./finder";
import { fsAsync } from "./fs-async";

export type FileManager = "finder" | "bloom";

export interface FileManagerPreferences {
  fileManager?: FileManager;
}

// Which app the commands read their selection and working directory from.
// Defaults to Finder so existing behaviour is unchanged for anyone who never
// opens preferences.
export function getFileManager(): FileManager {
  const preferences = getPreferenceValues<FileManagerPreferences>();
  return preferences.fileManager === "bloom" ? "bloom" : "finder";
}

export function fileManagerLabel(manager: FileManager = getFileManager()): string {
  return manager === "bloom" ? "Bloom" : "Finder";
}

// True when the configured app is running and has a window open.
export async function isFileManagerAvailable(): Promise<boolean> {
  return getFileManager() === "bloom" ? isBloomRunning() : isFinderFrontmost();
}

// The files selected in the configured app.
export async function getSelectedFiles(): Promise<string[]> {
  if (getFileManager() === "bloom") {
    return getBloomSelection();
  }
  // Imported lazily so the Finder path keeps using Raycast's own API.
  const { getSelectedFinderItems } = await import("@raycast/api");
  const items = await getSelectedFinderItems();
  return items.map((item) => item.path);
}

// The directory the configured app is currently showing.
export async function getCurrentDirectory(): Promise<string> {
  return getFileManager() === "bloom" ? getCurrentBloomDirectory() : getCurrentFinderDirectory();
}

// Reveal an item in the configured app.
export async function revealItem(itemPath: string): Promise<void> {
  if (getFileManager() === "bloom") {
    await revealInBloom(itemPath);
    return;
  }
  await selectInFinder(itemPath);
}

// generate a unique name following macOS convention:
// "name", "name 2", "name 3" (skips 1)
export async function generateUniqueName(directory: string, baseName: string, extension?: string): Promise<string> {
  const buildPath = (name: string) => {
    if (extension) {
      return path.join(directory, `${name}.${extension}`);
    }
    return path.join(directory, name);
  };

  const firstPath = buildPath(baseName);
  if (!(await fsAsync.exists(firstPath))) {
    return path.basename(firstPath);
  }

  let counter = 2;
  while (counter < 1000) {
    const candidate = buildPath(`${baseName} ${counter}`);
    if (!(await fsAsync.exists(candidate))) {
      return path.basename(candidate);
    }
    counter++;
  }

  const timestamp = Date.now();
  return path.basename(buildPath(`${baseName} ${timestamp}`));
}
