import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import path from "path";

import {
  fileManagerLabel,
  generateUniqueName,
  getCurrentDirectory,
  isFileManagerAvailable,
  revealItem,
} from "./common/file-manager";
import { fsAsync } from "./common/fs-async";

export default async function CreateFolder(props: LaunchProps<{ arguments: Arguments.CreateFolder }>) {
  const folderName = props.arguments.folderName?.trim() || "untitled folder";

  const available = await isFileManagerAvailable();
  if (!available) {
    await showHUD(`${fileManagerLabel()} is not the active application`);
    return;
  }

  const targetDir = await getCurrentDirectory();
  const uniqueName = await generateUniqueName(targetDir, folderName);
  const newFolderPath = path.join(targetDir, uniqueName);

  const result = await fsAsync.createDirectory(newFolderPath);
  if (!result.success) {
    await showHUD(`Failed to create folder: ${result.error?.message || "unknown error"}`);
    return;
  }

  await showHUD(`Created "${uniqueName}"`);
  await revealItem(newFolderPath);
  await closeMainWindow();
}
