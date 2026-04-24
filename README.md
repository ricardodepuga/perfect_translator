# 3-Tier Architecture (Directives, Orchestration, Execution)

This structure was configured to create a clear separation between intention (what to do) and execution (how to do it), maximizing reliability and code maintainability.

## Folder Structure

*   **`directives/`**: Contains the SOPs (Standard Operating Procedures) and instructions in Markdown. Defines the "What".
    *   Example: `directives/scrape_website.md`
*   **`execution/`**: Contains the deterministic Python scripts that do the heavy lifting. Defines the "How".
    *   Example: `execution/scrape_single_site.py`
*   **`.tmp/`**: Directory for intermediate and temporary files. The contents of this folder are ignored by git and can be regenerated at any time.

## Workflow

1.  **Directive**: The Agent (or user) reads a directive in `directives/` to understand the goal and necessary steps.
2.  **Orchestration**: The Agent decides which tools to use and in what order, based on the directive.
3.  **Execution**: The Agent runs scripts in `execution/` to perform specific tasks deterministically and reliably.

## Principles

*   **Separation of Concerns**: Directives are flexible and human-readable; execution is rigid and reliable.
*   **Self-annealing**: If a script fails, the error is analyzed, the script is corrected, and the directive is updated with the new information.
*   **Cloud State**: Final files must be delivered to accessible services (Google Drive, etc.), keeping the local system only for processing.

## Configuration

The `.gitignore` file is already configured to ignore `.tmp/`, `.env` and sensitive credentials.

## macOS Installation (Unsigned App)

Since the application is distributed without an official Apple Developer signature, macOS (Gatekeeper) will quarantine it and display an error message stating that the application "is damaged and can't be opened. You should move it to the Bin".

To resolve this, after dragging the application to your **Applications** folder, open the **Terminal** and run the following command:

```bash
sudo xattr -cr "/Applications/Perfect Translator.app"
```
*(You will be prompted for your Mac password)*. After running this command, the application will open normally!
