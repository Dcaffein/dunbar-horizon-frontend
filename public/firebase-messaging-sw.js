importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// 업데이트된 SW가 즉시 활성화되고 현재 열린 페이지를 제어하도록 함
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: 'AIzaSyDJmI1EHrOp0GGH1Q6TvQoUkdq9GBuNRJw',
  authDomain: 'dunbarhorizon.firebaseapp.com',
  projectId: 'dunbarhorizon',
  storageBucket: 'dunbarhorizon.firebasestorage.app',
  messagingSenderId: '743453934821',
  appId: '1:743453934821:web:91264e2fbad11ea7af800c',
});

const messaging = firebase.messaging();

// 백그라운드/종료 상태에서는 OS 알림 표시 안 함 (포그라운드 onMessage만 사용)
messaging.onBackgroundMessage(() => {});
