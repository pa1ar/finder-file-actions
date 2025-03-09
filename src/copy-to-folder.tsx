import { LaunchProps, launchCommand } from "@raycast/api";
import { useEffect } from "react";

export default function Command(props: LaunchProps) {
  useEffect(() => {
    // Launch the move-to-folder command with copy mode
    launchCommand({
      name: "move-to-folder",
      type: "command",
      arguments: {
        mode: "copy"
      }
    });
  }, []);
  
  // Return null as we're just redirecting
  return null;
} 