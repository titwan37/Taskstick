// src/main.ts
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { MainAppComponent } from './app/main-app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { routes } from './app/app.routes';

// Bootstrap logic
bootstrapApplication(MainAppComponent, {
    providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideMonacoEditor({
            baseUrl: 'assets/monaco/min/vs'
        })
    ]
}).catch(err => console.error(err));
