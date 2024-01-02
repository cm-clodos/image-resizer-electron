const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

process.env.NODE_ENV = "production"; // für App start im prod modus

// npx electronmon . für App start im dev modus mit aktualisierung des Windows
const isDev = process.env.NODE_ENV !== "production";
const isMac = process.platform === "darwin";

// global variable for main window
let mainWindow;

// create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // open with devtools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
}

function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
  });

  // load the about.html of the app
  aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
}

// App is ready
app.whenReady().then(() => {
  createMainWindow();

  // set menu Build and set
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // remove mainWindow from memory on close
  mainWindow.on("closed", () => (mainWindow = null));

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Menü Template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];

//Respond to ipcRenderer resize (options sind die daten die vom Renderer kommen)
ipcMain.on("image:resize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageresizer");
  resizeImage(options);
  //console.log(options);
});

//resize image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const resizedImage = await resizeImg(fs.readFileSync(imgPath), {
      width: Number(width),
      height: Number(height),
    });

    // create Filename
    const filename = path.basename(imgPath);

    //create dest folder if not exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // write file to dest
    fs.writeFileSync(path.join(dest, filename), resizedImage);

    // send success message to renderer
    mainWindow.webContents.send("image:done");

    //open dest folder
    shell.openPath(dest);
  } catch (error) {
    console.log(error);
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});
