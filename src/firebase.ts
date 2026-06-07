import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA7Dux4z96JWP2-UbUQtBFDbv9VRvM2mq0",
  authDomain: "recipe-vault-e5912.firebaseapp.com",
  projectId: "recipe-vault-e5912",
  storageBucket: "recipe-vault-e5912.firebasestorage.app",
  messagingSenderId: "802055004489",
  appId: "1:802055004489:web:b4332fa2b8c3cc05157a98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service with ignoreUndefinedProperties
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
export default app;
