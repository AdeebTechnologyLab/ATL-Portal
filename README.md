# LMS-Adeeb-Technology-Lab

## Run locally

```
cd backend
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the frontend proxies `/api` to the backend (port 5000).

## Forgot password / reset email

### Option A — Brevo (Sendinblue) API (recommended for Render)

1. Create a free account at https://www.brevo.com
2. Go to **Settings → API Keys** and copy the **API key** (starts with `xkeysib-...`).
3. In `backend/.env` set:
   - `BREVO_API_KEY=xkeysib-...`
4. On **Render** (production API), add `BREVO_API_KEY` in Environment.
5. Restart backend.

### Option B — Gmail App Password

1. Enable 2-Step Verification on the Gmail account.
2. Create an App Password: https://myaccount.google.com/apppasswords
3. In `backend/.env` set:
   - `EMAIL_USER=your@gmail.com`
   - `EMAIL_PASS=16_character_app_password` (no spaces)
4. On **Render** (production API), add the same `EMAIL_USER` and `EMAIL_PASS` in Environment.
5. Restart backend after changing `.env`.

**Note:** Gmail SMTP is often blocked on Render free tier. If emails fail, switch to Brevo (Option A).

If you see *"Cannot reach the server"*, run `npm run dev` in the `backend` folder.

### Common gotchas

- **Wrong key type**: `xsmtpsib-...` is the SMTP key (wrong). Use `xkeysib-...` from **Brevo → Settings → API Keys**.
- **Sender not verified**: Verify your sender email in Brevo dashboard under **Senders** tab.
- **Deploy**: Push code to GitHub — Render (backend) and Vercel (frontend) redeploy automatically.
- **Frontend**: Set `VITE_API_URL=https://lms-adeeb-technology-lab.onrender.com/api` in Vercel env.




Redesigned Announcement Popup:

Branding: Added the official logo and "LMS Adeeb Tech Lab" title to the header.
Dynamic Big Icons: Notifications now show a large, clear icon based on their content:
Fees/Payments: 💳 Credit Card icon
Assignments/Tasks: 📄 File icon
Results/Certificates: 🏆 Award icon
Live Classes/Meetings: 📅 Calendar icon
Urgent Notices: ⚡ Zap icon
Aesthetics: Improved the layout with soft gradients, better shadows, and full support for both light and dark modes.



Aap picture banate waqt in dimensions (sizes) mein se koi bhi use kar sakte hain taake picture perfectly fit aaye aur kati (crop) na ho:

1280 x 720 pixels (HD) - Sab se best aur recommended size hai.
1920 x 1080 pixels (Full HD) - High quality ke liye.
800 x 450 pixels - Agar file size kam rakhna ho.



A+ (90-100): "Excellent! Perfect execution and great attention to detail. Keep it up!"
A (85-89): "Outstanding effort! Very well done."
B+ (80-84): "Great job! Keep up the consistent effort."
B (75-79): "Good work! Solid understanding of the concepts."
C+ (70-74): "Satisfactory effort. Try to focus more on the requirements."
C (65-69): "Average work. Needs more attention and focus."
D (60-64): "Below expectations. Please review the instructions carefully."
F (0-59): "Poor performance. Let's work on the basics and improve."