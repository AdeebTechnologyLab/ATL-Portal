const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const testQuery = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await mongoose.model('User').findOne();
        const userIdString = user._id.toString();

        // This should return null because we are excluding the only user we found
        const found = await mongoose.model('User').findOne({
            _id: { $ne: userIdString }
        });

        console.log('User ID:', userIdString);
        console.log('Found someone else?', found ? found._id : 'No');

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

const UserSchema = new mongoose.Schema({ name: String });
if (!mongoose.models.User) mongoose.model('User', UserSchema);

testQuery();
