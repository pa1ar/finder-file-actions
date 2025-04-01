import { jest } from "@jest/globals";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
    },
  },
  confirmAlert: jest.fn().mockResolvedValue(true),
  showHUD: jest.fn(),
  getPreferenceValues: jest.fn().mockReturnValue({
    maxResults: 50,
  }),
  environment: {
    extensionName: "test-extension",
  },
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

// Mock run-applescript
jest.mock("run-applescript", () => ({
  runAppleScript: jest.fn().mockResolvedValue(""),
}));
