import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FirebaseuiAngularLibraryService, FirebaseUILanguages, FirebaseUISignInFailure, FirebaseUISignInSuccessWithAuthResult } from 'firebaseui-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'fbui-ng-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  public languages = FirebaseUILanguages;
  public currentLang: string = "";

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private firebaseUiService: FirebaseuiAngularLibraryService) {

    // Update the select element to match the language specified in the app.module.ts file during the initial configuration
    this.currentLang = this.firebaseUiService.getCurrentLanguage().code;
  }

  ngOnInit(): void {
    this.afAuth.authState.subscribe(d => console.log(d));
  }

  logout() {
    this.afAuth.signOut();
  }

  successCallback(data: FirebaseUISignInSuccessWithAuthResult) {
    console.log('successCallback', data);
    this.router.navigate(['page']);
  }

  errorCallback(data: FirebaseUISignInFailure) {
    console.warn('errorCallback', data);
  }

  uiShownCallback() {
    console.log('UI shown');
  }
}
