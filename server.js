// suitmedia-ideas/server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = 3000; // Kamu bisa ubah port ini jika ada konflik dengan aplikasi lain

// Definisikan URL target API di sini
const API_TARGET_URL = 'https://suitmedia-backend.suitdev.com';

// Serve static files (HTML, CSS, JS) dari folder saat ini
// Ini akan membuat file-file di folder 'suitmedia-ideas' bisa diakses
app.use(express.static(path.join(__dirname, '/')));

// Konfigurasi proxy untuk API
// Setiap request ke '/api' akan diteruskan ke 'https://suitmedia-backend.suitdev.com'
app.use('/api', createProxyMiddleware({
    target: API_TARGET_URL, // Menggunakan variabel yang sudah didefinisikan
    changeOrigin: true, // Penting untuk mengubah header Origin permintaan
    pathRewrite: {
        '^/api': '/api', // Menulis ulang path: '/api/ideas' menjadi '/api/ideas' di target
    },
    logLevel: 'debug', // Pertahankan ini untuk melihat log debug di terminal
}));

// Mulai server
app.listen(port, () => {
    console.log(`Server sedang berjalan di http://localhost:${port}`);
    console.log(`Permintaan ke /api akan diproxy ke ${API_TARGET_URL}`);
});