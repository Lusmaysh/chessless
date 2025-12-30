# 👑 Chessless

**Chessless** adalah aplikasi catur berbasis web modern dengan nuansa visual abad pertengahan (*medieval*). Aplikasi ini memungkinkan pengguna untuk bermain catur secara *online* melawan pemain lain (multiplayer) secara *real-time* atau berlatih melawan kecerdasan buatan (AI) menggunakan mesin Stockfish.

![Status Proyek](https://img.shields.io/badge/Status-Active-success)
![Lisensi](https://img.shields.io/badge/License-MIT-blue)

## 📋 Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Pratinjau](#-pratinjau)
- [Instalasi dan Penggunaan](#-instalasi-dan-penggunaan)
- [Konfigurasi Firebase](#-konfigurasi-firebase)
- [Struktur Proyek](#-struktur-proyek)
- [Kredit](#-kredit)

## ✨ Fitur Utama

### 🎮 Mode Permainan
* **Multiplayer Real-time:** Sistem lobi untuk membuat dan bergabung dalam pertempuran melawan pemain lain menggunakan Firebase Firestore.
* **Lawan AI (Stockfish):** Tantang diri Anda melawan komputer dengan berbagai tingkat kesulitan (Pemula hingga Grandmaster).
* **Kontrol Waktu:** Pilihan waktu yang fleksibel (1, 3, 5, 10, 30 menit, atau tak terbatas).

### 🏰 Antarmuka & Pengalaman Pengguna (UI/UX)
* **Tema Medieval:** Desain visual yang unik dengan palet warna kayu, emas, dan perkamen.
* **Responsif:** Tata letak yang menyesuaikan otomatis untuk Desktop (layar lebar) dan Mobile (layar sentuh).
* **Efek Suara:** Audio imersif untuk pergerakan, penangkapan bidak, *check*, dan akhir permainan.
* **Mekanisme Catur Lengkap:** Mendukung *pre-moves*, promosi bidak, *castling*, dan *en passant*.

### 🧠 Analisis & Riwayat
* **Riwayat Langkah (PGN):** Tampilan notasi catur standar untuk melacak jalannya permainan.
* **Analisis Pasca-Game:** Evaluasi posisi menggunakan Stockfish dengan visualisasi *bar advantage*.
* **Sistem Replay:** Putar ulang permainan yang tersimpan di riwayat lokal.

## 🛠 Teknologi yang Digunakan

Proyek ini dibangun menggunakan teknologi web standar dan library pihak ketiga yang kuat:

* **Frontend:** HTML5, CSS3 (Tailwind CSS via CDN).
* **Logika Catur:** [Chess.js](https://github.com/jhlywa/chess.js) (Validasi langkah dan aturan).
* **Kecerdasan Buatan:** [Stockfish.js](https://github.com/nmrugg/stockfish.js) (Mesin catur yang berjalan di browser).
* **Backend / Database:** Google Firebase (Authentication & Firestore) untuk sinkronisasi data *real-time*.
* **Ikon & Font:** Font Awesome & Google Fonts (Cinzel, MedievalSharp).

## 📸 Pratinjau

> *Catatan: Tambahkan screenshot aplikasi Anda di sini untuk menarik minat pengguna.*

1.  **Halaman Lobi:** Daftar room yang tersedia dan tombol buat permainan.
2.  **Papan Permainan:** Tampilan papan catur dengan panel timer dan profil pemain.
3.  **Mode Mobile:** Tampilan ringkas untuk perangkat seluler.

## 🚀 Instalasi dan Penggunaan

Karena proyek ini sebagian besar berbasis *client-side* dengan dependensi CDN, cara menjalankannya sangat mudah:

1.  **Clone Repository**
    ```bash
    git clone [https://github.com/lusmaysh/chessless.git](https://github.com/lusmaysh/chessless.git)
    cd chessless
    ```

2.  **Persiapkan Aset**
    Pastikan struktur folder aset sudah benar agar suara berfungsi:
    ```
    /assets
      /sfx
        capture.mp3
        game-end.mp3
        game-start.mp3
        move-self.mp3
    ```

3.  **Jalankan Aplikasi**
    Anda bisa membuka `index.html` secara langsung di browser, namun disarankan menggunakan *Live Server* (ekstensi VS Code) atau server lokal sederhana python agar tidak terkendala kebijakan CORS pada *Web Workers* (Stockfish).

    ```bash
    # Contoh menggunakan Python
    python -m http.server 8000
    ```
    Buka `http://localhost:8000` di browser.

## 🔥 Konfigurasi Firebase

Proyek ini menggunakan Google Firebase sebagai *backend* untuk autentikasi pemain dan sinkronisasi data permainan secara *real-time*. Ikuti langkah berikut agar aplikasi dapat berjalan:

1.  Buka [Firebase Console](https://console.firebase.google.com/) dan buat proyek baru.
2.  Masuk ke menu **Build** > **Authentication**, lalu aktifkan **Sign-in method** untuk **Anonymous**.
3.  Masuk ke menu **Build** > **Firestore Database**, lalu buat database baru (mulai dalam *test mode* untuk pengembangan).
4.  Pergi ke **Project Settings** > **General**, gulir ke bawah ke bagian "Your apps", dan pilih ikon web (</>).
5.  Salin konfigurasi `firebaseConfig` yang muncul.
6.  Buka file `index.html` di editor kode Anda, cari variabel `firebaseConfig`, dan timpa dengan konfigurasi milik Anda:

```javascript
// Di dalam file index.html
const firebaseConfig = {
  apiKey: "API_KEY_ANDA",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID",
  measurementId: "G-ANALYTICS"
};
```

## 📂 Struktur Proyek
Berikut adalah susunan folder dan file dalam proyek ini:

```plaintext
chessless/
├── assets/
│   └── sfx/              # Efek suara (Move, Capture, Check, Game Over)
├── .gitattributes        # Konfigurasi atribut Git
├── .gitignore            # Daftar file yang diabaikan oleh Git
├── index.html            # File utama (UI, Logika Permainan, & Koneksi Firebase)
└── README.md             # Dokumentasi proyek
```

## 🤝 Kontribusi

Kami sangat terbuka terhadap kontribusi! Jika Anda ingin menambahkan fitur baru, memperbaiki *bug*, atau meningkatkan desain antarmuka:

1.  **Fork** repositori ini ke akun GitHub Anda.
2.  Buat **Branch** baru untuk fitur Anda:
    ```bash
    git checkout -b fitur-keren
    ```
3.  Lakukan perubahan dan **Commit**:
    ```bash
    git commit -m 'Menambahkan fitur keren'
    ```
4.  **Push** ke branch Anda:
    ```bash
    git push origin fitur-keren
    ```
5.  Buat **Pull Request** di repositori ini.

## 📜 Kredit

Aplikasi ini dapat berjalan berkat teknologi dan pustaka *open-source* yang luar biasa berikut ini:

* **Logika Catur:** [Chess.js](https://github.com/jhlywa/chess.js)
* **Kecerdasan Buatan:** [Stockfish.js](https://github.com/nmrugg/stockfish.js)
* **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/)
* **Ikon:** [Font Awesome](https://fontawesome.com/)
* **Font:** [Google Fonts](https://fonts.google.com/) (Cinzel & MedievalSharp)
* **Backend:** [Google Firebase](https://firebase.google.com/)

---
Dibuat dengan ❤️ oleh **Lusmaysh**
