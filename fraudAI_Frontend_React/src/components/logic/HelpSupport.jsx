import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "./Header.jsx";
import SidebarContent from "./SidebarContent";
import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, LifeBuoy, MessageCircle, Phone } from "lucide-react";
import { motion } from "framer-motion";

const FAQS = [
  {
    q: "How does SafePayAI verify a UPI ID?",
    a: "We run a risk analysis using our Random Forest model and cross-check with stored flags. The UI shows warnings for high-risk recipients."
  },
  {
    q: "Where are my saved beneficiaries stored?",
    a: "Saved beneficiaries are stored in your Firestore user document under `beneficiaries`. They are tied to your Google account UID."
  },
  {
    q: "What happens if the app is offline?",
    a: "The app will work in offline mode for read operations. Writes may be saved locally and synced when the device reconnects (if enabled)."
  },
  {
    q: "How do I report a fraud?",
    a: "Use the support form below to report suspected fraud. Include transaction details and UPI IDs if available."
  },
];

const CATEGORIES = ["Technical", "Billing", "Fraud Report", "Feature Request", "Other"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

const HelpSupport = () => {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState("Normal");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchUserAndTickets = async () => {
      const currentUser = auth.currentUser;
      setUser(currentUser || null);
      if (!currentUser) {
        setTickets([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setTickets(data.supportTickets || []);
        } else {
          setTickets([]);
        }
      } catch (err) {
        console.error("Error fetching support tickets:", err);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTickets();
  }, []);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in with Google to submit a support request.");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      alert("Please enter a subject and message.");
      return;
    }

    setSending(true);
    const ticket = {
      id: `tkt_${Date.now()}`,
      subject: subject.trim(),
      category,
      priority,
      message: message.trim(),
      phone: phone.trim() || null,
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const current = (snap.exists() && snap.data().supportTickets) ? snap.data().supportTickets : [];
      const updated = [ticket, ...current];
      await setDoc(userRef, { supportTickets: updated }, { merge: true });
      setTickets(updated);

      setSubject("");
      setCategory(CATEGORIES[0]);
      setPriority("Normal");
      setMessage("");
      setPhone("");
      alert("Support request submitted. Our team will contact you soon.");
    } catch (err) {
      console.error("Error submitting ticket:", err);
      alert("Failed to submit support request. Please try again later.");
    } finally {
      setSending(false);
    }
  };

  const handleCopySupportEmail = async () => {
    const email = "support@safepayai.example";
    try {
      await navigator.clipboard?.writeText(email);
      alert(`Support email copied: ${email}`);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-gray-800 bg-gray-900">
        <SidebarContent />
      </aside>

      <div className="flex-1 p-6 overflow-y-auto">
        <Header user={user} onSignIn={() => {}} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-4 mt-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-semibold">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-400">Help & Support</h2>
              <p className="text-sm text-gray-400">Get help, report issues, or request features.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={handleCopySupportEmail} className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>support@safepayai.example</span>
            </Button>
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText("+91 9876543210")}>
              <Phone className="h-4 w-4" />
              <span className="ml-2 text-sm text-gray-300">+91 98765 43210</span>
            </Button>
          </div>
        </motion.div>

        {/* --- FAQ FIRST --- */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-400">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FAQS.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.03 }}
                  className="p-3 rounded border border-gray-800 bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{f.q}</div>
                      <div className="text-xs text-gray-400 mt-1">{f.a}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* --- THEN THE SUPPORT FORM --- */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-400">Submit a Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="text-sm text-gray-300">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                  placeholder="Briefly describe the issue"
                  required
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="w-36">
                  <label className="text-sm text-gray-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                  >
                    {["Low", "Normal", "High", "Urgent"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300">Phone (optional)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                  placeholder="Describe your issue or request in detail."
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center space-x-2" disabled={sending}>
                  <MessageCircle className="h-4 w-4" />
                  <span>{sending ? "Sending..." : "Send Request"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* --- Your Submitted Requests --- */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-400">Your Support Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400">Loading your tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="text-gray-400">You have no support requests. Submit one above.</div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{t.subject}</div>
                      <div className="text-xs text-gray-400">
                        {t.category} • {t.priority} • {new Date(t.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{t.message}</div>
                      {t.phone && <div className="text-xs text-gray-500 mt-1">📞 {t.phone}</div>}
                    </div>
                    <div className="text-xs text-gray-400">{t.status}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpSupport;
