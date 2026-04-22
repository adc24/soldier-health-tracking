# Real-Time Soldier Health & Position Tracking System

> Web-based dashboard to monitor soldier health (heart rate, temperature) and real-time GPS location using Google Sheets as data source.

---

## Features

- Real-time health monitoring (heart rate, temperature, oxygen level)
- GPS-based location tracking (latitude and longitude)
- Interactive dashboard with visual charts and indicators
- Field alerts for critical and moderate conditions
- Status classification (Normal, Warning, Critical)
- Health assessment and threat analysis system
- Data export options (PDF, CSV, Email)
- Google Sheets integration for sensor data

---

## Tech Stack

- React.js (Frontend)
- JavaScript (ES6+)
- HTML5, CSS3
- Chart.js / Recharts (Data Visualization)
- Google Sheets (Data Source)
- Fetch API / Google Sheets API (Data Integration)
- Node.js & npm (Runtime & Package Manager)
- Git & GitHub (Version Control)

---

## Data Sources

- **Health Data:** [Google Sheet Link](https://docs.google.com/spreadsheets/d/17108uV0YYTj8pSIwZWnLgTyfa9DDzqs30A2td9Ssv7Y/edit?usp=sharing)
- **Location Data:** [Google Sheet Link](https://docs.google.com/spreadsheets/d/1qct-k9l75DRVFco7I28BtYVfkMkZCCiA0zKynkBrF7Q/edit?usp=sharing)


---

## Requirements

- Node.js (v14 or higher)
- npm (comes with Node.js) or Yarn
- Git (for version control)
- Stable Internet Connection (for fetching Google Sheets data)
- Modern Web Browser (Chrome, Edge, etc.)

---

## Installation

```bash
git clone https://github.com/your-username/soldier-health-tracking.git
cd soldier-health-tracking
npm install
npm start

---

### How It Works
1. React app fetches data from Google Sheets every few seconds.
2. Displays health metrics and GPS coordinates on dashboard.
3. Triggers visual alerts if values exceed thresholds.

---

### Important Notes
- Academic prototype only, not for live deployment.
- Replace Google Sheets with real backend for production.

---

### Author
Abhay Chouhan

---

### License
Educational use only. No warranty.
