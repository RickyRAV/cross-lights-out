# Cross-Platform Project Starter (React Native + Expo + TypeScript)

Welcome to the team project repository for the Cross-Platform Development course.

## Team Details
* **Student 1**: Ricky Raveanu ([RickyRAV](https://github.com/RickyRAV))
* **Student 2**: Nikola Petrovic ([Nikola-Petro](https://github.com/Nikola-Petro))
* **App Name**: Lights Out

---

## Git Workflow

`main` is a protected branch:

* No direct pushes — all changes land through a pull request.
* At least 1 approval is required before merging, and a new approval is required if the branch gets updated after review.
* All PR conversations must be resolved before merging.
* History stays linear (no merge commits) — rebase your branch on `main` instead of merging it in.
* Force-pushing to `main` and branch deletion are locked down to prevent accidental history loss.

## Branch Naming Convention

Branches should follow this format:

```text
<issue-type>/<initials>/<ticket-number-or-noissue>-<short-description>
```

### Field Breakdown

- `<issue-type>`: The kind of work being done.
- `<initials>`: The contributor's initials.
- `<ticket-number-or-noissue>`: The ticket ID from `GHERKIN.md` (e.g. `LO-6`), or `NOISSUE` if the work isn't tracked as a ticket.
- `<short-description>`: A brief, lowercase, hyphen-separated summary of the task.

### Recommended Issue Types

Use one of the following branch type prefixes whenever possible:

- `feature` for new functionality
- `fix` for bug fixes
- `chore` for maintenance or housekeeping work
- `docs` for documentation-only changes
- `refactor` for structural code improvements without behavior changes
- `test` for adding or updating tests
- `hotfix` for urgent production fixes

### Examples

```text
feature/rr/LO-6-race-grading-job
fix/np/LO-10-prediction-submit-bug
chore/rr/LO-3-home-lab-deployment
chore/np/NOISSUE-repository-cleanup
docs/rr/NOISSUE-improve-readme
refactor/np/LO-8-app-shell-cleanup
test/rr/LO-17-scoring-unit-tests
```

### Example Explained

```text
feature/rr/LO-6-race-grading-job
```

- `feature`: This branch introduces new functionality.
- `rr`: These are the contributor's initials.
- `LO-6`: This is the ticket ID from `GHERKIN.md`.
- `race-grading-job`: This is a short summary of the change.

If no ticket exists for the work, replace the ticket key with `NOISSUE`.

```text
chore/rr/NOISSUE-repository-cleanup
```

---

## Environment Setup Requirements

Before running the application, ensure your mobile development tools are configured.

### 1. Android Emulator (Windows / Mac / Linux)
1. Install **Android Studio**.
2. Open Android Studio $\rightarrow$ **Virtual Device Manager** (AVD) and create a virtual device (e.g., Pixel 6 with API 34).
3. Ensure your `ANDROID_HOME` environment variable is set:
   * **Windows**: Set `ANDROID_HOME` to `C:\Users\<Your-Username>\AppData\Local\Android\Sdk` and add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to your `PATH`.
   * **Mac**: Add `export ANDROID_HOME=$HOME/Library/Android/sdk` and `export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools` to your `~/.zshrc`.

#### Managing Emulators via Terminal:
* **List installed emulators**:
  ```bash
  emulator -list-avds
  ```
* **Start an emulator from command line**:
  ```bash
  emulator -avd <YOUR_AVD_NAME>
  ```
  *(Example: `emulator -avd Pixel_6_API_34`)*

---

### 2. iOS Simulator (Mac Only)
1. Install **Xcode** from the Mac App Store.
2. Open Xcode once to accept the license agreement and install required component tools.
3. Open Simulator via Xcode $\rightarrow$ Open Developer Tool $\rightarrow$ Simulator.

---

## How to Run the App

1. Install local dependencies:
   ```bash
   pnpm install
   ```

2. Launch on target platform:

   * **Android Emulator**:
     * Start your AVD (via Android Studio or `emulator -avd <NAME>`), then run:
     ```bash
     pnpm android
     ```

   * **iOS Simulator** (Mac only):
     ```bash
     pnpm ios
     ```

   * **Physical Device (Expo Go Fallback)**:
     * Scan the QR code using the **Expo Go** app:
     ```bash
     pnpm start
     ```

---

## Troubleshooting

* **Error: `adb command not found` / `Android SDK path not found`**
  * **Fix**: Ensure `ANDROID_HOME` and the `platform-tools` + `emulator` folders are correctly added to your system `PATH` environment variable.
* **Port 8081 is in use**
  * **Fix**: Type `y` when prompted to switch to port 8082, or kill existing Node processes.
