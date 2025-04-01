import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createTestDirectory, cleanupTestDirectory, createTestFolderStructure } from './utils/test-helpers';

describe('File Operations', () => {
  let testDir: string;
  let sourceDir: string;
  let destDir: string;
  let readOnlyDir: string;
  let testStructure: any;

  beforeEach(async () => {
    testDir = await createTestDirectory();
    sourceDir = path.join(testDir, 'source');
    destDir = path.join(testDir, 'dest');
    readOnlyDir = path.join(testDir, 'readonly');
    await fs.mkdir(sourceDir);
    await fs.mkdir(destDir);
    await fs.mkdir(readOnlyDir);
    
    // Create test files
    await fs.writeFile(path.join(sourceDir, 'test1.txt'), 'test content 1');
    await fs.writeFile(path.join(sourceDir, 'test2.txt'), 'test content 2');
    await fs.writeFile(path.join(sourceDir, 'test3.txt'), 'test content 3');
    
    // Create a readonly directory
    await fs.chmod(readOnlyDir, 0o444);
    
    testStructure = await createTestFolderStructure(testDir);
  });

  afterEach(async () => {
    // Reset permissions before cleanup
    await fs.chmod(readOnlyDir, 0o777).catch(() => {});
    await cleanupTestDirectory(testDir);
  });

  describe('Move Operations', () => {
    it('should move multiple files correctly', async () => {
      const files = ['test1.txt', 'test2.txt', 'test3.txt'];
      
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        await fs.move(sourcePath, destPath);
        
        // Verify file was moved
        expect(await fs.exists(sourcePath)).toBe(false);
        expect(await fs.exists(destPath)).toBe(true);
        
        // Verify content remains intact
        const content = await fs.readFile(destPath, 'utf8');
        expect(content).toBe(`test content ${file.charAt(4)}`);
      }
    });

    it('should handle moving to existing files with overwrite', async () => {
      const testFile = 'test1.txt';
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(destDir, testFile);
      
      // Create a file at destination
      await fs.writeFile(destPath, 'original content');
      
      // Move with overwrite
      await fs.move(sourcePath, destPath, { overwrite: true });
      
      // Verify content was overwritten
      const content = await fs.readFile(destPath, 'utf8');
      expect(content).toBe('test content 1');
    });

    it('should fail when moving to readonly directory', async () => {
      const testFile = 'test1.txt';
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(readOnlyDir, testFile);
      
      await expect(fs.move(sourcePath, destPath))
        .rejects
        .toThrow();
      
      // Verify source file still exists
      expect(await fs.exists(sourcePath)).toBe(true);
    });
  });

  describe('Copy Operations', () => {
    it('should copy multiple files correctly', async () => {
      const files = ['test1.txt', 'test2.txt', 'test3.txt'];
      
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        await fs.copy(sourcePath, destPath);
        
        // Verify both files exist
        expect(await fs.exists(sourcePath)).toBe(true);
        expect(await fs.exists(destPath)).toBe(true);
        
        // Verify content is identical
        const sourceContent = await fs.readFile(sourcePath, 'utf8');
        const destContent = await fs.readFile(destPath, 'utf8');
        expect(sourceContent).toBe(destContent);
      }
    });

    it('should handle copying to existing files with overwrite', async () => {
      const testFile = 'test1.txt';
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(destDir, testFile);
      
      // Create a file at destination
      await fs.writeFile(destPath, 'original content');
      
      // Copy with overwrite
      await fs.copy(sourcePath, destPath);
      
      // Verify content was overwritten
      const content = await fs.readFile(destPath, 'utf8');
      expect(content).toBe('test content 1');
    });

    it('should fail when copying to readonly directory', async () => {
      const testFile = 'test1.txt';
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(readOnlyDir, testFile);
      
      await expect(fs.copy(sourcePath, destPath))
        .rejects
        .toThrow();
      
      // Verify source file still exists and wasn't modified
      expect(await fs.exists(sourcePath)).toBe(true);
      const content = await fs.readFile(sourcePath, 'utf8');
      expect(content).toBe('test content 1');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent copy operations', async () => {
      const files = ['test1.txt', 'test2.txt', 'test3.txt'];
      const copyPromises = files.map(file => 
        fs.copy(
          path.join(sourceDir, file),
          path.join(destDir, file)
        )
      );
      
      await Promise.all(copyPromises);
      
      // Verify all files were copied correctly
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        
        expect(await fs.exists(sourcePath)).toBe(true);
        expect(await fs.exists(destPath)).toBe(true);
        
        const sourceContent = await fs.readFile(sourcePath, 'utf8');
        const destContent = await fs.readFile(destPath, 'utf8');
        expect(sourceContent).toBe(destContent);
      }
    });

    it('should handle multiple concurrent move operations', async () => {
      const files = ['test1.txt', 'test2.txt', 'test3.txt'];
      const movePromises = files.map(file => 
        fs.move(
          path.join(sourceDir, file),
          path.join(destDir, file)
        )
      );
      
      await Promise.all(movePromises);
      
      // Verify all files were moved correctly
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        
        expect(await fs.exists(sourcePath)).toBe(false);
        expect(await fs.exists(destPath)).toBe(true);
      }
    });
  });

  describe('Large Directory Operations', () => {
    it('should handle copying large number of files', async () => {
      const largeDir = path.join(testDir, 'large');
      await fs.mkdir(largeDir);
      
      // Create 100 small files
      const fileCount = 100;
      for (let i = 0; i < fileCount; i++) {
        await fs.writeFile(
          path.join(largeDir, `file${i}.txt`),
          `content ${i}`
        );
      }
      
      const largeDest = path.join(testDir, 'large-dest');
      await fs.mkdir(largeDest);
      
      // Copy entire directory
      await fs.copy(largeDir, largeDest);
      
      // Verify all files were copied
      const sourceFiles = await fs.readdir(largeDir);
      const destFiles = await fs.readdir(largeDest);
      
      expect(sourceFiles.length).toBe(fileCount);
      expect(destFiles.length).toBe(fileCount);
      
      // Verify content of random files
      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * fileCount);
        const fileName = `file${randomIndex}.txt`;
        const sourceContent = await fs.readFile(path.join(largeDir, fileName), 'utf8');
        const destContent = await fs.readFile(path.join(largeDest, fileName), 'utf8');
        expect(sourceContent).toBe(destContent);
      }
    });
  });
}); 