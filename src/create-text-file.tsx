import { Clipboard, closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import {
  fileManagerLabel,
  generateUniqueName,
  getCurrentDirectory,
  isFileManagerAvailable,
  revealItem,
} from "./common/file-manager";
import { fsAsync } from "./common/fs-async";
import { parseTextFileName } from "./common/text-file-name";

export default async function CreateTextFile(props: LaunchProps<{ arguments: Arguments.CreateTextFile }>) {
  const { baseName, extension } = parseTextFileName(props.arguments.filename);

  const available = await isFileManagerAvailable();
  if (!available) {
    await showHUD(`${fileManagerLabel()} is not the active application`);
    return;
  }

  const targetDir = await getCurrentDirectory();

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

  await revealItem(filePath);
  await closeMainWindow();
}
