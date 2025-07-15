# SPT Launcher

A comprehensive desktop application for managing SPT-AKI (Single Player Tarkov - Aki) installations, mods, and game profiles. This launcher provides an intuitive interface for running SPT-AKI servers, launching the game client, managing mods, and handling profile backups.

## What is SPT-AKI?

SPT-AKI is a single-player modification for Escape from Tarkov that allows you to play the game offline with AI bots. It provides a complete single-player experience with customizable settings, mods, and persistent progression.

## Features

### 🚀 **Server Management**

- Start and stop the SPT-AKI server with one click
- Real-time server status monitoring
- Live server logs display
- Port status checking (port 6969)
- Automatic path validation for server executable

### 🎮 **Client Launcher**

- Launch the SPT-AKI game client directly
- Path validation for client executable
- Integration with server status

### 📦 **Mod Management**

- Browse and install mods from GitHub repositories
- Search and filter mods by category
- Install mods directly to your SPT-AKI server
- Local mod management for custom mods
- Mod compatibility checking
- Categories: Client Mods, Server Mods, Utilities, Visual Mods, Gameplay Mods

### 👤 **Profile Management**

- View all SPT-AKI profiles
- Backup profiles to safe locations
- Restore profiles from backups
- Profile information display (Level, PMC Level, Scav Level)

### ⚙️ **Settings & Configuration**

- Configure server and client paths
- Theme toggle (light/dark mode)
- Persistent settings storage
- Path validation and error handling

## Installation

### Prerequisites

- **Windows** (currently supported)
- SPT-AKI installation (server and client)

### Download

1. Download the latest release from the releases page
2. Extract the application to your desired location
3. Run the executable file

### First Time Setup

1. Launch SPT Launcher
2. Navigate to Settings
3. Configure your SPT-AKI server path (usually `server.exe` or `Aki.Server.exe`)
4. Configure your SPT-AKI client path (usually `launcher.exe` or `Aki.Launcher.exe`)
5. Save your settings

## Usage Guide

### Starting SPT-AKI

1. **Start the Server**: Click "Start SPT-AKI Server" in the Server Management section
2. **Wait for Server**: Monitor the server logs to ensure it's running properly
3. **Launch Client**: Click "Launch SPT-AKI Launcher" in the Client Launcher section
4. **Play**: Use the SPT-AKI launcher to start your game

### Managing Mods

1. **Browse Mods**: Switch between "Remote" (GitHub) and "Local" mod sources
2. **Search**: Use the search bar to find specific mods
3. **Filter**: Use category filters to narrow down mods
4. **Install**: Click "Install" on any mod to download and install it to your server
5. **Add Custom Mods**: Use "Add Mod" to include custom mods in your local list

### Profile Management

1. **View Profiles**: All profiles are automatically detected from your server
2. **Backup**: Click "Backup" to save a profile to a safe location
3. **Restore**: Click "Restore" to restore a profile from backup

### Server Monitoring

- **Status**: Check the server status indicator
- **Logs**: Monitor real-time server output in the logs window
- **Port Check**: Verify port 6969 is available and working

## Troubleshooting

### Common Issues

**App won't start:**

- Check that the executable has proper permissions
- Try running as administrator if needed
- Ensure all required files are present in the application directory

**Server won't start:**

- Verify the server path is correct
- Check that the server executable has proper permissions
- Ensure no other process is using port 6969

**Client won't launch:**

- Verify the client path is correct
- Make sure the server is running first
- Check that the client executable has proper permissions

**Mods not installing:**

- Ensure your server path is configured correctly
- Check your internet connection for remote mods
- Verify the mod is compatible with your SPT-AKI version

**No profiles showing:**

- Make sure your server path is correct
- Ensure you have created at least one profile in SPT-AKI
- Check that the profiles directory exists and is accessible

### Getting Help

- Check the server logs for detailed error messages
- Verify all paths are correctly configured
- Ensure you have the latest version of SPT-AKI installed
- Make sure all executables have proper permissions

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Disclaimer

This launcher is designed to work with SPT-AKI, which is a third-party modification for Escape from Tarkov. Use at your own risk and ensure you comply with all relevant terms of service and licensing agreements.

---

**Note**: This application is not affiliated with Battlestate Games or the official Escape from Tarkov development team.
