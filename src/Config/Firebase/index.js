// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZcvirqrXi2hcFx-mcbnTKxTt-3OEXYXc",
  authDomain: "sistem-pendukung-keputus-b3f18.firebaseapp.com",
  projectId: "sistem-pendukung-keputus-b3f18",
  storageBucket: "sistem-pendukung-keputus-b3f18.firebasestorage.app",
  messagingSenderId: "279383087334",
  appId: "1:279383087334:web:85e358102e534b3ed68327",
  databaseURL:
    "https://sistem-pendukung-keputus-b3f18-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
