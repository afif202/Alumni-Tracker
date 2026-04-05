# Alumni Tracker System

A fullstack web application to track university alumni using Node.js, Express, SQLite, and vanilla frontend with modern styling.

## 🎯 System Overview

This system helps universities track alumni through automated OSINT (Open-Source Intelligence) scanning and validation, providing confidence scores for identified profiles across social media platforms.

## 🏗️ Project Structure

```
alumni-tracker/
├── backend/
│   ├── controllers/      # Request/response handlers
│   │   ├── alumniController.js
│   │   ├── authController.js
│   │   ├── osintController.js
│   │   ├── statsController.js
│   │   └── trackingController.js
│   ├── services/         # Business logic
│   │   ├── alumniService.js
│   │   ├── osintService.js
│   │   ├── statsService.js
│   │   └── trackingService.js
│   ├── middleware/       # Express middleware
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── routes/           # Route definitions
│   │   ├── tracking.js
│   │   ├── auth.js
│   │   └── osint.js
│   ├── database/
│   │   └── db.js
│   └── utils/
│       └── response.js
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── package.json
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+
- npm

### Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Access dashboard at `http://localhost:3000`

## 📊 Key Features

### 1. **Dashboard**
- Overview statistics
- Real-time alumni data table
- Status tracking (Teridentifikasi/Perlu Verifikasi/Belum Ditemukan)
- Confidence scoring display
- Quick actions (View/Edit/Delete)

### 2. **Alumni Profiles**
- Card view of verified alumni
- Links to LinkedIn profiles
- Success rate tracking

### 3. **OSINT Intelligence Search**
- **Individual Scan**: Search for a specific alumni
- **Batch Scan (Auto)**: Automatically scan up to 20 untracked alumni
- AI-powered OSINT scanning across multiple platforms
- Google Dorking integration

### 4. **Analytics**
- Status distribution charts
- Alumni demographics by program
- Year-over-year graduation tracking

## 🎯 **Workflow Manual** - How to Use

### 📌 **Step 1: Add Alumni Data**

**How**: Use API endpoint to add alumni data

**Endpoint**: `POST /api/alumni`

**Example using curl**:
```bash
curl -X POST http://localhost:3000/api/alumni \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "nama": "John Doe",
    "prodi": "Teknik Informatika",
    "tahun_lulus": 2020,
    "nim": "2020.10.001"
  }'
```

**When to use**: 
- First time setup when you have alumni list
- Adding new alumni manually

**What happens**: Alumni added with status "Belum Dilacak"

---

### 🔍 **Step 2: Run OSINT Search**

#### **Option A: Individual Search**
**Use when**: You want to check a specific alumni

**How**: Go to OSINT Search → Cari Alumni Individu → Type name → Scan OSINT

**What it does**:
- Searches across LinkedIn, Google Scholar
- Uses Google Dorking techniques
- Scans social media platforms
- Returns confidence scores

**Confidence Score Logic**:
- **>0.8**: Teridentifikasi (High confidence match)
- **0.5-0.8**: Perlu Verifikasi Manual (Manual review needed)
- **<0.5**: Belum Ditemukan (Not found/low match)

---

#### **Option B: Batch Scan (Auto)**
**Use when**: You want to process multiple alumni at once

**How**: Go to OSINT Search → Click "Batch Scan (Auto)"

**What it does**:
- Automatically scans up to 20 alumni with status "Belum Dilacak"
- Runs OSINT search for each
- Updates their status and scores
- Saves search history

**Best for**: Initial bulk processing of your alumni database

---

### 📒 **Step 3: Review Results

**Where**: Dashboard → Data Alumni table

**What to check**:
- **Status column**: Filter by status
  - 🟢 Teridentifikasi: Verified profiles
  - 🟡 Perlu Verifikasi: Needs manual check
  - 🔴 Belum Ditemukan: No digital footprint
  - ⚪ Belum Dilacak: Not yet processed

- **Confidence score**: 0.0 to 1.0 scale
- **Last updated**: When last scanned

---

### 📝 **Step 4: Verify Manual (if needed)**

**Use when**: Alumni status is "Perlu Verifikasi Manual"

**How**: 
1. Click "Detail" button
2. Review OSINT results in modal
3. Check social media links
4. Manually verify if match is correct
5. Update status manually if verified

**Why**: Some matches may have similar names but different people

---

### 📊 **Step 5: Analytics Review**

**Where**: Analytics menu

**Use when**: You want insights about your alumni

**What you see**:
- Distribution by status
- Job categories (PNS/Swasta/Wirausaha)
- Program popularity
- Year trends

---

## 🎯 Complete Usage Scenario

### **Day 1: Setup**
1. Add 50 alumni via API/curl
2. Run **Batch Scan (Auto)** → processes 20 alumni
3. Dashboard shows updated stats

### **Day 2: Deep Dive**
1. Check alumni with "Perlu Verifikasi" status
2. Open detail and review manually
3. Confirm or reject matches
4. Run Individual Search for high-priority alumni

### **Day 3: Maintenance**
1. Add new alumni as they graduate
2. Run Batch Scan periodically
3. Check Analytics for trends
4. Export data if needed

---

## 🔐 Authentication

All API endpoints (except `/auth/login`) require authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/alumni
```

Obtain token via:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"username":"admin","password":"admin332211"}'
```

The frontend handles authentication automatically.

---

## 🎨 UI Features

### Dashboard Elements
- **Stats Cards**: Total, Identified, Need Verification, Working
- **Search Bar**: Instant filtering
- **Filters**: Status, Job Category
- **Pagination**: 50 items per page
- **Action Buttons**: View, Edit, Delete
- **Loading States**: Clear feedback

### Colors & Icons
- **Primary**: Blue/purple gradient
- **Success**: Green for verified
- **Warning**: Orange for verification needed
- **Danger**: Red for not found
- **Info**: Light blue for neutral data

---

## 📈 Performance Notes

- **Batch Scan**: Max 20 alumni per run (prevent timeout)
- **Pagination**: 50 alumni per page
- **History**: Last 20 tracking records displayed
- **Database**: SQLite (can upgrade to PostgreSQL for production)
- **Frontend**: Vanilla JS (no build step needed)

---

## 🚀 Next Steps

1. **Add your alumni data** via API
2. **Run Batch Scan** to start tracking
3. **Review results** on Dashboard
4. **Manually verify** ambiguous matches
5. **Monitor Analytics** for insights
6. **Repeat** batch scan weekly/monthly

---

## 💡 Pro Tips

- **Start small**: Import 5-10 alumni first to test
- **Check verification queue**: Daily review of "Perlu Verifikasi"
- **Use global search**: Quick way to find anyone
- **Batch scan regularly**: Keep data fresh
- **Export data**: Use analytics for reports

---

## 🤝 Support

For issues or questions about workflow:
1. Check this README
2. Review API response messages
3. Check browser console for frontend errors
4. Check server logs for backend errors
