// Firebase初期化設定
const firebaseConfig = {
    apiKey: "AIzaSyBwwyt71iwFNFJoHBxibe5D0rHXbKcCFf0",
    authDomain: "private-booth-8a45b.firebaseapp.com",
    projectId: "private-booth-8a45b",
    storageBucket: "private-booth-8a45b.firebasestorage.app",
    messagingSenderId: "878271651490",
    appId: "1:878271651490:web:49ed9baaf58da969f981fb",
    measurementId: "G-PJQ5Y18LJ6"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firestore初期化
const db = firebase.firestore();

// コレクション参照
const reservationsCollection = db.collection('reservations');
const coursesCollection = db.collection('courses');
const logsCollection = db.collection('reservation_logs');

// エクスポート
window.firebase = firebase;
window.db = db;
window.reservationsCollection = reservationsCollection;
window.coursesCollection = coursesCollection;
window.logsCollection = logsCollection;
