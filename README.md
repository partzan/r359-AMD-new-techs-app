# AMD Gaming Technologies Release Notes Tracker

A sleek, responsive dashboard designed to track AMD Radeon™ gaming technology releases, scrape real-time engineering logs from GPUOpen, select items to compose customizable X/Twitter update posts, and dynamically generate Git vs. GitHub learning reference sheets in PDF format.

---

## 🚀 Key Features

* **Real-time Scraper & Cache**: Checks the official GPUOpen RSS XML feed. The backend caches results in memory for 10 minutes to maintain fast performance and handle remote network timeouts gracefully.
* **Selection & Tweet Composer**: Toggle selections on news cards to dynamically assemble a single unified status draft. Features real-time character checking against the 280-character limit before routing to X/Twitter Web Intent.
* **On-the-Fly PDF Guide Generation**: Compiles the source `guide.txt` into a beautifully formatted, print-ready custom A4 PDF using the Python `FPDF` library. Serves it dynamically on-demand from the `/download-guide` endpoint.
* **Modern Glowing Interface**: Developed using CSS variables, custom loading skeleton cards, smooth hover micro-animations, custom scrollbars, and Outfit/JetBrains fonts.

---

## 📂 Project Structure

* **app.py**: Flask web server hosting caching mechanisms, parsing feed logic, and application route mappings.
* **generate_pdf.py**: Text parser and custom FPDF class that designs headers, lists, boxes, and code sections to output styled PDFs.
* **guide.txt**: Core markdown-like reference file outlining local Git operations versus GitHub workflows.
* **templates/index.html**: Main HTML structure containing dashboard containers, loading grids, and compose drawers.
* **static/css/styles.css**: Customized stylesheets containing colors, dark mode tokens, skeleton frames, and sliding drawer transitions.
* **static/js/app.js**: Orchestrates client states, handles click selectors, processes character counters, and coordinates API fetch requests.

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have Python 3.x installed.

### Installation

1. Clone or download the repository to your local drive.
2. Open a terminal and navigate to the project directory:
   ```bash
   cd bq-releases-notes
   ```
3. Install dependencies:
   ```bash
   pip install Flask fpdf2
   ```
   *(Note: The codebase imports `FPDF` from the `fpdf` package, which is fully compatible with `fpdf2` or the standard `fpdf` package).*

### Running the App

1. Execute the Flask application:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

### Manual PDF Compilation
If you wish to compile the PDF documentation locally without launching the server:
```bash
python generate_pdf.py
```
This writes the generated `guide.pdf` directly to the project root and the `static/` asset subdirectory.
