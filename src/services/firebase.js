// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "api-key",
    authDomain: "hangman-16d87.firebaseapp.com",
    projectId: "hangman-16d87",
    storageBucket: "hangman-16d87.appspot.com",
    messagingSenderId: "629008964187",
    appId: "1:629008964187:web:6f5d7a062868e068247d7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
