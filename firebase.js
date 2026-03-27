import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASHOE-oYhkZodCTqTJKVboQJAPk90uCfg",
  authDomain: "eid-kiba.firebaseapp.com",
  projectId: "eid-kiba",
  storageBucket: "eid-kiba.firebasestorage.app",
  messagingSenderId: "648306395864",
  appId: "1:648306395864:web:ede37ffeac918276cae5ad"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
