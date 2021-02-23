// @ts-check
const gulp = require("gulp");
const fs = require("fs");
const path = require("path");


const PACKAGE_JSON = "package.json";
const FIREBASE_UI_PACKAGE_NAME = "firebaseui";
const VERSION_FILE = path.join(__dirname, "projects/firebaseui-angular-library/src/lib/version.json");
const FIREBASE_UI_VERSION_KEY_NAME = "firebaseUiVersion";


const Tasks = Object.freeze({
    SetFirebaseUiVersion: "SetFirebaseUiVersion"
});

/**
 * Update firebaseui version used when loading from CDN.
 * In this way versions are synchronized
 */
gulp.task(Tasks.SetFirebaseUiVersion, (done) => {
    const packageFile = fs.readFileSync(path.join(__dirname, PACKAGE_JSON)).toString();
    const packageJson = JSON.parse(packageFile);

    const firebaseUiVersion = packageJson["dependencies"][FIREBASE_UI_PACKAGE_NAME];
    const version = firebaseUiVersion.split(".").map((v) => v.replace(/[^0-9]/g, "")).join(".")

    const fileContent = fs.readFileSync(VERSION_FILE).toString();
    const versionJson = JSON.parse(fileContent);

    versionJson[FIREBASE_UI_VERSION_KEY_NAME] = version;

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionJson, null, 4));

    return done();
});


gulp.task("default", done => {
    return gulp.task(Tasks.SetFirebaseUiVersion)(done);
});
