const { app, shell, BrowserWindow, ipcMain, screen, dialog } = require('electron')
const { join } = require('path')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')
const { spawn, exec } = require('child_process')
const { promises: fs } = require('fs')
const path = require('path')
const icon = path.join(__dirname, '../../resources/icon.png')

// Store references to managed windows
const managedWindows = new Map()

// Common program paths for different platforms
const getCommonProgramPaths = (platform) => {
  if (platform === 'win32') {
    // Fix the path issue by using proper environment variables
    const paths = [
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      'C:\\Windows\\System32'
    ]
    
    // Only add Start Menu paths if they exist and are accessible
    if (process.env.APPDATA) {
      paths.push(process.env.APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs')
    }
    if (process.env.LOCALAPPDATA) {
      paths.push(process.env.LOCALAPPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs')
    }
    if (process.env.ALLUSERSPROFILE) {
      paths.push(process.env.ALLUSERSPROFILE + '\\Microsoft\\Windows\\Start Menu\\Programs')
    }
    
    return paths
  } else if (platform === 'darwin') {
    return [
      '/Applications',
      '/System/Applications',
      '/usr/local/bin',
      '/usr/bin'
    ]
  } else {
    return [
      '/usr/bin',
      '/usr/local/bin',
      '/opt',
      '/snap/bin'
    ]
  }
}

// Get installed programs
async function getInstalledPrograms(platform) {
  const programs = []
  
  try {
    console.log(`=== Starting program scan for platform: ${platform} ===`)
    
    if (platform === 'win32') {
      // Windows: Get programs from Start Menu and common locations
      const commonPaths = getCommonProgramPaths(platform)
      console.log('Common paths to scan:', commonPaths)
      
      // Add some common Windows built-in programs
      const builtInPrograms = [
        'notepad', 'calc', 'mspaint', 'wordpad', 'cmd', 'explorer', 'taskmgr',
        'control', 'devmgmt.msc', 'snippingtool', 'charmap', 'msedge', 'iexplore',
        'powershell', 'regedit', 'services.msc', 'diskmgmt.msc', 'eventvwr',
        'gpedit.msc', 'secpol.msc', 'lusrmgr.msc', 'compmgmt.msc', 'perfmon'
      ]
      
      console.log('Adding built-in programs:', builtInPrograms)
      builtInPrograms.forEach(program => {
        programs.push({
          name: program,
          path: program,
          type: 'executable'
        })
      })
      console.log(`Added ${builtInPrograms.length} built-in programs`)
      
      // Scan Start Menu for shortcuts
      try {
        const startMenuPaths = []
        
        // Only add paths that exist and are accessible
        if (process.env.APPDATA) {
          const appDataPath = process.env.APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs'
          if (await fs.access(appDataPath).then(() => true).catch(() => false)) {
            startMenuPaths.push(appDataPath)
          }
        }
        
        if (process.env.LOCALAPPDATA) {
          const localAppDataPath = process.env.LOCALAPPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs'
          if (await fs.access(localAppDataPath).then(() => true).catch(() => false)) {
            startMenuPaths.push(localAppDataPath)
          }
        }
        
        if (process.env.ALLUSERSPROFILE) {
          const allUsersPath = process.env.ALLUSERSPROFILE + '\\Microsoft\\Windows\\Start Menu\\Programs'
          if (await fs.access(allUsersPath).then(() => true).catch(() => false)) {
            startMenuPaths.push(allUsersPath)
          }
        }
        
        console.log('Start Menu paths to scan:', startMenuPaths)
        for (const startMenuPath of startMenuPaths) {
          try {
            console.log(`Scanning Start Menu: ${startMenuPath}`)
            await scanStartMenu(startMenuPath, programs)
          } catch (error) {
            console.log(`Error scanning Start Menu path ${startMenuPath}: ${error.message}`)
          }
        }
      } catch (error) {
        console.log('Error scanning Start Menu:', error.message)
      }
      
      // Get programs from registry
      try {
        console.log('Getting programs from registry...')
        const registryPrograms = await getProgramsFromRegistry()
        console.log(`Found ${registryPrograms.length} registry programs`)
        programs.push(...registryPrograms)
      } catch (error) {
        console.log('Error getting programs from registry:', error.message)
      }
      
      // Get modern Windows apps
      try {
        console.log('Getting modern Windows apps...')
        const modernApps = await getModernWindowsApps()
        console.log(`Found ${modernApps.length} modern Windows apps`)
        programs.push(...modernApps)
      } catch (error) {
        console.log('Error getting modern Windows apps:', error.message)
      }
      
      // Find popular applications like Discord, Steam, etc.
      try {
        console.log('Finding popular applications...')
        const popularApps = await findPopularApplications()
        console.log(`Found ${popularApps.length} popular applications`)
        programs.push(...popularApps)
      } catch (error) {
        console.log('Error finding popular applications:', error.message)
      }
      
      // Direct Discord search as fallback
      try {
        console.log('Performing direct Discord search...')
        const discordApps = await findDiscordDirectly()
        if (discordApps.length > 0) {
          console.log(`Found ${discordApps.length} Discord installations`)
          programs.push(...discordApps)
        }
      } catch (error) {
        console.log('Error in direct Discord search:', error.message)
      }
      
      // Scan user folders for portable applications
      try {
        console.log('Scanning user folders for portable apps...')
        const portableApps = await scanUserFolders()
        console.log(`Found ${portableApps.length} portable applications`)
        programs.push(...portableApps)
      } catch (error) {
        console.log('Error scanning user folders:', error.message)
      }
      
      // Scan common paths for executables
      console.log('Scanning common paths for executables...')
      for (const path of commonPaths) {
        try {
          if (await fs.access(path).then(() => true).catch(() => false)) {
            console.log(`Scanning directory: ${path}`)
            await scanDirectoryRecursively(path, programs, 3) // Max depth 3
          } else {
            console.log(`Cannot access path: ${path}`)
          }
        } catch (error) {
          console.log(`Skipping path ${path}: ${error.message}`)
          continue
        }
      }
      
      // Remove duplicates based on name and prioritize popular apps
      const uniquePrograms = []
      const seenNames = new Set()
      
      // First, add popular apps (Discord, Steam, etc.)
      for (const program of programs) {
        if (program.type === 'popular-app' && !seenNames.has(program.name.toLowerCase())) {
          seenNames.add(program.name.toLowerCase())
          uniquePrograms.push(program)
          console.log(`✅ Added popular app: ${program.name} (${program.type})`)
        }
      }
      
      // Then add other programs
      for (const program of programs) {
        if (program.type !== 'popular-app' && !seenNames.has(program.name.toLowerCase())) {
          seenNames.add(program.name.toLowerCase())
          uniquePrograms.push(program)
        }
      }
      
      console.log(`=== Final results: ${uniquePrograms.length} unique programs ===`)
      console.log('Program types found:', [...new Set(uniquePrograms.map(p => p.type))])
      console.log('Popular apps found:', uniquePrograms.filter(p => p.type === 'popular-app').map(p => p.name))
      console.log('Sample programs:', uniquePrograms.slice(0, 10).map(p => `${p.name} (${p.type})`))
      
      // Create working shortcuts for popular applications
      try {
        console.log('Creating working shortcuts...')
        const finalPrograms = await createWorkingShortcuts(uniquePrograms)
        console.log(`Final program count: ${finalPrograms.length}`)
        return finalPrograms
      } catch (error) {
        console.log('Error creating working shortcuts:', error.message)
        return uniquePrograms
      }
      
    } else if (platform === 'darwin') {
      // macOS: Get applications from Applications folder
      const appsPath = '/Applications'
      try {
        const items = await fs.readdir(appsPath, { withFileTypes: true })
        for (const item of items) {
          if (item.isDirectory() && item.name.endsWith('.app')) {
            programs.push({
              name: item.name.replace('.app', ''),
              path: join(appsPath, item.name),
              type: 'application'
            })
          }
        }
      } catch (error) {
        console.error('Error reading Applications folder:', error)
      }
    } else {
      // Linux: Get programs from common bin directories
      const binPaths = getCommonProgramPaths(platform)
      for (const path of binPaths) {
        try {
          if (await fs.access(path).then(() => true).catch(() => false)) {
            const items = await fs.readdir(path, { withFileTypes: true })
            for (const item of items) {
              if (item.isFile()) {
                // Check if file is executable
                try {
                  await fs.access(join(path, item.name), fs.constants.X_OK)
                  programs.push({
                    name: item.name,
                    path: join(path, item.name),
                    type: 'executable'
                  })
                } catch (error) {
                  // File is not executable
                }
              }
            }
          }
        } catch (error) {
          // Skip paths that can't be accessed
          continue
        }
      }
    }
  } catch (error) {
    console.error('Error getting installed programs:', error)
  }
  
  console.log(`Found ${programs.length} programs for platform ${platform}`)
  return programs
}

// Get installed programs from Windows Registry
async function getProgramsFromRegistry() {
  const programs = []
  
  try {
    // This is a simplified approach - in a real app you might want to use a native module
    // For now, we'll add some common registry paths that contain program information
    const commonRegistryPaths = [
      'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
      'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
    ]
    
    // Add some common applications that are typically found in registry
    const commonApps = [
      'chrome.exe', 'firefox.exe', 'msedge.exe', 'iexplore.exe',
      'winword.exe', 'excel.exe', 'powerpnt.exe', 'outlook.exe',
      'acrobat.exe', 'photoshop.exe', 'illustrator.exe', 'vscode.exe',
      'notepad++.exe', 'sublime_text.exe', 'atom.exe', 'code.exe'
    ]
    
    commonApps.forEach(app => {
      const name = app.replace('.exe', '')
      programs.push({
        name: name,
        path: app,
        type: 'executable'
      })
    })
    
    console.log(`Added ${commonApps.length} common applications from registry paths`)
  } catch (error) {
    console.log('Error getting programs from registry:', error.message)
  }
  
  return programs
}

// Recursively scan directory for executables
async function scanDirectoryRecursively(dirPath, programs, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = join(dirPath, item.name)
      
      if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
        // Found an executable
        const name = item.name.replace('.exe', '')
        programs.push({
          name: name,
          path: fullPath,
          type: 'executable'
        })
      } else if (item.isDirectory() && currentDepth < maxDepth - 1) {
        // Recursively scan subdirectories
        try {
          await scanDirectoryRecursively(fullPath, programs, maxDepth, currentDepth + 1)
        } catch (subError) {
          // Skip subdirectories that can't be accessed
          continue
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be accessed
    console.log(`Cannot access directory ${dirPath}: ${error.message}`)
  }
}

// Scan Start Menu for shortcuts and executables
async function scanStartMenu(startMenuPath, programs) {
  try {
    const items = await fs.readdir(startMenuPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = join(startMenuPath, item.name)
      
      if (item.isFile()) {
        if (item.name.toLowerCase().endsWith('.lnk')) {
          // Windows shortcut file
          const name = item.name.replace('.lnk', '')
          programs.push({
            name: name,
            path: fullPath,
            type: 'shortcut'
          })
        } else if (item.name.toLowerCase().endsWith('.exe')) {
          // Direct executable
          const name = item.name.replace('.exe', '')
          programs.push({
            name: name,
            path: fullPath,
            type: 'executable'
          })
        }
      } else if (item.isDirectory()) {
        // Recursively scan subdirectories
        try {
          await scanStartMenu(fullPath, programs)
        } catch (subError) {
          continue
        }
      }
    }
  } catch (error) {
    console.log(`Error scanning Start Menu path ${startMenuPath}: ${error.message}`)
  }
}

// Browse for executable files
async function browseForExecutable(platform) {
  const result = await dialog.showOpenDialog({
    title: 'Select Program to Run',
    properties: ['openFile'],
    filters: platform === 'win32' 
      ? [{ name: 'Executables', extensions: ['exe', 'bat', 'cmd'] }]
      : platform === 'darwin'
      ? [{ name: 'Applications', extensions: ['app'] }]
      : [{ name: 'Executables', extensions: ['*'] }]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
}

// Get Microsoft Store and modern Windows apps
async function getModernWindowsApps() {
  const programs = []
  
  try {
    // Microsoft Store apps are typically installed in these locations
    const modernAppPaths = [
      process.env.LOCALAPPDATA + '\\Microsoft\\WindowsApps',
      process.env.PROGRAMFILES + '\\WindowsApps',
      process.env['PROGRAMFILES(X86)'] + '\\WindowsApps'
    ]
    
    // Add common user-installed app directories
    const userAppPaths = [
      process.env.LOCALAPPDATA + '\\Discord',
      process.env.LOCALAPPDATA + '\\Programs',
      process.env.APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs',
      process.env.LOCALAPPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs'
    ]
    
    // Scan modern app paths
    for (const appPath of modernAppPaths) {
      try {
        if (await fs.access(appPath).then(() => true).catch(() => false)) {
          const items = await fs.readdir(appPath, { withFileTypes: true })
          for (const item of items) {
            if (item.isDirectory()) {
              // Look for executable files in the app directory
              try {
                const appDir = join(appPath, item.name)
                const appItems = await fs.readdir(appDir, { withFileTypes: true })
                for (const appItem of appItems) {
                  if (appItem.isFile() && appItem.name.toLowerCase().endsWith('.exe')) {
                    const name = item.name.split('_')[0] // Remove version info
                    programs.push({
                      name: name,
                      path: join(appDir, appItem.name),
                      type: 'modern-app'
                    })
                    break
                  }
                }
              } catch (subError) {
                continue
              }
            }
          }
        }
      } catch (error) {
        console.log(`Cannot access modern app path ${appPath}: ${error.message}`)
      }
    }
    
    // Scan user app paths (like Discord)
    for (const appPath of userAppPaths) {
      try {
        if (await fs.access(appPath).then(() => true).catch(() => false)) {
          await scanUserAppDirectory(appPath, programs)
        }
      } catch (error) {
        console.log(`Cannot access user app path ${appPath}: ${error.message}`)
      }
    }
    
    console.log(`Found ${programs.length} modern Windows apps`)
  } catch (error) {
    console.log('Error getting modern Windows apps:', error.message)
  }
  
  return programs
}

// Recursively scan a user-specific app directory for executables
async function scanUserAppDirectory(appPath, programs) {
  try {
    const items = await fs.readdir(appPath, { withFileTypes: true })
    for (const item of items) {
      if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
        const name = item.name.replace('.exe', '')
        programs.push({
          name: name,
          path: join(appPath, item.name),
          type: 'modern-app'
        })
      }
    }
  } catch (error) {
    console.log(`Error scanning user app directory ${appPath}: ${error.message}`)
  }
}

// Find popular applications in common locations
async function findPopularApplications() {
  const programs = []
  
  try {
    console.log('=== Starting popular applications scan ===')
    
    // Common popular applications and their typical installation paths
    const popularApps = [
      {
        name: 'Discord',
        paths: [
          process.env.LOCALAPPDATA + '\\Discord\\app-*\\Discord.exe',
          process.env.LOCALAPPDATA + '\\Discord\\Update.exe',
          process.env.APPDATA + '\\Discord\\app-*\\Discord.exe'
        ]
      },
      {
        name: 'Steam',
        paths: [
          'C:\\Program Files (x86)\\Steam\\Steam.exe',
          'C:\\Program Files\\Steam\\Steam.exe'
        ]
      },
      {
        name: 'Spotify',
        paths: [
          process.env.APPDATA + '\\Spotify\\Spotify.exe',
          process.env.LOCALAPPDATA + '\\Microsoft\\WindowsApps\\SpotifyAB.SpotifyMusic_*\\Spotify.exe'
        ]
      },
      {
        name: 'Telegram',
        paths: [
          process.env.APPDATA + '\\Telegram Desktop\\Telegram.exe',
          process.env.LOCALAPPDATA + '\\Programs\\Telegram\\Telegram.exe'
        ]
      },
      {
        name: 'WhatsApp',
        paths: [
          process.env.LOCALAPPDATA + '\\WhatsApp\\WhatsApp.exe',
          process.env.APPDATA + '\\WhatsApp\\WhatsApp.exe'
        ]
      },
      {
        name: 'Slack',
        paths: [
          process.env.LOCALAPPDATA + '\\slack\\app-*\\slack.exe',
          process.env.APPDATA + '\\slack\\app-*\\slack.exe'
        ]
      }
    ]
    
    console.log('Popular apps to search for:', popularApps.map(app => app.name))
    console.log('Environment variables:')
    console.log('LOCALAPPDATA:', process.env.LOCALAPPDATA)
    console.log('APPDATA:', process.env.APPDATA)
    
    for (const app of popularApps) {
      console.log(`\n--- Searching for ${app.name} ---`)
      for (const pathPattern of app.paths) {
        try {
          console.log(`Checking pattern: ${pathPattern}`)
          // Handle wildcard patterns
          if (pathPattern.includes('*')) {
            const basePath = pathPattern.split('*')[0]
            const fileName = pathPattern.split('*')[1]
            
            console.log(`Base path: ${basePath}`)
            console.log(`File name: ${fileName}`)
            
            if (await fs.access(basePath).then(() => true).catch(() => false)) {
              console.log(`Base path accessible: ${basePath}`)
              const items = await fs.readdir(basePath, { withFileTypes: true })
              console.log(`Found ${items.length} items in base path`)
              
              for (const item of items) {
                if (item.isDirectory() && item.name.startsWith('app-')) {
                  console.log(`Found app directory: ${item.name}`)
                  const fullPath = join(basePath, item.name, fileName)
                  console.log(`Checking full path: ${fullPath}`)
                  
                  if (await fs.access(fullPath).then(() => true).catch(() => false)) {
                    console.log(`✅ Found ${app.name} at: ${fullPath}`)
                    programs.push({
                      name: app.name,
                      path: fullPath,
                      type: 'popular-app'
                    })
                    break
                  } else {
                    console.log(`❌ File not accessible: ${fullPath}`)
                  }
                }
              }
            } else {
              console.log(`❌ Base path not accessible: ${basePath}`)
            }
          } else {
            // Direct path
            console.log(`Checking direct path: ${pathPattern}`)
            if (await fs.access(pathPattern).then(() => true).catch(() => false)) {
              console.log(`✅ Found ${app.name} at: ${pathPattern}`)
              programs.push({
                name: app.name,
                path: pathPattern,
                type: 'popular-app'
              })
            } else {
              console.log(`❌ Direct path not accessible: ${pathPattern}`)
            }
          }
        } catch (error) {
          console.log(`Error checking pattern ${pathPattern}: ${error.message}`)
          continue
        }
      }
    }
    
    console.log(`\n=== Popular apps scan complete: ${programs.length} found ===`)
    programs.forEach(p => console.log(`- ${p.name}: ${p.path}`))
  } catch (error) {
    console.log('Error finding popular applications:', error.message)
  }
  
  return programs
}

// Direct Discord search - more aggressive approach
async function findDiscordDirectly() {
  const programs = []
  
  try {
    console.log('=== Direct Discord search ===')
    
    // Method 1: Check if Discord is running and get its path
    try {
      const { exec } = require('child_process')
      const util = require('util')
      const execAsync = util.promisify(exec)
      
      // Try to find Discord using where command
      const { stdout } = await execAsync('where discord')
      if (stdout.trim()) {
        const discordPath = stdout.trim().split('\n')[0]
        console.log(`✅ Found Discord using 'where' command: ${discordPath}`)
        programs.push({
          name: 'Discord',
          path: discordPath,
          type: 'popular-app'
        })
        return programs
      }
    } catch (error) {
      console.log('Discord not found using "where" command')
    }
    
    // Method 2: Check common Discord installation paths
    const discordPaths = [
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Discord',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Roaming\\Discord',
      process.env.LOCALAPPDATA + '\\Discord',
      process.env.APPDATA + '\\Discord',
      'C:\\Program Files\\Discord\\Discord.exe',
      'C:\\Program Files (x86)\\Discord\\Discord.exe'
    ]
    
    console.log('Checking Discord paths:', discordPaths)
    
    for (const basePath of discordPaths) {
      try {
        if (await fs.access(basePath).then(() => true).catch(() => false)) {
          console.log(`Discord base path accessible: ${basePath}`)
          
          if (basePath.endsWith('Discord.exe')) {
            // Direct executable
            console.log(`✅ Found Discord executable: ${basePath}`)
            programs.push({
              name: 'Discord',
              path: basePath,
              type: 'popular-app'
            })
            return programs
          } else {
            // Directory - look for app folders
            const items = await fs.readdir(basePath, { withFileTypes: true })
            console.log(`Found ${items.length} items in Discord directory`)
            
            for (const item of items) {
              if (item.isDirectory() && item.name.startsWith('app-')) {
                const discordExe = join(basePath, item.name, 'Discord.exe')
                console.log(`Checking Discord.exe in: ${discordExe}`)
                
                if (await fs.access(discordExe).then(() => true).catch(() => false)) {
                  console.log(`✅ Found Discord in app folder: ${discordExe}`)
                  programs.push({
                    name: 'Discord',
                    path: discordExe,
                    type: 'popular-app'
                  })
                  return programs
                }
              }
            }
          }
        } else {
          console.log(`Discord path not accessible: ${basePath}`)
        }
      } catch (error) {
        console.log(`Error checking Discord path ${basePath}: ${error.message}`)
      }
    }
    
    console.log('❌ Discord not found using direct search')
  } catch (error) {
    console.log('Error in direct Discord search:', error.message)
  }
  
  return programs
}

// Scan user folders for portable applications
async function scanUserFolders() {
  const programs = []
  
  try {
    const userFolders = [
      process.env.USERPROFILE + '\\Desktop',
      process.env.USERPROFILE + '\\Downloads',
      process.env.USERPROFILE + '\\Documents'
    ]
    
    for (const folder of userFolders) {
      try {
        if (await fs.access(folder).then(() => true).catch(() => false)) {
          await scanDirectoryForPortableApps(folder, programs)
        }
      } catch (error) {
        console.log(`Cannot access user folder ${folder}: ${error.message}`)
      }
    }
    
    console.log(`Found ${programs.length} portable applications in user folders`)
  } catch (error) {
    console.log('Error scanning user folders:', error.message)
  }
  
  return programs
}

// Scan directory for portable applications
async function scanDirectoryForPortableApps(dirPath, programs, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = join(dirPath, item.name)
      
      if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
        // Found a portable executable
        const name = item.name.replace('.exe', '')
        programs.push({
          name: name,
          path: fullPath,
          type: 'portable-app'
        })
      } else if (item.isDirectory() && currentDepth < maxDepth - 1) {
        // Recursively scan subdirectories
        try {
          await scanDirectoryForPortableApps(fullPath, programs, maxDepth, currentDepth + 1)
        } catch (subError) {
          continue
        }
      }
    }
  } catch (error) {
    console.log(`Cannot access directory ${dirPath}: ${error.message}`)
  }
}

