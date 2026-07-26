/**
 * Migration Script: Convert Courses to New Schema
 * 
 * This script migrates existing courses from the old schema (with startDate/endDate and single teacher)
 * to the new schema (with durationMonths, city, and teachers array)
 * 
 * Run this script ONCE after deploying the new models
 * Usage: node migrate_courses.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('./models/Course');

async function migrateCourses() {
    try {
        console.log('🔄 Starting course migration...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Find all courses
        const courses = await Course.find({}).lean();
        console.log(`📊 Found ${courses.length} courses to migrate\n`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const course of courses) {
            try {
                const updates = {};
                let needsUpdate = false;

                // 1. Calculate durationMonths from startDate and endDate
                if (course.startDate && course.endDate && !course.durationMonths) {
                    const start = new Date(course.startDate);
                    const end = new Date(course.endDate);
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const months = Math.max(1, Math.min(10, Math.round(diffDays / 30)));

                    updates.durationMonths = months;
                    needsUpdate = true;
                    console.log(`  📅 ${course.title}: Calculated duration = ${months} months`);
                }

                // 2. Convert single teacher to teachers array
                if (course.teacher && (!course.teachers || course.teachers.length === 0)) {
                    updates.teachers = [course.teacher];
                    needsUpdate = true;
                    console.log(`  👨‍🏫 ${course.title}: Converted teacher to array`);
                }

                // 3. Set city based on location (if not already set)
                if (course.location && !course.city) {
                    // Capitalize first letter
                    const cityName = course.location.charAt(0).toUpperCase() + course.location.slice(1);
                    updates.city = cityName;
                    needsUpdate = true;
                    console.log(`  🏙️  ${course.title}: Set city = ${cityName}`);
                }

                // 4. Set isActive to true by default (if not set)
                if (course.isActive === undefined) {
                    updates.isActive = true;
                    needsUpdate = true;
                }

                // Apply updates
                if (needsUpdate) {
                    await Course.findByIdAndUpdate(course._id, { $set: updates });
                    migratedCount++;
                    console.log(`  ✅ Migrated: ${course.title}\n`);
                } else {
                    skippedCount++;
                    console.log(`  ⏭️  Skipped (already migrated): ${course.title}\n`);
                }

            } catch (error) {
                console.error(`  ❌ Error migrating course ${course.title}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migratedCount} courses`);
        console.log(`   ⏭️  Skipped: ${skippedCount} courses`);
        console.log(`   📝 Total: ${courses.length} courses\n`);

        console.log('✨ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run migration
migrateCourses();
