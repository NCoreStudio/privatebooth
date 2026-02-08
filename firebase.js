// Firebase初期化設定
// 以下の設定値を実際のFirebaseプロジェクトの値に差し替えてください
const firebaseConfig = {
    apiKey: "your-api-key-here",                    // 実際のAPIキーに差し替え
    authDomain: "your-project-id.firebaseapp.com",  // 実際の認証ドメインに差し替え
    projectId: "your-project-id",                    // 実際のプロジェクトIDに差し替え
    storageBucket: "your-project-id.appspot.com",   // 実際のストレージバケットに差し替え
    messagingSenderId: "123456789",                  // 実際の送信者IDに差し替え
    appId: "1:123456789:web:abcdef123456"           // 実際のアプリIDに差し替え
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
