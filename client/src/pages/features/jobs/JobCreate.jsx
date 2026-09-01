import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth0 } from "@auth0/auth0-react";
import { Loader2 } from "lucide-react";

const CATEGORIES = ['Movers', 'Carpenter', 'Plumber', 'Electrician', 'Masonry', 'Cleaners'];

export default function JobCreate({ onCreated, location }) {
  const { getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("");

  const submit = async () => {
    if (!title || !description || !amount || !time || !category) {
      alert("Please fill in Title, Description, Amount, Time, and Category.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      alert("Amount must be a positive whole number (no decimals).");
      return;
    }
    setLoading(true);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      await api.post(
        "/api/jobs",
        {
          title,
          description,
          amount,
          time,
          category,
          location: {
            lat: Number(location.lat),
            lng: Number(location.lng),
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTitle("");
      setDescription("");
      setAmount("");
      setTime("");
      setCategory("");

      if (onCreated) onCreated();
      alert("Job posted successfully!");

    } catch (error) {
      console.error("Failed to post job", error);
      alert("Failed to post job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const glassInput = "w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all";

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-3">
        <input
          className={glassInput}
          placeholder="Job Title (e.g. Electrician)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Category Picker */}
        <div>
          <p className="text-zinc-400 text-xs mb-2 ml-1 font-medium">Job Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${category === cat
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-300"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className={`${glassInput} min-h-[100px] resize-none`}
          placeholder="Describe the job..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3">
          <input
            className={glassInput}
            placeholder="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <input
            className={glassInput}
            placeholder="Time (e.g. 2 hrs)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full mt-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-semibold py-3 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Post Job"}
      </button>
    </div>
  );
}