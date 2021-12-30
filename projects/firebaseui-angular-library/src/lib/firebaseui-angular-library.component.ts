import { Component, EventEmitter, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Optional, Output, SimpleChanges } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import * as firebaseui from 'firebaseui';
import { Subscription } from 'rxjs';
import {
  ExtendedFirebaseUIAuthConfig,
  FirebaseUISignInFailure,
  FirebaseUISignInSuccessWithAuthResult
} from './firebaseui-angular-library.helper';
import { FirebaseuiAngularLibraryService } from './firebaseui-angular-library.service';

import User = firebase.User;
import UserCredential = firebase.auth.UserCredential;
import AuthUI = firebaseui.auth.AuthUI;


@Component({
  selector: 'firebase-ui',
  template: '<div id="firebaseui-auth-container"></div>'
})
export class FirebaseuiAngularLibraryComponent implements OnInit, OnDestroy, OnChanges {
  private static readonly COMPUTED_CALLBACKS = 'COMPUTED_CALLBACKS';
  private firebaseUISubscription: Subscription;

  @Optional() @Input("language") language: string;

  @Output('signInSuccessWithAuthResult') signInSuccessWithAuthResultCallback: EventEmitter<FirebaseUISignInSuccessWithAuthResult> = new EventEmitter(); // tslint:disable-line
  @Output('signInFailure') signInFailureCallback: EventEmitter<FirebaseUISignInFailure> = new EventEmitter(); // tslint:disable-line
  @Output('uiShown') uiShownCallback: EventEmitter<void> = new EventEmitter(); // tslint:disable-line

  private subscription: Subscription;

  constructor(private angularFireAuth: AngularFireAuth,
    @Inject('firebaseUIAuthConfig') private _firebaseUiConfig: ExtendedFirebaseUIAuthConfig,
    @Inject('firebaseUIAuthConfigFeature') private _firebaseUiConfig_Feature: ExtendedFirebaseUIAuthConfig,
    private ngZone: NgZone,
    private firebaseUIService: FirebaseuiAngularLibraryService) {
    this.firebaseUISubscription = this.firebaseUIService.getFirebaseUiObservable().subscribe((fireUIInstance: AuthUI) => {
      this.firebaseUIPopup(fireUIInstance);
    });
  }

  async ngOnChanges(changes: SimpleChanges) {
    await this.firebaseUIService.setLanguage(changes.language.currentValue);
  }

  get firebaseUiConfig(): ExtendedFirebaseUIAuthConfig {
    return {
      ...this._firebaseUiConfig,
      ...this._firebaseUiConfig_Feature
    };
  }

  ngOnInit(): void {
    this.subscription = this.angularFireAuth.authState.subscribe((value: User) => {
      if ((value && value.isAnonymous) || !value) {
        if (this.firebaseUiConfig.signInOptions.length !== 0) {
          // initialization of ngOnChanges occurs only when language value is accepted as @input. fire manually if it is not
          if (!this.language) {
            this.firebaseUIService.setLanguage('en');
          }
        } else {
          throw new Error('There must be at least one AuthProvider.');
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (!!this.subscription) {
      this.subscription.unsubscribe();
    }
    if (!!this.firebaseUISubscription) {
      this.firebaseUISubscription.unsubscribe();
    }
  }

  private getUIAuthConfig(): ExtendedFirebaseUIAuthConfig {
    if (!this.firebaseUiConfig.callbacks) {
      this._firebaseUiConfig[FirebaseuiAngularLibraryComponent.COMPUTED_CALLBACKS] = true;
      this._firebaseUiConfig.callbacks = this.getCallbacks();
    }
    return this.firebaseUiConfig;
  }

  private firebaseUIPopup(firebaseUiInstance: AuthUI) {
    const uiAuthConfig = this.getUIAuthConfig();

    // Check if callbacks got computed to reset them again after providing the to firebaseui.
    // Necessary for allowing updating the firebaseui config during runtime.
    let resetCallbacks = false;
    if (uiAuthConfig[FirebaseuiAngularLibraryComponent.COMPUTED_CALLBACKS]) {
      resetCallbacks = true;
      delete uiAuthConfig[FirebaseuiAngularLibraryComponent.COMPUTED_CALLBACKS];
    }

    delete uiAuthConfig.language;

    // show the firebaseui
    firebaseUiInstance.start('#firebaseui-auth-container', uiAuthConfig);

    if (resetCallbacks) {
      this._firebaseUiConfig.callbacks = null;
    }
  }

  private getCallbacks(): any { // firebaseui.Callbacks
    const signInSuccessWithAuthResultCallback = (authResult: UserCredential, redirectUrl: string) => {
      this.ngZone.run(() => {
        this.signInSuccessWithAuthResultCallback.emit({
          authResult,
          redirectUrl
        });
      });
      return this.firebaseUiConfig.signInSuccessUrl;
    };

    const signInFailureCallback = (error: firebaseui.auth.AuthUIError) => {
      this.ngZone.run(() => {
        this.signInFailureCallback.emit({
          code: error.code,
          credential: error.credential
        });
      });
      return Promise.reject();
    };

    const uiShownCallback = () => {
      this.ngZone.run(() => {
        this.uiShownCallback.emit();
      });
    };

    return {
      signInSuccessWithAuthResult: signInSuccessWithAuthResultCallback,
      signInFailure: signInFailureCallback,
      uiShown: uiShownCallback
    };
  }
}
