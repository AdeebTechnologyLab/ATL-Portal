import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toAttendanceDateKey } from './attendanceDate';

// Helper to load image from URL
// Helper to load image from URL and convert to Data URL
const loadImage = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                // Convert to PNG data URL to ensure compatibility (handles WebP source too)
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (error) {
                console.warn('Failed to convert image to Data URL (CORS?)', error);
                resolve(null);
            }
        };
        img.onerror = (e) => {
            console.warn('Failed to load image', e);
            resolve(null);
        };
        img.src = url;
    });
};

export const generateComprehensiveReport = async (user, enrollments, assignments, fees = [], dailyTasks = [], options = {}) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    // --- Helper Functions ---
    const safeDateFormat = (dateStr, formatStr = 'MMM dd, yyyy') => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, formatStr);
    };

    const addHeader = () => {
        // Company Branding
        doc.setFillColor(63, 81, 181); // Indigo color
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Adeeb Technology Lab', 14, 15);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Student Academic Report', 14, 25);

        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth - 14, 15, { align: 'right' });


        y = 50;
    };

    const checkPageBreak = (neededHeight) => {
        if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = 20;
            return true;
        }
        return false;
    };

    const drawCalendar = (monthDate, attendanceData) => {
        checkPageBreak(80); // Approximate height for a calendar block

        const monthName = format(monthDate, 'MMMM yyyy');
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const startDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay(); // 0 = Sunday

        // Calendar Header
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, y, 80, 10, 1, 1, 'F');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(monthName, 54, y + 6.5, { align: 'center' });
        y += 12;

        // Days Header (Sun, Mon...)
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const boxSize = 10;
        const xStart = 19;

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        days.forEach((day, i) => {
            doc.text(day, xStart + (i * boxSize) + (boxSize / 2), y + 4, { align: 'center' });
        });
        y += 6;

        // Draw Days
        let currentX = xStart + (startDay * boxSize);
        let currentY = y;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), day), 'yyyy-MM-dd');
            const status = attendanceData[dateStr]; // 'present', 'absent', or undefined

            // Draw Box
            if (status === 'present') {
                doc.setFillColor(220, 252, 231); // Green-100
                doc.setDrawColor(34, 197, 94); // Green-500
            } else if (status === 'absent') {
                doc.setFillColor(254, 226, 226); // Red-100
                doc.setDrawColor(239, 68, 68); // Red-500
            } else {
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(230, 230, 230);
            }

            doc.rect(currentX, currentY, boxSize, boxSize, 'FD');

            // Draw Number
            doc.setTextColor(50, 50, 50);
            doc.text(day.toString(), currentX + (boxSize / 2), currentY + (boxSize / 2) + 1, { align: 'center' });

            // Move cursor
            currentX += boxSize;
            if ((startDay + day) % 7 === 0) {
                currentX = xStart;
                currentY += boxSize;
            }
        }

        // Return Y position after calendar + some padding. 
        // Max 6 rows * 10 = 60 height
        return currentY + boxSize + 10;
    };

    // --- Content Generation ---

    addHeader();

    // 1. Profile Section
    // Section Header background
    doc.setFillColor(232, 240, 254); // Light Blue
    doc.rect(14, y - 5, pageWidth - 28, 14, 'F');

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Profile', 19, y + 4);
    y += 18;

    // Profile Photo
    let photoAdded = false;
    const profileDetailsStartY = y; // Store Y before drawing details
    if (user.photo) {
        try {
            const imgData = await loadImage(user.photo);
            if (imgData) {
                // Draw image on the right
                doc.addImage(imgData, 'PNG', pageWidth - 54, y, 40, 40);
                // Draw border around image
                doc.setDrawColor(200, 200, 200);
                doc.rect(pageWidth - 54, y, 40, 40);
                photoAdded = true;
            }
        } catch (error) {
            console.warn('Failed to load profile image for PDF', error);
        }
    }

    // Fallback if no photo or failed to load
    if (!photoAdded) {
        doc.setFillColor(16, 185, 129); // primary
        doc.rect(pageWidth - 54, y, 40, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
        doc.text(initial, pageWidth - 34, y + 26, { align: 'center' });

        // Draw border
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - 54, y, 40, 40);

        photoAdded = true;
    }

    // Profile Details (Left Side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const labelX = 14;
    const valueX = 50;
    const details = [
        { label: 'Name:', value: user.name },
        { label: 'Roll No:', value: user.rollNo || 'N/A' },
        { label: 'Email:', value: user.email },
        { label: 'Phone:', value: user.phone || 'N/A' },
        { label: 'City:', value: user.city || 'N/A' },
        { label: 'Guardian:', value: `${user.guardianName || 'N/A'} (${user.guardianPhone || 'N/A'})` }
    ];

    details.forEach(detail => {
        doc.setFont('helvetica', 'bold');
        doc.text(detail.label, labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(detail.value, valueX, y);
        y += 7;
    });

    // Adjust Y to be below the photo if it was added and taller than text
    if (photoAdded) {
        y = Math.max(y, profileDetailsStartY + 40); // 40 is photo height
    }
    y += 10;


    // 2. Course Details Loop
    if (enrollments && enrollments.length > 0) {
        enrollments.forEach((enrollment, index) => {
            const courseTitle = enrollment.course?.title || `Course ${index + 1}`;

            checkPageBreak(40);

            // Course Section Header
            doc.setFillColor(232, 240, 254); // Light Blue
            doc.rect(14, y, pageWidth - 28, 10, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Course: ${courseTitle}`, 16, y + 7);
            y += 16;

            // A. Attendance Calendar
            if (enrollment.attendanceDetails && enrollment.attendanceDetails.length > 0) {
                doc.setFontSize(11);
                doc.text('Attendance Record', 14, y);
                y += 8;

                // Group by Month
                const attendanceByMonth = {};
                enrollment.attendanceDetails.forEach(record => {
                    const dateKey = toAttendanceDateKey(record.date);
                    if (!dateKey) return;
                    const [y, m] = dateKey.split('-').map(Number);
                    const monthKey = `${y}-${m - 1}`;
                    const calendarDate = new Date(y, m - 1, 1);
                    if (!attendanceByMonth[monthKey]) attendanceByMonth[monthKey] = { date: calendarDate, data: {} };
                    attendanceByMonth[monthKey].data[dateKey] = record.status;
                });

                // Iterate months and draw calendars (2 side by side if possible)
                const months = Object.values(attendanceByMonth).sort((a, b) => a.date - b.date);

                months.forEach((month, idx) => {
                    const endY = drawCalendar(month.date, month.data);
                    y = endY;
                });

                // Add Summary Stats
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                const totalAttendance = Number(enrollment.totalClasses || enrollment.attendanceDetails.length || 0);
                const presentAttendance = Number(
                    enrollment.attendedClasses
                    ?? enrollment.attendanceDetails.filter(record => record.status === 'present').length
                );
                const absentAttendance = Number(
                    enrollment.absentClasses
                    ?? enrollment.attendanceDetails.filter(record => record.status === 'absent').length
                );
                const attendancePercentage = Number.isFinite(Number(enrollment.attendancePercentage))
                    ? Number(enrollment.attendancePercentage)
                    : (totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0);
                doc.text(
                    `Total: ${totalAttendance} | Present: ${presentAttendance} | Absent: ${absentAttendance} | Attendance: ${attendancePercentage}%`,
                    14,
                    y
                );
                y += 10;
            } else {
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text('No attendance records found.', 14, y);
                y += 10;
            }

            y += 5; // Spacing

            const isInternCourse = enrollment.course?.targetAudience === 'interns';
            const assignmentLabel = isInternCourse ? 'Projects' : 'Assignments';

            // B. Assignments (Cards)
            checkPageBreak(30);

            // Assignments Header Background
            doc.setFillColor(232, 240, 254); // Light Blue
            doc.rect(14, y - 5, pageWidth - 28, 12, 'F');

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(assignmentLabel, 19, y + 3);
            y += 12;

            // Filter assignments for this course
            const courseAssignments = assignments.filter(a =>
                a.course && enrollment.course && (a.course._id === enrollment.course._id || a.course === enrollment.course._id || a.course.id === enrollment.course._id)
            );

            if (courseAssignments.length > 0) {
                courseAssignments.forEach(assign => {
                    // Extract submission details (backend returns submissions array filtered for this user)
                    const submission = assign.submissions && assign.submissions[0];
                    const status = submission ? submission.status : (assign.dueDate && new Date(assign.dueDate) < new Date() ? 'late' : 'pending');
                    const grade = submission ? submission.marks : null;
                    const feedback = submission ? submission.feedback : null;
                    const submittedAt = submission ? submission.submittedAt : null;

                    // We need to calculate height first to check page break
                    let feedbackHeight = 0;
                    let splitFeedback = [];
                    if (feedback) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(9);
                        splitFeedback = doc.splitTextToSize(`Feedback: ${feedback}`, pageWidth - 38);
                        feedbackHeight = (splitFeedback.length * 4) + 6;
                    }

                    const cardHeight = 22 + feedbackHeight; // 22 base height

                    checkPageBreak(cardHeight + 5);

                    // Card Background
                    doc.setDrawColor(220, 220, 220);
                    doc.setFillColor(255, 255, 255);
                    // doc.roundedRect(14, y, pageWidth - 28, cardHeight, 2, 2, 'S'); // Outline of whole card

                    // Status Stripe
                    if (status === 'graded') {
                        doc.setFillColor(34, 197, 94); // Green
                    } else if (status === 'submitted') {
                        doc.setFillColor(234, 179, 8); // Yellow
                    } else {
                        doc.setFillColor(239, 68, 68); // Red
                    }
                    doc.roundedRect(14, y, 2, 20, 1, 1, 'F'); // Just the stripe

                    // Main Info
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(50, 50, 50);
                    doc.text(assign.title || 'Untitled Assignment', 19, y + 6);

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Due: ${safeDateFormat(assign.dueDate)}`, 19, y + 12);

                    // Grade Badge
                    if (status === 'graded') {
                        doc.setFillColor(220, 252, 231);
                        doc.roundedRect(pageWidth - 40, y + 2, 24, 6, 1, 1, 'F');
                        doc.setTextColor(21, 128, 61);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        const total = assign.totalMarks || 100;
                        doc.text(`${grade}/${total}`, pageWidth - 28, y + 6, { align: 'center' });
                    } else {
                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        const statusText = status ? status.toUpperCase() : 'UNKNOWN';
                        doc.text(statusText, pageWidth - 20, y + 6, { align: 'right' });
                    }

                    // Feedback (if exists)
                    if (feedback) {
                        const fbY = y + 16;

                        // Draw extra box for feedback
                        doc.setFillColor(250, 250, 250);
                        doc.setDrawColor(240, 240, 240);
                        doc.roundedRect(19, fbY, pageWidth - 38, feedbackHeight - 2, 1, 1, 'FD');

                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(9);
                        doc.setTextColor(80, 80, 80);
                        doc.text(splitFeedback, 21, fbY + 4);

                        y += cardHeight + 4;
                    } else {
                        y += 24; // Standard spacing
                    }
                });
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(150, 150, 150);
                doc.text(`No ${assignmentLabel.toLowerCase()} found for this course.`, 14, y);
                y += 10;
            }

            y += 5; // Spacing

            // C. Daily Tasks / Class Logs / Meeting Logs
            const courseDailyTasks = (dailyTasks || []).filter(dt =>
                dt.course && enrollment.course && (dt.course._id === enrollment.course._id || dt.course === enrollment.course._id || dt.course.id === enrollment.course._id)
            );
            const dailyTaskLabel = isInternCourse ? 'Meeting Logs' : 'Class Logs';

            if (courseDailyTasks.length > 0) {
                checkPageBreak(30);

                // Daily Tasks Header Background
                doc.setFillColor(232, 240, 254);
                doc.rect(14, y - 5, pageWidth - 28, 12, 'F');

                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(dailyTaskLabel, 19, y + 3);
                y += 12;

                courseDailyTasks.forEach(task => {
                    const cardHeight = 18;

                    checkPageBreak(cardHeight + 5);

                    // Status Stripe
                    const taskStatus = task.status || 'pending';
                    if (taskStatus === 'verified' || taskStatus === 'graded') {
                        doc.setFillColor(34, 197, 94);
                    } else if (taskStatus === 'submitted') {
                        doc.setFillColor(234, 179, 8);
                    } else {
                        doc.setFillColor(239, 68, 68);
                    }
                    doc.roundedRect(14, y, 2, 16, 1, 1, 'F');

                    // Main Info
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(50, 50, 50);
                    const taskTitle = task.title || task.description || 'Untitled Task';
                    const truncatedTitle = taskTitle.length > 60 ? taskTitle.substring(0, 60) + '...' : taskTitle;
                    doc.text(truncatedTitle, 19, y + 6);

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 100, 100);
                    const taskDate = task.date || task.submittedAt || task.createdAt;
                    doc.text(`Date: ${safeDateFormat(taskDate)}`, 19, y + 12);

                    // Status Badge
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    const statusText = taskStatus.toUpperCase();
                    if (taskStatus === 'verified' || taskStatus === 'graded') {
                        doc.setTextColor(21, 128, 61);
                    } else if (taskStatus === 'submitted') {
                        doc.setTextColor(180, 130, 0);
                    } else {
                        doc.setTextColor(200, 50, 50);
                    }
                    doc.text(statusText, pageWidth - 20, y + 6, { align: 'right' });

                    // Grade if graded
                    if (task.marks != null) {
                        doc.setFontSize(9);
                        doc.setTextColor(21, 128, 61);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${task.marks}/${task.totalMarks || 100}`, pageWidth - 20, y + 12, { align: 'right' });
                    }

                    y += cardHeight;
                });
            } else {
                checkPageBreak(16);
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                doc.text(`No ${dailyTaskLabel.toLowerCase()} found for this course.`, 14, y);
                y += 10;
            }

            y += 10; // Extra space between courses
        });
    } else {
        doc.text('No active enrollments found.', 14, y);
        y += 10;
    }

    // 3. Fee Details Section
    checkPageBreak(50);
    y += 10;

    // Fee Header Background
    doc.setFillColor(232, 240, 254); // Light Blue
    doc.rect(14, y - 5, pageWidth - 28, 12, 'F');

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Fee Details', 19, y + 4);
    y += 16;

    if (fees && fees.length > 0) {
        // Flatten fee structure to show installments or summary
        // User Request: Remove Total Fee. Keep Paid Amount and Month.
        const feeRows = [];
        fees.forEach(f => {
            if (f.installments && f.installments.length > 0) {
                f.installments.forEach(inst => {
                    // Determine month/date
                    const dateObj = new Date(inst.dueDate || inst.paidAt);
                    const monthStr = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMMM yyyy') : 'N/A';
                    const status = inst.status ? inst.status.charAt(0).toUpperCase() + inst.status.slice(1) : 'Pending';

                    feeRows.push([
                        f.course?.title || 'Unknown Course',
                        monthStr,
                        `Rs ${inst.amount}`,
                        status
                    ]);
                });
            } else {
                // Fallback if no installments but manual status?
                // Just show total paid if no installments?
                // But model suggests installments are always used.
                // We'll skip if no installments.
            }
        });

        if (feeRows.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Course', 'Month', 'Paid Amount', 'Status']],
                body: feeRows,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [63, 81, 181] },
            });
            y = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('No fee installments record found.', 14, y);
            y += 10;
        }

    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No fee records found.', 14, y);
        y += 10;
    }

    // --- Footer: Company Contact Details ---
    const footerHeight = 50;
    if (y + footerHeight > pageHeight) {
        doc.addPage();
        y = pageHeight - footerHeight - 10; // Position at bottom of new page
    } else {
        // If plenty of space, just push it down a bit, but ideally stick to bottom if possible
        // For now just add some spacing
        y += 20;
    }

    // Draw Footer Background (Full Width)
    // Use Branding Blue
    doc.setFillColor(63, 81, 181);
    // If not at bottom of page, we can just draw a block.
    // Let's draw it starting at y.

    // Ensure we don't go off page
    if (y + footerHeight > pageHeight) y = pageHeight - footerHeight;

    doc.rect(0, y, pageWidth, footerHeight + 10, 'F'); // Extended height to cover bottom

    const footerY = y + 15;
    const leftColX = 14;
    const rightColX = pageWidth / 2 + 10;

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Information', leftColX, footerY - 5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // White text is already set

    let currentY = footerY + 5;

    // Contact Grid
    // Tel
    doc.setFont('helvetica', 'bold');
    doc.text('Tel:', leftColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('051 613 2233', leftColX + 25, currentY);

    // Web removed per user request

    currentY += 6;

    // Mobile
    doc.setFont('helvetica', 'bold');
    doc.text('Mobile:', leftColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('030 92 333 121', leftColX + 25, currentY);

    // Hours (Right Side)
    doc.setFont('helvetica', 'bold');
    doc.text('Hours:', rightColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Mon-Sat, 10:00 AM to 10:00 PM', rightColX + 15, currentY);

    currentY += 6;

    // Email
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', leftColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('info.AdeebTechLab@gmail.com', leftColX + 25, currentY);

    currentY += 10;

    // Address
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', leftColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Lane F Ghora Sardar Rod, Mehrban Town Block C, The Computer Courses Islamabad, Pakistan 46000.', leftColX + 25, currentY, { maxWidth: pageWidth - 50 });

    const fileName = `${user.name.replace(/\s+/g, '_')}_Report.pdf`;
    if (options.output === 'blob') {
        return { blob: doc.output('blob'), fileName };
    }
    doc.save(fileName);
    return { fileName };
};

