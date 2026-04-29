// src/main.ts
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { MainAppComponent } from './app/main-app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app/app.routes';
// Bootstrap logic
bootstrapApplication(MainAppComponent, {
    providers: [
        provideRouter(routes, withComponentInputBinding())
    ]
}).catch(err => console.error(err));
