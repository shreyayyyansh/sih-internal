import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Define schema directly to avoid import issues
const questionSchema = new mongoose.Schema({
  title: String,
  description: String,
});
const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

async function checkSearch() {
  try {
    const uri = process.env.MONGODB_URI;
    console.log("Connecting to:", uri.split('@')[1]); // Log host part
    await mongoose.connect(uri);
    
    console.log("Connected to MongoDB.");
    
    // 1. Check with regular find to prove data exists
    console.log("\n--- Testing ordinary Mongoose find (/ishwar/i) ---");
    const regexResults = await Question.find({ title: { $regex: 'ishwar', $options: 'i' } }).lean();
    console.log(`Regex Found ${regexResults.length} matches`);
    if(regexResults.length > 0) console.log("Sample title:", regexResults[0].title);

    // 2. Check with $search aggregation
    console.log("\n--- Testing $search aggregation ---");
    try {
      const searchResults = await Question.aggregate([
        {
          $search: {
            index: "default",
            text: {
              query: "ishwar",
              path: ["title", "description", "tags"]
            }
          }
        }
      ]);
      console.log(`$search found ${searchResults.length} matches`);
    } catch (searchErr) {
      console.error("$search threw an error:", searchErr.message);
    }

  } catch (err) {
    console.error("Main error:", err);
  } finally {
    mongoose.disconnect();
  }
}

checkSearch();
