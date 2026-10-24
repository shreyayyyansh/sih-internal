import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Mongoose Models
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  avatar: String,
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const questionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
});
const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

async function checkAuthors() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    
    // Dump real raw question authors
    const questions = await Question.find().limit(3).lean();
    console.log("Found Raw Questions: ", questions.map(q => ({ _id: q._id, title: q.title, author: q.author })));

    // Dump populated versions
    const populated = await Question.find().populate('author').limit(3).lean();
    console.log("\nPopulated Questions: ", populated.map(q => ({ _id: q._id, authorName: q.author?.username || 'NULL_AUTHOR' })));

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkAuthors();
