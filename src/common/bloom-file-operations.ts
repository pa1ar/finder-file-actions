import path from "path";

import { fsAsync } from "./fs-async";

export type BloomFileOperation = "move" | "copy";

export interface BloomFileOperationResult {
  moved: number;
  copied: number;
  failed: { path: string; error: string }[];
}

// Bloom exposes no scripting verb for moving or duplicating files, so transfers
// go straight through fsAsync. That also means there is no Finder-style undo --
// fsAsync handles same-volume rename, cross-volume copy+delete, and streaming
// for large files, but the caller is responsible for telling the user.
export async function performBloomFileOperation(
  operation: BloomFileOperation,
  sourcePaths: string[],
  destinationPath: string,
  replacing: boolean,
): Promise<BloomFileOperationResult> {
  if (sourcePaths.length === 0) {
    throw new Error("No source files provided");
  }

  const result: BloomFileOperationResult = { moved: 0, copied: 0, failed: [] };

  for (const sourcePath of sourcePaths) {
    const destPath = path.join(destinationPath, path.basename(sourcePath));

    // Never move a folder inside itself.
    if (destPath.startsWith(sourcePath + path.sep)) {
      result.failed.push({ path: sourcePath, error: "Cannot move a folder inside itself" });
      continue;
    }

    const op =
      operation === "move"
        ? await fsAsync.moveFile(sourcePath, destPath, { overwrite: replacing })
        : await fsAsync.copyFile(sourcePath, destPath, { overwrite: replacing });

    if (op.success) {
      if (operation === "move") result.moved++;
      else result.copied++;
    } else {
      result.failed.push({ path: sourcePath, error: op.error?.message ?? "Unknown error" });
    }
  }

  return result;
}
