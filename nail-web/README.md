# 💅 Nail AR Try-On Web App

A **mobile-first web application** that allows users to **virtually try on nail designs using AR (Augmented Reality)** in real-time via their device camera.

Built to enhance the customer experience for nail salons by letting users preview nail styles before making a decision.

---

## 🚀 Features

* 📱 **Mobile-first design** (optimized for iPhone & modern smartphones)
* 🎥 **Real-time camera integration**
* ✋ **Hand tracking using AI (MediaPipe)**
* 💅 **AR nail overlay on all 5 fingers**
* 🎨 **Multiple nail designs from database**
* ⚡ Smooth animation with position/rotation tracking
* 🌗 Ready for modern UI (can support dark/light themes)

---

## 🧠 How It Works

1. Open the web app on your mobile device
2. Allow camera access
3. AI detects your hand using **MediaPipe Hands**
4. The system maps finger positions
5. Nail images are rendered on top of your real fingers in real-time

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS

### AR / AI

* @mediapipe/hands
* camera_utils

### Other

* JavaScript (ES6+)
* HTML5 Canvas

---

## 📁 Project Structure

```
nail_ar_app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── assets/
├── public/
├── index.html
├── package.json
└── vite.config.js
```

---

## ⚙️ Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Jareyatham-mas/nail_ar_app.git

# Navigate into project
cd nail_ar_app

# Install dependencies
npm install

# Run development server
npm run dev
```

---

## 📸 Demo (Concept)

* Live camera overlay with nail designs
* Real-time finger tracking
* Smooth AR rendering

---

## 🎯 Use Cases

* Nail salons showcasing designs
* Customers previewing styles before booking
* E-commerce beauty platforms
* AR-based beauty tech experiments

---

## ⚠️ Known Issues

* Camera permission required on first use
* Performance may vary depending on device
* AR accuracy depends on lighting conditions

---

## 🔮 Future Improvements

* 🖐️ Better finger segmentation accuracy
* 🎨 Custom nail color picker
* 🛒 Integration with booking / e-commerce
* ☁️ Cloud database for designs
* 🤳 Save & share preview images

---

## 👨‍💻 Author

**Jareyatham (Men Swa)**
Computer Science & Software Innovation Student

---

## ⭐ Notes

This project is part of a learning journey in:

* AR on Web
* Computer Vision
* Frontend Development

---

## 📜 License

This project is for educational purposes.
