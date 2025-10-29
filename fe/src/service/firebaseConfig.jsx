// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

const firebaseConfig = {

  apiKey: "AIzaSyA2NL6ecSHGOwi1LROll74Uzx5WldGtYdU",

  authDomain: "ai-trip-planner-doan2025-a5c32.firebaseapp.com",

  projectId: "ai-trip-planner-doan2025-a5c32",

  storageBucket: "ai-trip-planner-doan2025-a5c32.firebasestorage.app",

  messagingSenderId: "892370985569",

  appId: "1:892370985569:web:2601110a3424ffa8b9c020"

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);