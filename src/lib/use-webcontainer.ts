"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WebContainer, type WebContainerProcess } from "@webcontainer/api";

interface TerminalOutput {
  type: "stdout" | "stderr" | "info" | "command";
  text: string;
  timestamp: number;
}

interface UseWebContainerOptions {
  onOutput?: (output: TerminalOutput) => void;
}

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer(options: UseWebContainerOptions = {}) {
  const [isBooting, setIsBooting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<WebContainer | null>(null);
  const processRef = useRef<WebContainerProcess | null>(null);

  const addOutput = useCallback(
    (type: TerminalOutput["type"], text: string) => {
      options.onOutput?.({
        type,
        text,
        timestamp: Date.now(),
      });
    },
    [options]
  );

  // Boot WebContainer (singleton pattern - only one instance allowed)
  const boot = useCallback(async () => {
    if (containerRef.current) {
      setIsReady(true);
      return containerRef.current;
    }

    if (webcontainerInstance) {
      containerRef.current = webcontainerInstance;
      setIsReady(true);
      return webcontainerInstance;
    }

    if (bootPromise) {
      const instance = await bootPromise;
      containerRef.current = instance;
      setIsReady(true);
      return instance;
    }

    setIsBooting(true);
    setError(null);

    try {
      addOutput("info", "Booting WebContainer...");

      bootPromise = WebContainer.boot();
      const instance = await bootPromise;

      webcontainerInstance = instance;
      containerRef.current = instance;

      // Create a basic package.json if it doesn't exist
      await instance.mount({
        "package.json": {
          file: {
            contents: JSON.stringify(
              {
                name: "playground",
                type: "module",
                dependencies: {},
              },
              null,
              2
            ),
          },
        },
      });

      addOutput("info", "WebContainer ready!");
      setIsReady(true);
      setIsBooting(false);

      return instance;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to boot WebContainer";

      // Handle cryptic "Unable to create more instances" error which means WebContainer
      // is already running or browser limit reached (usually need reload in dev)
      if (message.includes("Unable to create more instances")) {
        const friendlyError = "WebContainer limit reached. Please reload the page.";
        setError(friendlyError);
        addOutput("stderr", `Error: ${friendlyError} (Original: ${message})`);
      } else {
        setError(message);
        addOutput("stderr", `Error: ${message}`);
      }

      setIsBooting(false);
      bootPromise = null;
      throw err;
    }
  }, [addOutput]);

  // Run a command in the WebContainer
  const runCommand = useCallback(
    async (command: string) => {
      const container = containerRef.current || (await boot());

      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      addOutput("command", `$ ${command}`);

      try {
        const process = await container.spawn(cmd, args);
        processRef.current = process;

        // Stream stdout
        process.output.pipeTo(
          new WritableStream({
            write(data) {
              addOutput("stdout", data);
            },
          })
        );

        // Wait for process to complete
        const exitCode = await process.exit;

        if (exitCode !== 0) {
          addOutput("stderr", `Process exited with code ${exitCode}`);
        }

        processRef.current = null;
        return exitCode;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Command failed";
        addOutput("stderr", message);
        processRef.current = null;
        return 1;
      }
    },
    [boot, addOutput]
  );

  // Mount files to the WebContainer
  const mountFiles = useCallback(
    async (files: Record<string, string>) => {
      const container = containerRef.current || (await boot());

      const fileTree: Record<string, { file: { contents: string } }> = {};
      for (const [path, contents] of Object.entries(files)) {
        fileTree[path] = { file: { contents } };
      }

      await container.mount(fileTree);
    },
    [boot]
  );

  // Install packages
  const installPackages = useCallback(
    async (packages: string[]) => {
      if (packages.length === 0) return 0;

      const command = `npm install ${packages.join(" ")}`;
      return runCommand(command);
    },
    [runCommand]
  );

  // Kill current process
  const killProcess = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
      processRef.current = null;
      addOutput("info", "Process killed");
    }
  }, [addOutput]);

  // Read a file from WebContainer
  const readFile = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const container = containerRef.current || (await boot());
        const file = await container.fs.readFile(path, "utf-8");
        return file;
      } catch (err) {
        console.error(`Failed to read file ${path}:`, err);
        return null;
      }
    },
    [boot]
  );

  // Read package.json from WebContainer
  const readPackageJson = useCallback(async (): Promise<Record<string, any> | null> => {
    try {
      const content = await readFile("package.json");
      if (!content) return null;
      return JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse package.json:", err);
      return null;
    }
  }, [readFile]);

  return {
    isBooting,
    isReady,
    error,
    boot,
    runCommand,
    mountFiles,
    installPackages,
    killProcess,
    readFile,
    readPackageJson,
  };
}
