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

If you see *"Cannot reach the server"*, run `npm run dev` in the `backend` folder.

## Servers

- Backend: https://darksalmon-grasshopper-335002.hostingersite.com
- Frontend: https://adeebtechhub.online

## Portal / Report Links

### Student staff academic report link

StudentsManagement.jsx:648 - https://adeebtechhub.online${response.data.path}

### Intern staff academic report link

InternsManagement.jsx:553 - https://adeebtechhub.online${response.data.path}

## Registration Reminder Links

New register may jo msg hai usme reminder ke liye course select karna hota hai.

All message links updated. The remaining one in server.js:82 is a CORS config origin, not a user-facing link — that's fine to keep.

Files updated:

- StudentsManagement.jsx — 3 portal links replaced
- InternsManagement.jsx — 6 portal links replaced
- FeeVerification.jsx — 6 portal links replaced

All now point to https://adeebtechhub.online/.

## Forgot password / reset email

### Gmail App Password

1. Enable 2-Step Verification on the Gmail account.
2. Create an App Password: https://myaccount.google.com/apppasswords
3. In `backend/.env` set:
   - `EMAIL_USER=your@gmail.com`
   - `EMAIL_PASS=16_character_app_password` (no spaces)
4. On **Render** (production API), add the same `EMAIL_USER` and `EMAIL_PASS` in Environment.
5. Restart backend after changing `.env`.

**Note:** Gmail SMTP is often blocked on Render free tier. If emails fail, check your Gmail App Password.

### Forgot password email template

- Route: `backend/routes/auth.js` (`POST /api/auth/forgot-password`)
- Subject: `Reset your Adeeb Technology Lab password`
- Current header: "Adeeb Technology Lab" + "Password Reset"
- Body: user name, role, reset button/link, expires in 1 hour, spam note
- Link: `${getClientUrl(req)}/reset-password/<token>`

Note: Naya custom email format sample image se liya jana tha, lekin image read nahi ho saki. Sample ka text/HTML paste karne par template us format me update hoga.

## Notifications

### Channels (overview)

| Channel | Kya dikhta hai | Kab |
|---|---|---|
| In-App Toast | Branded popup, sound ke sath 5 second | LMS tab open ho |
| Bell / Notification List | Persistent notifications list | Jab bhi UserNotification create ho |
| Desktop Push | Browser notification | Permission + VAPID configured, tab ho ya na ho |
| Special Popups | Quiz challenge toast, Official Notice popup, Class reminder ring | Event ke mutabiq |

### In-App Toast (Branded + Sound)

- File: `frontend/src/components/shared/InAppNotification.jsx`
- Global register: `frontend/src/App.jsx`
- Duration: **5 second** (auto dismiss)
- Sound: Web Audio chime (koi audio file nahi)
- Branding: logo + **"LMS Adeeb Tech Lab"** header
- Dynamic big icons:
  - Fees/Payments -> Credit Card
  - Assignments/Tasks -> File
  - Results/Certificates -> Award
  - Live Classes/Meetings -> Calendar
  - Urgent Notices -> Zap
  - Attendance -> User Check
  - Default -> Bell
- Soft gradients + shadows + light/dark support
- Toast par click karne se relevant page khul jata hai
- Intern ke liye `/student/...` link auto `/intern/...` ho jata hai

### Desktop Push

- File: `frontend/src/utils/pushNotifications.js`
- Service worker: `frontend/public/sw.js`
- Backend: `backend/utils/pushHelper.js` / `pushNotifications.js`
- Requires:
  - Browser notification permission
  - `VITE_VAPID_PUBLIC_KEY` configured
  - User subscribed via `/api/user-notifications/subscribe`

### Event Matrix

#### Dono (In-App toast + Desktop push)

| Event | Kisko |
|---|---|
| Naya assignment diya gaya | student/intern |
| Assignment submit/resubmit | teacher |
| Assignment graded / rejected | student |
| Attendance marked | student/intern |
| Fee payment verified | student |
| Fee challan auto-generate (monthly script) | student |
| Job/Task assign hua | freelancer (job) |
| Job teacher manager ko assign | teacher |
| Payment received | job |
| New work log submit | teacher |

#### Sirf In-App toast (desktop push nahi)

