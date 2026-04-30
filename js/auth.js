'use strict';

import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
    browserLocalPersistence,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';

const AUTH_NOT_CONFIGURED = 'Firebase Auth is not configured. Set window.LAPIS_FIREBASE_CONFIG before loading auth.js.';

const authState = {
    app: null,
    auth: null,
    user: null,
    initPromise: null
};

function toPublicUser(user) {
    if (!user) return null;
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        providerId: user.providerId
    };
}

function setCurrentUser(user) {
    authState.user = toPublicUser(user);
}

function getConfig() {
    return window.LAPIS_FIREBASE_CONFIG || null;
}

function requireAuth() {
    if (!authState.auth) throw new Error(AUTH_NOT_CONFIGURED);
    return authState.auth;
}

async function initAuth() {
    if (authState.initPromise) return authState.initPromise;

    authState.initPromise = (async () => {
        const config = getConfig();
        if (!config) return null;

        authState.app = getApps().length ? getApp() : initializeApp(config);
        authState.auth = getAuth(authState.app);
        await setPersistence(authState.auth, browserLocalPersistence);
        onAuthStateChanged(authState.auth, setCurrentUser);
        return authState.auth;
    })();

    return authState.initPromise;
}

const AuthProvider = {
    async loginWithGoogle() {
        await initAuth();
        const result = await signInWithPopup(requireAuth(), new GoogleAuthProvider());
        setCurrentUser(result.user);
        return authState.user;
    },

    async loginWithEmail(email, password) {
        if (!email || !password) throw new Error('Email and password are required.');
        await initAuth();
        const result = await signInWithEmailAndPassword(requireAuth(), email, password);
        setCurrentUser(result.user);
        return authState.user;
    },

    async logout() {
        await initAuth();
        await signOut(requireAuth());
        setCurrentUser(null);
        return null;
    },

    getUser() {
        return authState.user;
    },

    isLoggedIn() {
        return !!authState.user;
    }
};

window.AuthProvider = AuthProvider;
initAuth().catch((error) => console.warn('[AuthProvider] init failed:', error));
