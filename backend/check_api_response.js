const checkAPI = async () => {
    try {
        console.log('Fetching courses from http://localhost:5000/api/courses ...');
        const res = await fetch('http://localhost:5000/api/courses');
        const data = await res.json();

        const courses = data.data;
        const genAICourse = courses.find(c => c.title.toLowerCase().includes('gen'));

        if (genAICourse) {
            console.log('--- FOUND GEN AI COURSE IN API RESPONSE ---');
            console.log('ID:', genAICourse._id);
            console.log('Title:', genAICourse.title);
            console.log('TargetAudience:', genAICourse.targetAudience); // Vital check
            console.log('Full Object Keys:', Object.keys(genAICourse));
        } else {
            console.log('Gen AI course not found in API response.');
        }

    } catch (error) {
        console.error('Error fetching API:', error.message);
    }
};

checkAPI();