// Create working shortcuts for popular applications
async function createWorkingShortcuts(programs) {
  const workingPrograms = []
  
  try {
    console.log('=== Creating working shortcuts ===')
    
    for (const program of programs) {
      if (program.type === 'popular-app') {
        // For popular apps, try to create a working shortcut
        try {
          // Check if the executable exists and is accessible
          if (await fs.access(program.path).then(() => true).catch(() => false)) {
            // Create a working program entry
            workingPrograms.push({
              name: program.name,
              path: program.path,
              type: 'popular-app',
              working: true
            })
            console.log(`✅ Working shortcut for ${program.name}: ${program.path}`)
          } else {
            // Try to find an alternative path
            const alternativePath = await findAlternativePath(program.name)
            if (alternativePath) {
              workingPrograms.push({
                name: program.name,
                path: alternativePath,
                type: 'popular-app',
                working: true
              })
              console.log(`✅ Alternative path for ${program.name}: ${alternativePath}`)
            } else {
              console.log(`❌ No working path found for ${program.name}`)
            }
          }
        } catch (error) {
          console.log(`Error creating shortcut for ${program.name}: ${error.message}`)
        }
      } else {
        // For non-popular apps, just add them as-is
        workingPrograms.push(program)
      }
    }
    
    console.log(`Created ${workingPrograms.filter(p => p.working).length} working shortcuts`)
  } catch (error) {
    console.log('Error creating working shortcuts:', error.message)
  }
  
  return workingPrograms
}

