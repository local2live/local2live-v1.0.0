# Local2Live

A professional, cross-platform Electron application that provides a clean, user-friendly Graphical User Interface (GUI) for exposing your localhost ports to the internet using LocalTunnel. Say goodbye to the CLI and manage your tunnels with ease!

## ✨ Features

- **Frameless UI & Custom Window Controls:** Modern, sleek, and native-feeling interface without default browser borders.
- **Multi-Session Architecture:** Manage multiple active tunnels simultaneously.
- **Dynamic Sidebar Management:** Easily switch between different tunnel sessions and view their status.
- **Secure IPC Communication:** Robust architecture ensuring safe data handling between the UI and the Node.js backend.
- **Process Lifecycle Management:** Gracefully start and stop tunnels without leaving zombie processes.
- **Cross-Platform:** Works seamlessly on Windows, macOS, and Linux.

## 📥 How to Download and Run

To get started with Local2Live, you need to have [Node.js](https://nodejs.org/) installed on your system.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/local2live/local2live-v1.0.0.git
   cd local2live
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application in development mode:**
   ```bash
   npm start
   ```

## 🚀 Building for Production

If you want to package the app into a standalone executable for distribution, you can use the built-in `electron-builder` scripts. The final installable files will be placed in the `dist/` folder.

### 🪟 Windows (`.exe`)
You can build the Windows installer locally from a Windows machine.
```bash
npm run build:win
```
After completion, look for `local2live Setup 1.0.0.exe` in the `dist/` directory.

### 🐧 Linux (`.AppImage`)
You can build the Linux executable from a Linux environment (or WSL on Windows).
1. Ensure you are in a Linux environment and have run `npm install`.
2. Build the application:
   ```bash
   npm run build:linux
   ```
This will generate an `.AppImage` file in the `dist/` directory, which users can double-click to run without installation.

### 🍎 macOS (`.dmg`)
Apple requires macOS applications to be built on actual Apple hardware. You cannot natively build a Mac app on a Windows PC.

**Option A: Build on a physical Mac**
1. Clone or copy the project folder to a Mac.
2. Run `npm install`.
3. Build the application:
   ```bash
   npm run build:mac
   ```
Look for the `.dmg` installer in the `dist/` folder.

**Option B: Use GitHub Actions**
If you don't have a Mac, you can set up GitHub Actions (which is free for open-source repositories) to automatically build the project for Windows, macOS, and Linux in the cloud whenever you push new code.

## 🤝 Contributing
Contributions, issues and feature requests are welcome!

## 📜 License
This project is licensed under the GPL-2 License.
