import { Clipboard, closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import { isFinderFrontmost, getCurrentFinderDirectory, selectInFinder, generateUniqueName } from "./common/finder";
import { fsAsync } from "./common/fs-async";

export default async function CreateTextFile(props: LaunchProps<{ arguments: Arguments.CreateTextFile }>) {
  const rawInput = props.arguments.extension?.trim() || "";
  // parse input: "file.txt" -> name="file", ext="txt"; "md" -> name="untitled", ext="md"; "" -> name="untitled", ext="txt"
  let baseName = "untitled";
  let extension = "txt";
  if (rawInput) {
    const dotIndex = rawInput.lastIndexOf(".");
    if (dotIndex > 0) {
      // user typed a full filename like "file.txt" or "notes.md"
      baseName = rawInput.slice(0, dotIndex);
      extension = rawInput.slice(dotIndex + 1);
    } else {
      // user typed just an extension like "md" or ".md"
      extension = rawInput.replace(/^\./, "");
    }
  }

  const frontmost = await isFinderFrontmost();
  if (!frontmost) {
    await showHUD("Finder is not the active application");
    return;
  }

  const targetDir = await getCurrentFinderDirectory();

  // read clipboard text if available
  let content = "";
  let usedClipboard = false;
  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText && clipboardText.trim().length > 0) {
      content = clipboardText;
      usedClipboard = true;
    }
  } catch {
    // clipboard read failed, create empty file
  }

  // generate unique filename
  const uniqueName = await generateUniqueName(targetDir, baseName, extension);
  const filePath = path.join(targetDir, uniqueName);

  // write the file
  const result = await fsAsync.writeFile(filePath, content);
  if (!result.success) {
    await showHUD(`Failed to create file: ${result.error?.message || "unknown error"}`);
    return;
  }

  if (usedClipboard) {
    await showHUD(`Created "${uniqueName}" with clipboard content`);
  } else {
    await showHUD(`Created "${uniqueName}"`);
  }

  await selectInFinder(filePath);
  await closeMainWindow();
}