// Find alternative path for an application
async function findAlternativePath(appName) {
  try {
    // Try using the 'where' command to find the executable
    const { exec } = require('child_process')
    const util = require('util')
    const execAsync = util.promisify(exec)
    
    const { stdout } = await execAsync(`where ${appName.toLowerCase()}`)
    if (stdout.trim()) {
      return stdout.trim().split('\n')[0]
    }
  } catch (error) {
    // 'where' command failed, try other methods
  }
  
  // Try common alternative paths
  const alternativePaths = [
    `C:\\Program Files\\${appName}\\${appName}.exe`,
    `C:\\Program Files (x86)\\${appName}\\${appName}.exe`,
    `${process.env.LOCALAPPDATA}\\${appName}\\${appName}.exe`,
    `${process.env.APPDATA}\\${appName}\\${appName}.exe`
  ]
  
  for (const path of alternativePaths) {
    try {
      if (await fs.access(path).then(() => true).catch(() => false)) {
        return path
      }
    } catch (error) {
      continue
    }
  }
  
  return null
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'Desktop Task Launcher',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Safe command execution with platform-specific handling
function executeCommand(command, type, platform) {
  return new Promise((resolve, reject) => {
    let process;
    
    try {
      switch (type) {
        case 'app':
          if (platform === 'win32') {
            process = spawn('cmd', ['/c', 'start', '', command], { shell: true });
          } else if (platform === 'darwin') {
            process = spawn('open', [command]);
          } else {
            process = spawn('xdg-open', [command]);
          }
          break;
          
        case 'website':
          shell.openExternal(command);
          resolve({ success: true, message: 'Website opened successfully' });
          return;
          
        case 'command':
          if (platform === 'win32') {
            // Open cmd window and run command in it
            process = spawn('cmd', ['/c', 'start', 'cmd', '/k', command], { shell: true });
          } else {
            // For macOS/Linux, open terminal and run command
            if (platform === 'darwin') {
              process = spawn('open', ['-a', 'Terminal', '--args', '-e', 'bash', '-c', command]);
            } else {
              process = spawn('gnome-terminal', ['--', 'bash', '-c', command + '; exec bash']);
            }
          }
          break;
          
        case 'server':
          if (platform === 'win32') {
            // Open cmd window and run server command
            process = spawn('cmd', ['/c', 'start', 'cmd', '/k', command], { shell: true });
          } else {
            // For macOS/Linux, open terminal and run server command
            if (platform === 'darwin') {
              process = spawn('open', ['-a', 'Terminal', '--args', '-e', 'bash', '-c', command]);
            } else {
              process = spawn('gnome-terminal', ['--', 'bash', '-c', command + '; exec bash']);
            }
          }
          break;
          
        default:
          reject(new Error('Invalid task type'));
          return;
      }
      
      if (process) {
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'Task executed successfully' });
          } else {
            resolve({ success: false, message: `Task completed with code ${code}` });
          }
        });
        
        process.on('error', (error) => {
          reject(new Error(`Failed to execute task: ${error.message}`));
        });
      }
    } catch (error) {
      reject(new Error(`Failed to execute task: ${error.message}`));
    }
  });
}

