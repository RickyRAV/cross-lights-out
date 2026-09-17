# Cross-Platform Project Starter (React Native + Expo + TypeScript)

Welcome to the team project repository for the Cross-Platform Development course.

## Team Details
* **Student 1**: [Full Name] ([GitHub Handle])
* **Student 2**: [Full Name] ([GitHub Handle])
* **App Name**: [Your App Concept Name]

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
   npm install
   ```

2. Launch on target platform:

   * **Android Emulator**:
     * Start your AVD (via Android Studio or `emulator -avd <NAME>`), then run:
     ```bash
     npm run android
     ```

   * **iOS Simulator** (Mac only):
     ```bash
     npm run ios
     ```

   * **Physical Device (Expo Go Fallback)**:
     * Scan the QR code using the **Expo Go** app:
     ```bash
     npm start
     ```

---

## Troubleshooting

* **Error: `adb command not found` / `Android SDK path not found`**
  * **Fix**: Ensure `ANDROID_HOME` and the `platform-tools` + `emulator` folders are correctly added to your system `PATH` environment variable.
* **Port 8081 is in use**
  * **Fix**: Type `y` when prompted to switch to port 8082, or kill existing Node processes.
