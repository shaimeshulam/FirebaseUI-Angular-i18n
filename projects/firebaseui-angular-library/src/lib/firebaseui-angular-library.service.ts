import { Inject, Injectable, NgZone, Optional } from '@angular/core';
import { FirebaseApp, FIREBASE_APP_NAME, FIREBASE_OPTIONS, ɵfirebaseAppFactory } from '@angular/fire/compat';
import { USE_EMULATOR as USE_AUTH_EMULATOR } from '@angular/fire/compat/auth';
import { FirebaseAppSettings, FirebaseOptions } from 'firebase/app';
import _firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui';
import { Subject } from 'rxjs';
import { DynamicLoaderService, Resource } from './dynamic-loader.service';
import { ExtendedFirebaseUIAuthConfig, FirebaseUILanguages } from './firebaseui-angular-library.helper';
import * as jsonVersion from "./version.json";

declare const global: any;

const FIREBASEUI_CDN_VERSION = jsonVersion.firebaseUiVersion || "4.7.3";
const FIREBASEUI_CDN_URL = `https://www.gstatic.com/firebasejs/ui/${FIREBASEUI_CDN_VERSION}`;


@Injectable()
export class FirebaseuiAngularLibraryService {

  private static firebaseUiInstance: firebaseui.auth.AuthUI | undefined = undefined;
  private static uiInstanceObservable: Subject<firebaseui.auth.AuthUI> = new Subject<firebaseui.auth.AuthUI>();

  private static currentLanguageCode: string = "";
  private static firstLoad: boolean = true;

  private firebaseInstance: FirebaseApp;

  constructor(
    @Inject('firebaseUIAuthConfig') private _firebaseUiConfig: ExtendedFirebaseUIAuthConfig,
    @Inject(FIREBASE_OPTIONS) options: FirebaseOptions,
    @Optional() @Inject(FIREBASE_APP_NAME) nameOrConfig: string | FirebaseAppSettings | null | undefined,
    @Optional() @Inject(USE_AUTH_EMULATOR) private _useEmulator: any, // can't use the tuple here
    private _scriptLoaderService: DynamicLoaderService,
    zone: NgZone) {

    // noinspection JSNonASCIINames
    this.firebaseInstance = ɵfirebaseAppFactory(options, zone, nameOrConfig);
  }

  /**
   * Creates a new instance of FirebaseUI
   */
  private instantiateFirebaseUI() {
    const auth: _firebase.auth.Auth = this.firebaseInstance.auth();
    if (this._useEmulator) {
      auth.useEmulator(`http://${this._useEmulator.join(':')}`);
    }

    FirebaseuiAngularLibraryService.firebaseUiInstance = new firebaseui.auth.AuthUI(auth);
    FirebaseuiAngularLibraryService.uiInstanceObservable.next(FirebaseuiAngularLibraryService.firebaseUiInstance);
  }

  //#region Changes made to the original lib to support i18n

  /**
   * Changes language of the currently displayed Firebase UI instance
   * @param languageCode One of the codes specified by a "FirebaseUILanguage" object
   */
  async setLanguage(languageCode: string) {
    if (FirebaseuiAngularLibraryService.firebaseUiInstance) {
      await FirebaseuiAngularLibraryService.firebaseUiInstance.delete();
    }

    const previousLanguageCode = FirebaseuiAngularLibraryService.currentLanguageCode;
    const previousLanguage = previousLanguageCode ? this.getLanguageByCode(previousLanguageCode) : null;

    FirebaseuiAngularLibraryService.currentLanguageCode = languageCode ? languageCode.toLowerCase() : "en";

    if (!languageCode || (languageCode.toLowerCase() === "en" && FirebaseuiAngularLibraryService.firstLoad)) {
      console.log("[service] using lib from npm bundles");
      return this.instantiateFirebaseUI();
    }

    FirebaseuiAngularLibraryService.firstLoad = false;
    const languages = FirebaseUILanguages.filter((l) => l.code.toLowerCase() === languageCode.toLowerCase());

    if (languages.length !== 1) {
      throw new Error("Invalid language code");
    }

    // Otherwise we'll use a version of the same library from CDN.
    // Expose a reference to the firebase object or the firebaseui won't work
    if (typeof window !== "undefined" && typeof window.firebase === "undefined") {
      // Semi-cheat: firebaseInstance is an instance of FirebaseApp,
      // but FirebaseUI uses an instance of the "vanilla" Firebase object (hence the cast to any and the "".firebase_" part)
      (window as any).firebase = _firebase;
    }

    if (typeof global !== "undefined" && typeof global["firebase"] === "undefined") {
      global["firebase"] = _firebase;
    }

    const language = languages[0];
    const toLoad: Resource[] = [
      {
        name: `firebaseui-${language.code}`,
        type: "js",
        src: `${FIREBASEUI_CDN_URL}/firebase-ui-auth__${language.code}.js`
      }
    ];

    // If the selected language is a Right to Left one, load also the special css file
    if (language.isRtL) {
      toLoad.push({
        name: "firebaseui-css-rtl",
        type: "css",
        src: `${FIREBASEUI_CDN_URL}/firebase-ui-auth-rtl.css`
      });
    }

    // If we had previsouly loaded another language that was a RtL one and current one is not,
    //    we need to load the LtR css
    if (previousLanguage && previousLanguage.isRtL && !language.isRtL) {
      toLoad.push({
        name: "firebaseui-css",
        type: "css",
        src: `${FIREBASEUI_CDN_URL}/firebase-ui-auth.css`
      });
    }

    await this._scriptLoaderService.registerAndLoad(...toLoad);

    // and create a new firebaseui instance, using the imported firebaseui
    return this.instantiateFirebaseUI();
  }

  /**
  * Returns the currently selected language, as an instance of FirebaseUILanguage.
  * If no previous language was set, it will return language specified in the ".forRoot" method of this module.
  * If the parameter "language" was not set, it will defualt to English
  */
  getCurrentLanguage() {
    return this.getLanguageByCode(FirebaseuiAngularLibraryService.currentLanguageCode || this._firebaseUiConfig.language || "en");
  }

  /**
   * This method returns the observable of the Firebase UI instance
   */
  getFirebaseUiObservable = () => FirebaseuiAngularLibraryService.uiInstanceObservable;

  /**
   * Given a FirebaseUILanguage code, it returns the matching object
   * @param code Language code
   */
  private getLanguageByCode(code: string) {
    const matching = FirebaseUILanguages.filter((lang) => lang.code.toLowerCase() === code.toLowerCase());

    if (matching.length === 1) {
      return matching[0];
    }

    return null;
  }

  //#endregion

}