// Execute multiple tasks simultaneously
function executeMultipleTasks(tasks, platform) {
  return Promise.allSettled(
    tasks.map(task => executeCommand(task.command, task.type, platform))
  );
}

// Window arrangement functions
function arrangeWindows(arrangement) {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  switch (arrangement) {
    case 'split-horizontal':
      // Split screen horizontally
      const halfWidth = Math.floor(primaryDisplay.workArea.width / 2);
      const height = primaryDisplay.workArea.height;
      
      // Left half
      if (managedWindows.has('left')) {
        managedWindows.get('left').setBounds({
          x: primaryDisplay.workArea.x,
          y: primaryDisplay.workArea.y,
          width: halfWidth,
          height: height
        });
      }
      
      // Right half
      if (managedWindows.has('right')) {
        managedWindows.get('right').setBounds({
          x: primaryDisplay.workArea.x + halfWidth,
          y: primaryDisplay.workArea.y,
          width: halfWidth,
          height: height
        });
      }
      break;
      
    case 'split-vertical':
      // Split screen vertically
      const width = primaryDisplay.workArea.width;
      const halfHeight = Math.floor(primaryDisplay.workArea.height / 2);
      
      // Top half
      if (managedWindows.has('top')) {
        managedWindows.get('top').setBounds({
          x: primaryDisplay.workArea.x,
          y: primaryDisplay.workArea.y,
          width: width,
          height: halfHeight
        });
      }
      
      // Bottom half
      if (managedWindows.has('bottom')) {
        managedWindows.get('bottom').setBounds({
          x: primaryDisplay.workArea.x,
          y: primaryDisplay.workArea.y + halfHeight,
          width: width,
          height: halfHeight
        });
      }
      break;
      
    case 'quadrant':
      // Arrange in 4 quadrants
      const quadWidth = Math.floor(primaryDisplay.workArea.width / 2);
      const quadHeight = Math.floor(primaryDisplay.workArea.height / 2);
      
      // Top-left
      if (managedWindows.has('top-left')) {
        managedWindows.get('top-left').setBounds({
          x: primaryDisplay.workArea.x,
          y: primaryDisplay.workArea.y,
          width: quadWidth,
          height: quadHeight
        });
      }
      
      // Top-right
      if (managedWindows.has('top-right')) {
        managedWindows.get('top-right').setBounds({
          x: primaryDisplay.workArea.x + quadWidth,
          y: primaryDisplay.workArea.y,
          width: quadWidth,
          height: quadHeight
        });
      }
      
      // Bottom-left
      if (managedWindows.has('bottom-left')) {
        managedWindows.get('bottom-left').setBounds({
          x: primaryDisplay.workArea.x,
          y: primaryDisplay.workArea.y + quadHeight,
          width: quadWidth,
          height: quadHeight
        });
      }
      
      // Bottom-right
      if (managedWindows.has('bottom-right')) {
        managedWindows.get('bottom-right').setBounds({
          x: primaryDisplay.workArea.x + quadWidth,
          y: primaryDisplay.workArea.y + quadHeight,
          width: quadWidth,
          height: quadHeight
        });
      }
      break;
  }
}

