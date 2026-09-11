# Nail AR Try-On Web App

A mobile-first web application that allows users to virtually try on nail designs using augmented reality (AR) through their device camera in real time.

This project focuses on improving user experience for nail selection by enabling realistic visualization directly on the user's hand.

---

## Features

* Real-time camera integration
* Hand tracking using MediaPipe
* AR overlay of nail designs on all fingers
* Smooth position, scale, and rotation tracking
* Mobile-first responsive design
* Multiple nail designs from a data source

---

## How It Works

1. Open the application on a mobile device
2. Grant camera access
3. The system detects the hand using MediaPipe Hands
4. Finger landmarks are calculated in real time
5. Nail images are rendered and aligned to each finger

---

## Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS

### AR / Computer Vision

* @mediapipe/hands
* camera_utils
* HTML5 Canvas

### Other

* JavaScript (ES6+)

---

## Project Structure

```bash id="k2mz8f"
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

## Installation and Setup

```bash id="9xq2pl"
# Clone the repository
git clone https://github.com/Jareyatham-mas/nail_ar_app.git

# Navigate into the project
cd nail_ar_app

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Use Cases

* Nail salons previewing designs for customers
* Users selecting nail styles before booking
* AR-based beauty applications
* Experimental projects in computer vision

---

## Known Issues

* Camera permission is required
* Performance varies depending on device capability
* Tracking accuracy depends on lighting conditions

---

## Future Improvements

* Improved finger segmentation accuracy
* Custom nail color and pattern editor
* Save and share preview images
* Backend integration for design management
* Booking or e-commerce integration

---

## Challenges and Solutions

* Hand tracking stability
  Applied smoothing techniques to reduce jitter from landmark detection

* Alignment accuracy
  Adjusted scale and rotation of overlays based on finger orientation

* Rendering performance
  Optimized canvas drawing to maintain smooth real-time updates

---

## Author

Jareyatham (Men Swa)
Computer Science and Software Innovation

---

## Notes

This project demonstrates practical implementation of augmented reality concepts on the web, combining computer vision with frontend development to create an interactive user experience.

---

## License

This project is for educational purposes.
