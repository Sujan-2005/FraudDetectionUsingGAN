import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "./Header";
import SidebarContent from "./SidebarContent";
import { motion } from "framer-motion";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Moon, Sun, Settings as SettingsIcon, Trash2 } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setUser(currentUser);

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setName(data.name || currentUser.displayName || "");
          setPhone(data.phone || "");
          setPhotoURL(data.photoURL || currentUser.photoURL || "");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name, phone, photoURL });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to permanently delete your account?")) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await deleteDoc(userRef);
      await user.delete();
      alert("Account deleted successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Error deleting account:", err);
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
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
              <SettingsIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-400">Settings</h2>
              <p className="text-sm text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-gray-400">Loading settings...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-blue-400">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 ring-2 ring-blue-500">
                      {photoURL ? <AvatarImage src={photoURL} /> : <AvatarFallback>{name?.charAt(0) || "U"}</AvatarFallback>}
                    </Avatar>
                    <input
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white text-sm"
                      placeholder="Photo URL"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Full Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full mt-1 p-2 rounded bg-gray-900 border border-gray-700 text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updating}>
                      {updating ? "Updating..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Preferences & Account Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-400">Preferences & Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Theme</span>
                  <Button variant="outline" onClick={handleThemeToggle} className="flex items-center space-x-2">
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                  </Button>
                </div>

                <div className="border-t border-gray-700 my-3"></div>

                <div className="flex justify-between">
                  <Button variant="outline" className="flex items-center space-x-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>

                  <Button variant="destructive" className="flex items-center space-x-2" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;