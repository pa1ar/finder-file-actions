import fs from "fs-extra";
import path from "path";
import os from "os";

export const createTestDirectory = async () => {
  const testDir = path.join(os.tmpdir(), `raycast-test-${Date.now()}`);
  await fs.mkdir(testDir);
  return testDir;
};

export const cleanupTestDirectory = async (dir: string) => {
  await fs.remove(dir);
};

export const createTestFolderStructure = async (baseDir: string) => {
  // Create a test folder structure that mimics real usage
  await fs.mkdir(path.join(baseDir, "TestFolder1"));
  await fs.mkdir(path.join(baseDir, "TestFolder2"));
  await fs.mkdir(path.join(baseDir, "TestFolder1", "SubFolder1"));
  await fs.writeFile(path.join(baseDir, "TestFolder1", "test.txt"), "test content");

  // Create a folder with special characters to test edge cases
  await fs.mkdir(path.join(baseDir, "Test Folder 3 (Special)"));

  return {
    baseDir,
    testFolder1: path.join(baseDir, "TestFolder1"),
    testFolder2: path.join(baseDir, "TestFolder2"),
    subFolder1: path.join(baseDir, "TestFolder1", "SubFolder1"),
    specialFolder: path.join(baseDir, "Test Folder 3 (Special)"),
    testFile: path.join(baseDir, "TestFolder1", "test.txt"),
  };
};
