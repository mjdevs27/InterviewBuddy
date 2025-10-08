import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
// import { initializeApp } from "firebase/app";



// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apikey: process.env.FIREBASE_CLIENT_API_KEY,
    authDomain: "interviewbud-86117.firebaseapp.com",
    projectId: "interviewbud-86117",
    storageBucket: "interviewbud-86117.firebasestorage.app",
    messagingSenderId: "251256393077",
    appId: "1:251256393077:web:042eb3e3f7b1ea6982d73c",
    measurementId: "G-YHPYSX4KGT"
};

// Initialize Firebase
const app = !getApps.length ?initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);