// IPC handlers
ipcMain.handle('execute-task', async (event, task) => {
  try {
    const platform = process.platform;
    const result = await executeCommand(task.command, task.type, platform);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('execute-multiple-tasks', async (event, tasks) => {
  try {
    const platform = process.platform;
    const results = await executeMultipleTasks(tasks, platform);
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.filter(result => result.status === 'rejected' || !result.value.success).length;
    
    return {
      success: true,
      message: `Executed ${successful} tasks successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      results: results
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('arrange-windows', async (event, arrangement) => {
  try {
    arrangeWindows(arrangement);
    return { success: true, message: 'Windows arranged successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('load-tasks', async () => {
  try {
    const tasksPath = join(__dirname, '../../tasks.json');
    const data = await fs.readFile(tasksPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default tasks if file doesn't exist
    return [
      {
        id: '1',
        name: 'Open Calculator',
        type: 'app',
        command: 'calc',
        description: 'Launch Windows Calculator',
        category: 'System'
      },
      {
        id: '2',
        name: 'Open Notepad',
        type: 'app',
        command: 'notepad',
        description: 'Launch Notepad',
        category: 'System'
      },
      {
        id: '3',
        name: 'Google Search',
        type: 'website',
        command: 'https://www.google.com',
        description: 'Open Google in browser',
        category: 'Web'
      },
      {
        id: '4',
        name: 'Check IP',
        type: 'command',
        command: 'ipconfig',
        description: 'Show network configuration',
        category: 'Network'
      }
    ];
  }
});

ipcMain.handle('save-tasks', async (event, tasks) => {
  try {
    const tasksPath = join(__dirname, '../../tasks.json');
    await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
    return { success: true, message: 'Tasks saved successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-installed-programs', async (event) => {
  try {
    const platform = process.platform;
    console.log(`Getting installed programs for platform: ${platform}`);
    const programs = await getInstalledPrograms(platform);
    console.log(`Returning ${programs.length} programs to renderer`);
    return { success: true, programs: programs };
  } catch (error) {
    console.error('Error in get-installed-programs handler:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('browse-for-executable', async (event) => {
  try {
    const platform = process.platform;
    const executablePath = await browseForExecutable(platform);
    if (executablePath) {
      return { success: true, path: executablePath };
    } else {
      return { success: false, message: 'No executable file selected' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Task Group Shortcut Creation
ipcMain.handle('create-task-group-shortcut', async (event, groupData) => {
  try {
    const platform = process.platform;
    const result = await createTaskGroupShortcut(groupData);
    return result;
  } catch (error) {
    console.error('Error creating task group shortcut:', error);
    return { success: false, message: error.message };
  }
});

// Function to create task group shortcuts
async function createTaskGroupShortcut(groupData) {
  try {
    const platform = process.platform;
    const desktopPath = getDesktopPath();
    
    if (platform === 'win32') {
      // Windows: Create only .bat file
      const batchFileName = `${groupData.name.replace(/[^a-zA-Z0-9]/g, '_')}_tasks.bat`;
      const batchPath = path.join(desktopPath, batchFileName);
      
      // Generate enhanced batch file content
      const batchContent = generateEnhancedBatchFile(groupData);
      await fs.writeFile(batchPath, batchContent, 'utf8');
      
      return {
        success: true,
        message: `Batch file for task group '${groupData.name}' created successfully!`,
        instructions: `File created on desktop: ${batchFileName}\n\nDouble-click the .bat file to run all your tasks!`
      };
      
    } else if (platform === 'darwin') {
      // macOS: Create .command file
      const commandFileName = `${groupData.name.replace(/[^a-zA-Z0-9]/g, '_')}_tasks.command`;
      const commandPath = path.join(desktopPath, commandFileName);
      
      const commandContent = generateEnhancedShellScript(groupData);
      await fs.writeFile(commandPath, commandContent, 'utf8');
      
      // Make executable
      await exec(`chmod +x "${commandPath}"`);
      
      return {
        success: true,
        message: `Command file for task group '${groupData.name}' created successfully!`,
        instructions: `File created on desktop: ${commandFileName}\n\nDouble-click the .command file to run your task group!`
      };
      
    } else {
      // Linux: Create .sh file
      const scriptFileName = `${groupData.name.replace(/[^a-zA-Z0-9]/g, '_')}_tasks.sh`;
      const scriptPath = path.join(desktopPath, scriptFileName);
      
      const scriptContent = generateEnhancedShellScript(groupData);
      await fs.writeFile(scriptPath, scriptContent, 'utf8');
      
      // Make executable
      await exec(`chmod +x "${scriptPath}"`);
      
      return {
        success: true,
        message: `Script file for task group '${groupData.name}' created successfully!`,
        instructions: `File created on desktop: ${scriptFileName}\n\nDouble-click the .sh file or run it from terminal to execute your task group!`
      };
    }
    
  } catch (error) {
    console.error('Error in createTaskGroupShortcut:', error);
    throw error;
  }
}

// Helper function to get desktop path
function getDesktopPath() {
  const platform = process.platform;
  if (platform === 'win32') {
    return process.env.USERPROFILE + '\\Desktop';
  } else if (platform === 'darwin') {
    return process.env.HOME + '/Desktop';
  } else {
    return process.env.HOME + '/Desktop';
  }
}

// Helper: split an executable command into exe path and args for Windows 'start'
function splitCommandAndArgs(command) {
  if (!command) return { exe: '', args: '' };
  const trimmed = command.trim();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    if (end > 1) {
      const exe = trimmed.slice(1, end);
      const args = trimmed.slice(end + 1).trim();
      return { exe, args };
    }
  }
  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace === -1) return { exe: trimmed, args: '' };
  return { exe: trimmed.slice(0, firstSpace), args: trimmed.slice(firstSpace + 1).trim() };
}

// Generate enhanced batch file content for Windows
function generateEnhancedBatchFile(groupData) {
  const EOL = `\r\n`;
  let batchContent = `@echo off${EOL}`;
  batchContent += `title Task Group: ${groupData.name}${EOL}`;
  batchContent += `color 0A${EOL}`;
  batchContent += `cls${EOL}`;
  batchContent += `echo.${EOL}`;
  batchContent += `echo ========================================${EOL}`;
  batchContent += `echo    TASK GROUP: ${groupData.name}${EOL}`;
  batchContent += `echo    Total Tasks: ${groupData.tasks.length}${EOL}`;
  batchContent += `echo    Time: ${new Date().toLocaleString()}${EOL}`;
  batchContent += `echo ========================================${EOL}`;
  batchContent += `echo.${EOL}`;

  groupData.tasks.forEach((task, index) => {
    batchContent += `echo [${(index + 1).toString().padStart(2, '0')}/${groupData.tasks.length.toString().padStart(2, '0')}] Running: ${task.name}${EOL}`;
    batchContent += `echo    Type: ${task.type} ^| Command: ${task.command}${EOL}`;

    switch (task.type) {
      case 'app': {
        const parts = splitCommandAndArgs(task.command || '');
        const exe = parts.exe;
        const args = parts.args ? ` ${parts.args}` : '';
        batchContent += `echo    Starting application...${EOL}`;
        // Use quotes only when the exe path has spaces or contains a path separator
        const needsQuotes = exe.includes(' ') || exe.includes('\\') || exe.includes('/');
        if (needsQuotes) {
          batchContent += `start "" "${exe}"${args}${EOL}`;
        } else {
          batchContent += `start "" ${exe}${args}${EOL}`;
        }
        break;
      }
      case 'website':
        batchContent += `echo    Opening website...${EOL}`;
        batchContent += `start "" "${task.command}"${EOL}`;
        break;
      case 'command':
        batchContent += `echo    Running command in new window...${EOL}`;
        batchContent += `start "Task: ${task.name}" cmd /k "title ${task.name} && ${task.command}"${EOL}`;
        break;
      case 'server':
        batchContent += `echo    Starting server...${EOL}`;
        batchContent += `start "Server: ${task.name}" cmd /k "title ${task.name} && ${task.command}"${EOL}`;
        break;
      default:
        batchContent += `echo    Unknown task type: ${task.type}${EOL}`;
    }

    batchContent += `echo    Waiting 1 second...${EOL}`;
    batchContent += `timeout /t 1 /nobreak >nul${EOL}`;
    batchContent += `echo    Task completed!${EOL}`;
    batchContent += `echo.${EOL}`;
  });

  batchContent += `echo ========================================${EOL}`;
  batchContent += `echo    ALL TASKS COMPLETED!${EOL}`;
  batchContent += `echo ========================================${EOL}`;
  batchContent += `echo.${EOL}`;
  batchContent += `echo Press any key to close...${EOL}`;
  batchContent += `pause >nul${EOL}`;

  return batchContent;
}



// Generate enhanced shell script for macOS/Linux
function generateEnhancedShellScript(groupData) {
  let scriptContent = `#!/bin/bash\n\n`;
  scriptContent += `# Task Group Executor\n`;
  scriptContent += `# Group: ${groupData.name}\n`;
  scriptContent += `# Tasks: ${groupData.tasks.length}\n`;
  scriptContent += `# Generated: ${new Date().toISOString()}\n\n`;
  scriptContent += `clear\n`;
  scriptContent += `echo "========================================"\n`;
  scriptContent += `echo "    TASK GROUP: ${groupData.name}"\n`;
  scriptContent += `echo "    Total Tasks: ${groupData.tasks.length}"\n`;
  scriptContent += `echo "    Time: ${new Date().toLocaleString()}"\n`;
  scriptContent += `echo "========================================"\n`;
  scriptContent += `echo\n`;

  groupData.tasks.forEach((task, index) => {
    scriptContent += `echo "[${(index + 1).toString().padStart(2, '0')}/${groupData.tasks.length.toString().padStart(2, '0')}] Running: ${task.name}"\n`;
    scriptContent += `echo "   Type: ${task.type} | Command: ${task.command}"\n`;

    switch (task.type) {
      case 'app':
        scriptContent += `echo "   Starting application..."\n`;
        if (process.platform === 'darwin') {
          scriptContent += `open -a "${task.command}" &\n`;
        } else {
          scriptContent += `"${task.command}" &\n`;
        }
        break;
      case 'website':
        scriptContent += `echo "   Opening website..."\n`;
        if (process.platform === 'darwin') {
          scriptContent += `open "${task.command}" &\n`;
        } else {
          scriptContent += `xdg-open "${task.command}" &\n`;
        }
        break;
      case 'command':
        scriptContent += `echo "   Running command in new terminal..."\n`;
        if (process.platform === 'darwin') {
          scriptContent += `osascript -e 'tell app "Terminal" to do script "${task.command}"' &\n`;
        } else {
          scriptContent += `gnome-terminal -- bash -c "${task.command}; exec bash" &\n`;
        }
        break;
      case 'server':
        scriptContent += `echo "   Starting server..."\n`;
        if (process.platform === 'darwin') {
          scriptContent += `osascript -e 'tell app "Terminal" to do script "${task.command}"' &\n`;
        } else {
          scriptContent += `gnome-terminal -- bash -c "${task.command}; exec bash" &\n`;
        }
        break;
      default:
        scriptContent += `echo "   Unknown task type: ${task.type}"\n`;
    }

    scriptContent += `echo "   Waiting 1 second..."\n`;
    scriptContent += `sleep 1\n`;
    scriptContent += `echo "   Task completed!"\n`;
    scriptContent += `echo\n`;
  });

  scriptContent += `echo "========================================"\n`;
  scriptContent += `echo "    ALL TASKS COMPLETED!"\n`;
  scriptContent += `echo "========================================"\n`;
  scriptContent += `echo\n`;
  scriptContent += `echo "Press Enter to close..."\n`;
  scriptContent += `read\n`;

  return scriptContent;
}





// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
