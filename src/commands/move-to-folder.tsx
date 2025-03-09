import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  environment,
  popToRoot,
  showToast,
  getPreferenceValues,
  getSelectedFinderItems,
  Keyboard,
  showHUD,
  confirmAlert,
  open,
} from "@raycast/api";

import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { runAppleScript } from "run-applescript";
import fs from "fs-extra";
import path from "path";

import { searchSpotlight } from "../common/search-spotlight";
import { SpotlightSearchPreferences, SpotlightSearchResult } from "../common/types";
import {
  folderName,
  enclosingFolderName,
  lastUsedSort,
  fixDoubleConcat,
} from "../common/utils";

// Interface for recent folders
interface RecentFolder extends SpotlightSearchResult {
  lastUsed: Date;
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [folders, setFolders] = useState<SpotlightSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [canExecute, setCanExecute] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const abortable = useRef<AbortController>();
  const preferences = getPreferenceValues<SpotlightSearchPreferences>();
  const maxRecentFolders = parseInt(preferences.maxRecentFolders || "10");

  // Load user preferences
  useEffect(() => {
    async function loadUserPreferences() {
      try {
        const detailPreference = await LocalStorage.getItem(`${environment.extensionName}-show-details`);
        if (detailPreference !== undefined) {
          setIsShowingDetail(detailPreference === "true");
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    }
    
    loadUserPreferences();
  }, []);

  // Save detail view preference when it changes
  useEffect(() => {
    async function saveDetailPreference() {
      try {
        await LocalStorage.setItem(`${environment.extensionName}-show-details`, isShowingDetail.toString());
      } catch (error) {
        console.error("Error saving detail preference:", error);
      }
    }
    
    // Only save after initial load
    if (hasCheckedPreferences) {
      saveDetailPreference();
    }
  }, [isShowingDetail, hasCheckedPreferences]);

  // Fix double text issue
  let fixedText = "";
  useEffect(() => {
    fixedText = fixDoubleConcat(searchText);

    if (fixedText !== searchText) {
      setSearchText(fixedText);
    }
  }, [searchText]);

  // Get selected files from Finder
  useEffect(() => {
    async function getSelectedFinderFiles() {
      try {
        const selectedItems = await getSelectedFinderItems();
        
        if (selectedItems && selectedItems.length > 0) {
          const filePaths = selectedItems.map(item => item.path);
          setSelectedFiles(filePaths);
          setIsLoading(false);
        } else {
          showToast({
            title: "No files selected",
            message: "Please select files in Finder first",
            style: Toast.Style.Failure,
          });
        }
      } catch (error) {
        console.error(error);
        showToast({
          title: "Error",
          message: "Failed to get selected files from Finder",
          style: Toast.Style.Failure,
        });
        setIsLoading(false);
      }
    }

    getSelectedFinderFiles();
    loadRecentFolders();
  }, []);

  // Load recent folders from storage
  async function loadRecentFolders() {
    try {
      const storedFolders = await LocalStorage.getItem(`${environment.extensionName}-recent-folders`);
      
      if (storedFolders) {
        const parsedFolders = JSON.parse(storedFolders as string);
        // Convert string dates back to Date objects
        const foldersWithDates = parsedFolders.map((folder: any) => ({
          ...folder,
          lastUsed: new Date(folder.lastUsed),
          kMDItemLastUsedDate: folder.kMDItemLastUsedDate ? new Date(folder.kMDItemLastUsedDate) : undefined,
          kMDItemContentModificationDate: folder.kMDItemContentModificationDate ? new Date(folder.kMDItemContentModificationDate) : undefined,
          kMDItemFSCreationDate: folder.kMDItemFSCreationDate ? new Date(folder.kMDItemFSCreationDate) : undefined,
        }));
        setRecentFolders(foldersWithDates);
      }
      setHasCheckedPreferences(true);
    } catch (error) {
      console.error("Error loading recent folders:", error);
      setHasCheckedPreferences(true);
    }
  }

  // Save recent folders to storage
  async function saveRecentFolders(folders: RecentFolder[]) {
    try {
      await LocalStorage.setItem(`${environment.extensionName}-recent-folders`, JSON.stringify(folders));
    } catch (error) {
      console.error("Error saving recent folders:", error);
    }
  }

  // Add folder to recent folders
  function addToRecentFolders(folder: SpotlightSearchResult) {
    const recentFolder: RecentFolder = {
      ...folder,
      lastUsed: new Date(),
    };

    // Remove if already exists
    const updatedFolders = recentFolders.filter(f => f.path !== folder.path);
    
    // Add to beginning of array
    const newRecentFolders = [recentFolder, ...updatedFolders].slice(0, maxRecentFolders);
    
    setRecentFolders(newRecentFolders);
    saveRecentFolders(newRecentFolders);
  }

  // Perform search
  usePromise(
    searchSpotlight,
    [
      searchText,
      currentPath || "",
      abortable,
      (result: SpotlightSearchResult) => {
        setFolders((folders) => [result, ...folders].sort(lastUsedSort));
      },
    ],
    {
      onWillExecute: () => {
        setIsQuerying(true);
        setCanExecute(false);
      },
      onData: () => {
        setIsQuerying(false);
      },
      onError: (e) => {
        if (e.name !== "AbortError") {
          showToast({
            title: "Search Error",
            message: "Something went wrong with the search. Please try again.",
            style: Toast.Style.Failure,
          });
        }
        setIsQuerying(false);
      },
      execute: hasCheckedPreferences && canExecute && !!searchText,
      abortable,
    }
  );

  // Reset search when text changes
  useEffect(() => {
    (async () => {
      abortable.current?.abort();
      setFolders([]);
      setIsQuerying(false);
      setCanExecute(true);
    })();
  }, [searchText]);

  // Move files to selected folder
  async function moveFilesToFolder(destinationPath: string) {
    setIsLoading(true);
    
    try {
      // Verify destination folder exists
      if (!fs.existsSync(destinationPath) || !fs.statSync(destinationPath).isDirectory()) {
        throw new Error("Destination folder does not exist");
      }

      let successCount = 0;
      let failCount = 0;
      
      for (const filePath of selectedFiles) {
        try {
          const fileName = path.basename(filePath);
          const destFilePath = path.join(destinationPath, fileName);
          
          // Check if file already exists at destination
          if (fs.existsSync(destFilePath)) {
            const overwrite = await confirmAlert({
              title: "Overwrite the existing file?",
              message: fileName + " already exists in " + destinationPath,
            });

            if (!overwrite) {
              failCount++;
              continue;
            }
            
            if (filePath === destFilePath) {
              await showHUD("The source and destination file are the same");
              failCount++;
              continue;
            }
          }
          
          // Move the file
          await fs.move(filePath, destFilePath, { overwrite: true });
          successCount++;
        } catch (error) {
          console.error(`Error moving file ${filePath}:`, error);
          failCount++;
        }
      }
      
      // Update recent folders with this destination
      const destinationFolder = folders.find(f => f.path === destinationPath) || 
                               recentFolders.find(f => f.path === destinationPath);
      
      if (destinationFolder) {
        addToRecentFolders(destinationFolder);
      }
      
      // Show success/failure toast
      if (successCount > 0) {
        showToast({
          title: `Moved ${successCount} file${successCount !== 1 ? "s" : ""}`,
          message: failCount > 0 ? `Failed to move ${failCount} file${failCount !== 1 ? "s" : ""}` : "",
          style: failCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        });
        
        // Close the window after successful move
        popToRoot({ clearSearchBar: true });
        closeMainWindow({ clearRootSearch: true });
      } else {
        showToast({
          title: "Failed to move files",
          message: "No files were moved successfully",
          style: Toast.Style.Failure,
        });
      }
    } catch (error) {
      console.error("Error moving files:", error);
      showToast({
        title: "Error",
        message: "Failed to move files",
        style: Toast.Style.Failure,
      });
    }
    
    setIsLoading(false);
  }

  // Copy files to selected folder
  async function copyFilesToFolder(destinationPath: string) {
    setIsLoading(true);
    
    try {
      // Verify destination folder exists
      if (!fs.existsSync(destinationPath) || !fs.statSync(destinationPath).isDirectory()) {
        throw new Error("Destination folder does not exist");
      }

      let successCount = 0;
      let failCount = 0;
      
      for (const filePath of selectedFiles) {
        try {
          const fileName = path.basename(filePath);
          const destFilePath = path.join(destinationPath, fileName);
          
          // Check if file already exists at destination
          if (fs.existsSync(destFilePath)) {
            const overwrite = await confirmAlert({
              title: "Overwrite the existing file?",
              message: fileName + " already exists in " + destinationPath,
            });

            if (!overwrite) {
              failCount++;
              continue;
            }
            
            if (filePath === destFilePath) {
              await showHUD("The source and destination file are the same");
              failCount++;
              continue;
            }
          }
          
          // Copy the file
          await fs.copy(filePath, destFilePath, { overwrite: true });
          successCount++;
        } catch (error) {
          console.error(`Error copying file ${filePath}:`, error);
          failCount++;
        }
      }
      
      // Update recent folders with this destination
      const destinationFolder = folders.find(f => f.path === destinationPath) || 
                               recentFolders.find(f => f.path === destinationPath);
      
      if (destinationFolder) {
        addToRecentFolders(destinationFolder);
      }
      
      // Show success/failure toast
      if (successCount > 0) {
        showToast({
          title: `Copied ${successCount} file${successCount !== 1 ? "s" : ""}`,
          message: failCount > 0 ? `Failed to copy ${failCount} file${failCount !== 1 ? "s" : ""}` : "",
          style: failCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        });
        
        // Close the window after successful copy
        popToRoot({ clearSearchBar: true });
        closeMainWindow({ clearRootSearch: true });
      } else {
        showToast({
          title: "Failed to copy files",
          message: "No files were copied successfully",
          style: Toast.Style.Failure,
        });
      }
    } catch (error) {
      console.error("Error copying files:", error);
      showToast({
        title: "Error",
        message: "Failed to copy files",
        style: Toast.Style.Failure,
      });
    }
    
    setIsLoading(false);
  }

  // Navigate to a folder (for browsing)
  function navigateToFolder(folderPath: string) {
    setCurrentPath(folderPath);
    setSearchText("");
    
    // List the contents of the folder
    try {
      const contents = fs.readdirSync(folderPath);
      const folderContents: SpotlightSearchResult[] = [];
      
      for (const item of contents) {
        const itemPath = path.join(folderPath, item);
        
        try {
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            folderContents.push({
              path: itemPath,
              kMDItemFSName: item,
              kMDItemKind: "Folder",
              kMDItemFSSize: 0,
              kMDItemFSCreationDate: stats.birthtime,
              kMDItemContentModificationDate: stats.mtime,
              kMDItemLastUsedDate: stats.atime,
              kMDItemUseCount: 0,
            });
          }
        } catch (error) {
          console.error(`Error reading item ${itemPath}:`, error);
        }
      }
      
      setFolders(folderContents.sort((a, b) => a.kMDItemFSName.localeCompare(b.kMDItemFSName)));
    } catch (error) {
      console.error(`Error reading folder ${folderPath}:`, error);
      showToast({
        title: "Error",
        message: "Failed to read folder contents",
        style: Toast.Style.Failure,
      });
    }
  }

  // Go up one level
  function navigateUp() {
    if (currentPath) {
      const parentPath = path.dirname(currentPath);
      navigateToFolder(parentPath);
    }
  }

  return (
    <List
      isLoading={isLoading || isQuerying}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders or navigate..."
      throttle
      navigationTitle={`Move ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} to folder`}
      isShowingDetail={isShowingDetail}
    >
      {selectedFiles.length > 0 && (
        <List.Section title="Selected Files">
          {selectedFiles.map((filePath, index) => (
            <List.Item
              key={`file-${index}`}
              title={path.basename(filePath)}
              subtitle={path.dirname(filePath)}
              icon={Icon.Document}
            />
          ))}
        </List.Section>
      )}
      
      {currentPath && (
        <List.Section title="Navigation">
          <List.Item
            title="Go Up One Level"
            subtitle={path.dirname(currentPath)}
            icon={Icon.ArrowUp}
            actions={
              <ActionPanel>
                <Action title="Go Up" onAction={navigateUp} />
              </ActionPanel>
            }
          />
          <List.Item
            title={path.basename(currentPath)}
            subtitle={currentPath}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Navigate to Folder"
                  onAction={() => navigateToFolder(currentPath)}
                />
                <Action
                  title="Move Files Here"
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => moveFilesToFolder(currentPath)}
                />
                <Action
                  title="Copy Files Here"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                  onAction={() => copyFilesToFolder(currentPath)}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      
      {!searchText && recentFolders.length > 0 && (
        <List.Section title="Recent Folders">
          {recentFolders.map((folder) => (
            <List.Item
              key={folder.path}
              title={folderName(folder)}
              subtitle={folder.path}
              icon={Icon.Clock}
              accessories={[
                { 
                  text: folder.lastUsed ? `Last used: ${folder.lastUsed.toLocaleDateString()}` : "",
                  tooltip: folder.lastUsed ? `Last used: ${folder.lastUsed.toLocaleString()}` : "",
                }
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Metadata" />
                      <List.Item.Detail.Metadata.Label title="Name" text={folder.kMDItemFSName} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Where" text={folder.path} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Type" text={folder.kMDItemKind} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={folder.kMDItemFSCreationDate?.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Modified"
                        text={folder.kMDItemContentModificationDate?.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Last used"
                        text={folder.lastUsed?.toLocaleString() || "-"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Navigate to Folder"
                    onAction={() => navigateToFolder(folder.path)}
                  />
                  <Action
                    title="Move Files Here"
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => moveFilesToFolder(folder.path)}
                  />
                  <Action
                    title="Copy Files Here"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                    onAction={() => copyFilesToFolder(folder.path)}
                  />
                  <Action
                    title="Toggle Details"
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      
      <List.Section title={currentPath ? "Subfolders" : (searchText ? "Search Results" : "Search for a folder")}>
        {folders.map((folder) => (
          <List.Item
            key={folder.path}
            title={folderName(folder)}
            subtitle={folder.path}
            icon={Icon.Folder}
            accessories={[
              { 
                text: folder.kMDItemContentModificationDate 
                  ? `Modified: ${folder.kMDItemContentModificationDate.toLocaleDateString()}` 
                  : "",
                tooltip: folder.kMDItemContentModificationDate 
                  ? `Modified: ${folder.kMDItemContentModificationDate.toLocaleString()}` 
                  : "",
              }
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Metadata" />
                    <List.Item.Detail.Metadata.Label title="Name" text={folder.kMDItemFSName} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Where" text={folder.path} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Type" text={folder.kMDItemKind} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={folder.kMDItemFSCreationDate?.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={folder.kMDItemContentModificationDate?.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Last used"
                      text={folder.kMDItemLastUsedDate?.toLocaleString() || "-"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Navigate to Folder"
                  onAction={() => navigateToFolder(folder.path)}
                />
                <Action
                  title="Move Files Here"
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => moveFilesToFolder(folder.path)}
                />
                <Action
                  title="Copy Files Here"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                  onAction={() => copyFilesToFolder(folder.path)}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 