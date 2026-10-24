import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  auth0Id: String,
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const questionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
});
const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

async function fixAuthors() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);

    // 1. Ensure a user exists
    let fakeUser = await User.findOne({ email: 'test@urbanflow.com' });
    if (!fakeUser) {
        console.log("Creating test user...");
        fakeUser = await User.create({
            username: 'IshwarKumawat',
            email: 'test@urbanflow.com',
            auth0Id: 'mockAuth' + Date.now()
        });
    }

    console.log("Using User:", fakeUser._id, fakeUser.username);

    // 2. Find a few recent questions missing authors
    const questions = await Question.find({ author: { $exists: false } }).sort({ _id: -1 }).limit(5);

    if (questions.length === 0) {
        console.log("No questions missing authors.");
    } else {
        // 3. Update them to belong to our user
        for (const q of questions) {
            console.log(`Updating Question: ${q.title}`);
            await Question.updateOne({ _id: q._id }, { $set: { author: fakeUser._id } });
        }
    }
    
    // Verify changes
    const updated = await Question.find({ author: fakeUser._id }).populate('author').limit(2).lean();
    console.log("Verified Updated Questions:", updated.map(q => q.author?.username));

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fixAuthors();
