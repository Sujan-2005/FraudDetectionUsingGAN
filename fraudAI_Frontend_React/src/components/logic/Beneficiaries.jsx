import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "./Header.jsx";
import SidebarContent from "./SidebarContent";
import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

const Beneficiaries = () => {
  const [user, setUser] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState("");
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchUserAndBeneficiaries = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        setBeneficiaries([]);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setBeneficiaries(data.beneficiaries || []);
        } else {
          setBeneficiaries([]);
        }
      } catch (err) {
        console.error("Error fetching beneficiaries:", err);
        setBeneficiaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBeneficiaries();
  }, []);

  const refreshBeneficiariesFromServer = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setBeneficiaries(userSnap.data().beneficiaries || []);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !upi.trim()) return;

    setAdding(true);
    const newBeneficiary = {
      name: name.trim(),
      upi: upi.trim(),
      bank: bank.trim() || "Unknown",
      phone: phone.trim() || "",
      addedAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, "users", user.uid);
      // read current beneficiaries then update (to avoid overwriting)
      const userSnap = await getDoc(userRef);
      let current = [];
      if (userSnap.exists()) current = userSnap.data().beneficiaries || [];

      // avoid duplicates by UPI
      const exists = current.some((b) => b.upi === newBeneficiary.upi);
      if (!exists) {
        const updated = [...current, newBeneficiary];
        await updateDoc(userRef, { beneficiaries: updated });
        setBeneficiaries(updated);
        // reset form
        setName("");
        setUpi("");
        setBank("");
        setPhone("");
      } else {
        // if duplicate, optionally update or show message - simple console log for now
        console.warn("Beneficiary with same UPI already exists");
      }
    } catch (err) {
      console.error("Error adding beneficiary:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveBeneficiary = async (upiToRemove) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      let current = [];
      if (userSnap.exists()) current = userSnap.data().beneficiaries || [];

      const updated = current.filter((b) => b.upi !== upiToRemove);
      await updateDoc(userRef, { beneficiaries: updated });
      setBeneficiaries(updated);
    } catch (err) {
      console.error("Error removing beneficiary:", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-gray-800 bg-gray-900">
        <SidebarContent />
      </aside>

      <div className="flex-1 p-6 overflow-y-auto">
        <Header user={user} onSignIn={() => {}} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-4 mt-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-400">Beneficiaries</h2>
              <p className="text-sm text-gray-400">Manage your saved recipients (UPI IDs)</p>
            </div>
          </div>

          <Button
            className="flex items-center space-x-2"
            onClick={refreshBeneficiariesFromServer}
          >
            <Plus className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-400">Add Beneficiary</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBeneficiary} className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                    placeholder="Ravi Kumar"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">UPI ID</label>
                  <input
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                    placeholder="ravi@hdfc"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">Bank (optional)</label>
                  <input
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                    placeholder="Bank Name"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">Phone Number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="flex items-center space-x-2" disabled={adding}>
                    <UserPlus className="h-4 w-4" />
                    <span>{adding ? "Adding..." : "Add Beneficiary"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-400">Saved Beneficiaries</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-gray-400">Loading beneficiaries...</div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-gray-400">No beneficiaries found. Add one using the form.</div>
              ) : (
                <div className="space-y-3">
                  {beneficiaries.map((b) => (
                    <motion.div
                      key={b.upi}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 ring-2 ring-blue-500">
                          {b.photoURL ? (
                            <AvatarImage src={b.photoURL} />
                          ) : (
                            <AvatarFallback>{b.name?.charAt(0)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-white">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.upi} • {b.bank}</div>
                          {b.phone && <div className="text-xs text-gray-500">📞 {b.phone}</div>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() => navigator.clipboard?.writeText(b.upi)}
                        >
                          Copy UPI
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex items-center space-x-2"
                          onClick={() => handleRemoveBeneficiary(b.upi)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Beneficiaries;
