import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTn8aUStr7_SP5tSQoDX1MSj1nkowcTLc",
  authDomain: "elite-pesa-task-reward-app.firebaseapp.com",
  projectId: "elite-pesa-task-reward-app",
  storageBucket: "elite-pesa-task-reward-app.firebasestorage.app",
  messagingSenderId: "667859878557",
  appId: "1:667859878557:web:203d2ee6e42ac942230a74"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
