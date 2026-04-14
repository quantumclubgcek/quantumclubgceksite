import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
  apiKey: "AIzaSyC8ypx4n00CBBl7vQvSG77NX5jVv8CVWUU",
  authDomain: "quantumclubgcek1.firebaseapp.com",
  projectId: "quantumclubgcek1",
  storageBucket: "quantumclubgcek1.firebasestorage.app",
  messagingSenderId: "558526854086",
  appId: "1:558526854086:web:f1d5ae63018b2a8946b8c7"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

// Handle Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage("Login successful! Redirecting...", "text-green-400");
            
            // Redirect to your admin dashboard after 1 second
            setTimeout(() => {
                window.location.href = "/admin"; 
            }, 1000);
            
        } catch (error) {
            console.error("Login Error:", error.code);
            showMessage("Access Denied: Invalid credentials.", "text-red-400");
        }
    });
}

function showMessage(text, colorClass) {
    messageDiv.innerText = text;
    messageDiv.className = `mt-4 text-center text-sm ${colorClass}`;
    messageDiv.classList.remove('hidden');
}

// Optional: Auto-redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = "/admin";
    }
});