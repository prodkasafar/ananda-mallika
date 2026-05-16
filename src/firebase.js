// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYKybrNf7GzjuYhaYJbNIuX7neHC3HTRE",
  authDomain: "homestay-pms.firebaseapp.com",
  projectId: "homestay-pms",
  storageBucket: "homestay-pms.firebasestorage.app",
  messagingSenderId: "76408424392",
  appId: "1:76408424392:web:57a27a39c8aa5a079ba2fd",
  measurementId: "G-PG3MWRPHH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);