- Payment rejected (student)
- Fee challan manually admin ne generate kiya (student)
- Application removed / Job unassigned (job)
- Profile admin ne update kiya
- New task feedback (admin)

#### Sirf Desktop push (branded toast nahi, magar bell list me aa sakta hai)

- New Test assigned (student)
- Work log graded/rejected (student)
- New job application (admin/teacher)
- Job work submitted (admin)
- Test completed (teacher)
- Chat / support auto-reply (chat UI me dikhta hai)
- Birthday wish
- Class time reminder (is par LMS me ring sound chalti hai)

#### Persistent / Bell Notifications (`UserNotification`)

| Type | Kab |
|---|---|
| `assignment_assigned` | Naya assignment |
| `graded` | Assignment / work log grading ya rejection |
| `test_assigned` | Naya test |
| `task_application` | Naya job application |
| `task_assigned` | Job assign / unassign |
| `task_paid` | Payment received |
| `task_completed` | Task feedback |

### Special Notifications

- **Quiz Battle challenge** — dedicated toast + desktop push (dono). File: `frontend/src/components/shared/QuizChallengeNotification.jsx`
- **Official Notice popup** — dashboard par alag popup. File: `frontend/src/components/shared/NotificationPopup.jsx`
- **Class time reminder** — desktop push + LMS ring sound. File: `backend/utils/classTimeReminders.js`
- **Chat / support auto-reply** — chat UI me dikhta hai + desktop push. File: `backend/routes/chat.js`, `backend/utils/chatbot.js`
- **Birthday wish** — desktop push. File: `backend/routes/users.js`
- **Profile update** — in-app toast. File: `backend/routes/users.js`

### Official Notice Popup (Dashboard)

- Popup dashboard aur tasks page par show hota hai (admin ke ilawa)
- Popup me logo, "LMS Adeeb Tech Lab", "Official Notice" aur notification count
- **Close 10 Days** button: popup 10 din ke liye band (localStorage + backend snooze)
- Cross (X) button: sirf current session ke liye band
- Permanent on/off: **Settings -> Notifications -> Official Notice Popup**
- Backend preference: `User.preferences.notificationPopup.enabled` / `snoozeUntil`
- API: `PUT /api/auth/preferences/notifications`
  - Body: `{ popupEnabled: true|false }` ya `{ snoozeUntil: ISO date|null }`
- Permanent off hone par naye device/login par bhi popup nahi aata
- Wapis on karne par temporary snooze clear ho jata hai

### Settings — Notification Toggles

File: `frontend/src/pages/settings/Settings.jsx`

- Email Notifications
- Push Notifications
- Assignment Alerts
- Grade Alerts
- Announcements
- Official Notice Popup (dashboard announcement popup)

## Announcement Popup Design

Redesigned Announcement Popup:

- **Branding:** Added the official logo and "LMS Adeeb Tech Lab" title to the header.
- **Dynamic Big Icons:** Notifications now show a large, clear icon based on their content:
  - Fees/Payments: 💳 Credit Card icon
  - Assignments/Tasks: 📄 File icon
  - Results/Certificates: 🏆 Award icon
  - Live Classes/Meetings: 📅 Calendar icon
  - Urgent Notices: ⚡ Zap icon
- **Aesthetics:** Improved the layout with soft gradients, better shadows, and full support for both light and dark modes.

## Image Dimensions

Aap picture banate waqt in dimensions (sizes) mein se koi bhi use kar sakte hain taake picture perfectly fit aaye aur kati (crop) na ho:

- 1280 x 720 pixels (HD) - Sab se best aur recommended size hai.
- 1920 x 1080 pixels (Full HD) - High quality ke liye.
- 800 x 450 pixels - Agar file size kam rakhna ho.

## Grading Feedback Messages

- A+ (90-100): "Excellent! Perfect execution and great attention to detail. Keep it up!"
- A (85-89): "Outstanding effort! Very well done."
- B+ (80-84): "Great job! Keep up the consistent effort."
- B (75-79): "Good work! Solid understanding of the concepts."
- C+ (70-74): "Satisfactory effort. Try to focus more on the requirements."
- C (65-69): "Average work. Needs more attention and focus."
- D (60-64): "Below expectations. Please review the instructions carefully."
- F (0-59): "Poor performance. Let's work on the basics and improve."
