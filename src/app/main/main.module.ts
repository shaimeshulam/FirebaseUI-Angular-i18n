import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FirebaseUIModule } from 'firebaseui-angular';
import { MainComponent } from './main.component';

const routes: Routes = [
  { path: '', component: MainComponent },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FirebaseUIModule.forFeature({ tosUrl: 'MAIN_MODULE' }),
    RouterModule.forChild(routes)
  ],
  declarations: [MainComponent]
})
export class MainModule {
}
