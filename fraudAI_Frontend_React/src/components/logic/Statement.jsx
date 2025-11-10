import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "./Header.jsx";
import SidebarContent from "./SidebarContent";
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { Search, Download, Calendar, List } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Responsive Statement.jsx
 * - Mobile: stacked transaction cards
 * - Desktop: table-like grid
 * - Uses mock transactions if Firestore returns empty so UI can be previewed
 */

const ROWS_PER_PAGE = 8;

const formatCurrency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const toCSV = (arr) => {
  if (!arr || !arr.length) return "";
  const headers = Object.keys(arr[0]);
  const lines = [headers.join(",")];
  for (const row of arr) {
    lines.push(
      headers
        .map((h) => {
          const v = row[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(",")
    );
  }
  return lines.join("\n");
};

// Mock data so UI shows something while testing — remove when you have real data
const mockTransactions = [
  {
    id: "TXN1001",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    amount: 1200,
    type: "Debit",
    to: "ravi@hdfc",
    from: "varsha@ybl",
    note: "Dinner",
  },
  {
    id: "TXN1002",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    amount: 5000,
    type: "Credit",
    to: "varsha@ybl",
    from: "salary@bank",
    note: "Salary",
  },
  {
    id: "TXN1003",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    amount: 350,
    type: "Debit",
    to: "paytm@upi",
    from: "varsha@ybl",
    note: "Groceries",
  },
  {
    id: "TXN1004",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    amount: 2999,
    type: "Debit",
    to: "flipkart@upi",
    from: "varsha@ybl",
    note: "Shoes",
  },
  {
    id: "TXN1005",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    amount: 150,
    type: "Debit",
    to: "coffee@upi",
    from: "varsha@ybl",
    note: "Coffee",
  },
  {
    id: "TXN1006",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    amount: 20000,
    type: "Credit",
    to: "varsha@ybl",
    from: "bonus@bank",
    note: "Bonus",
  },
];

const Statement = () => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // controls
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All"); // All / Credit / Debit
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchTransactions = async () => {
      const currentUser = auth.currentUser;
      setUser(currentUser || null);
      if (!currentUser) {
        setTransactions(mockTransactions);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const tx = Array.isArray(data.transactions) ? data.transactions : [];
          // sort descending by date if date exists
          tx.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(tx.length ? tx : mockTransactions);
        } else {
          // no doc yet — show mock data for preview
          setTransactions(mockTransactions);
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
        // show mock data when Firestore is offline or errors
        setTransactions(mockTransactions);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // filtering
  const filtered = useMemo(() => {
    let arr = transactions.slice();

    if (typeFilter !== "All") {
      arr = arr.filter((t) => String(t.type || "").toLowerCase() === typeFilter.toLowerCase());
    }

    if (fromDate) {
      const from = new Date(fromDate);
      arr = arr.filter((t) => new Date(t.date) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      arr = arr.filter((t) => new Date(t.date) <= to);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((t) =>
        String(t.id || "").toLowerCase().includes(q) ||
        String(t.upi || t.to || t.from || "").toLowerCase().includes(q) ||
        String(t.note || "").toLowerCase().includes(q)
      );
    }

    return arr;
  }, [transactions, query, typeFilter, fromDate, toDate]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  const visible = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [filtered, page]);

  // summary
  const summary = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    for (const t of filtered) {
      const amt = Number(t.amount || 0);
      if ((t.type || "").toLowerCase() === "credit") totalCredit += amt;
      else totalDebit += amt;
    }
    return { totalCredit, totalDebit, net: totalCredit - totalDebit };
  }, [filtered]);

  const handleExportCSV = () => {
    const simplified = filtered.map((t) => ({
      id: t.id || "",
      date: t.date ? new Date(t.date).toISOString() : "",
      type: t.type || "",
      amount: t.amount ?? "",
      party: t.to || t.from || "",
      note: t.note || "",
    }));
    const csv = toCSV(simplified);
    if (!csv) return alert("No transactions to export.");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement_${user?.uid ?? "anon"}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-gray-800 bg-gray-900">
        <SidebarContent />
      </aside>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Header user={user} onSignIn={() => {}} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center text-white text-lg font-semibold">
              <List className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-blue-400">Account Statement</h2>
              <p className="text-xs md:text-sm text-gray-400">View, filter and export your transactions.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleExportCSV} className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-4">
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded p-2">
            <Search className="h-4 w-4 mr-2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by UPI, note, tx id..."
              className="bg-transparent outline-none flex-1 text-sm text-gray-200"
            />
          </div>

          <div className="flex items-center bg-gray-800 border border-gray-700 rounded p-2">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" className="bg-transparent outline-none text-sm text-gray-200 mr-2" />
            <span className="px-2 text-gray-500">to</span>
            <input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" className="bg-transparent outline-none text-sm text-gray-200 ml-2" />
          </div>

          <div className="flex items-center bg-gray-800 border border-gray-700 rounded p-2 justify-between">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent outline-none text-sm text-gray-200">
              <option value="All">All</option>
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </select>
            <div className="ml-3 text-xs text-gray-400">Rows: {filtered.length}</div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-gray-300">Total Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-400">{formatCurrency(summary.totalCredit)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-gray-300">Total Debit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-red-400">{formatCurrency(summary.totalDebit)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-gray-300">Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-bold ${summary.net >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(summary.net)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions list */}
        <Card className="bg-gray-800 border-gray-700 mb-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-400">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400">Loading transactions...</div>
            ) : filtered.length === 0 ? (
              <div className="text-gray-400">No transactions found for the selected filters.</div>
            ) : (
              <>
                {/* MOBILE / SMALL SCREENS: stacked cards */}
                <div className="space-y-3 md:hidden">
                  {visible.map((t) => (
                    <motion.div
                      key={t.id || `${t.date}-${t.amount}-${Math.random()}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col sm:flex-row sm:justify-between bg-gray-900 border border-gray-800 rounded p-3"
                    >
                      <div className="mb-2 sm:mb-0">
                        <div className="text-sm font-medium text-white">{t.note || (t.to || t.from) || "Transaction"}</div>
                        <div className="text-xs text-gray-400">{t.id ? `ID: ${t.id}` : ""} {t.date && ` • ${new Date(t.date).toLocaleString()}`}</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={`text-sm font-semibold ${t.type?.toLowerCase() === "credit" ? "text-green-400" : "text-red-400"}`}>
                          {t.type === "Credit" ? "+" : "-"}{formatCurrency(t.amount)}
                        </div>
                        <div className="text-xs text-gray-400 ml-4">{t.type || ""}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* DESKTOP / MD+: table-like grid */}
                <div className="hidden md:block">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-800">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Note / Party</th>
                          <th className="py-3 px-3">Transaction ID</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                          <th className="py-3 px-3">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((t) => (
                          <tr key={t.id || `${t.date}-${t.amount}-${Math.random()}`} className="border-b border-gray-800">
                            <td className="py-3 px-3 align-top text-sm text-gray-300">{t.date ? new Date(t.date).toLocaleString() : "-"}</td>
                            <td className="py-3 px-3 align-top text-sm text-white">
                              <div>{t.note || (t.to || t.from) || "Transaction"}</div>
                              <div className="text-xs text-gray-400 mt-1">{t.to ? `To: ${t.to}` : ""}{t.from ? ` ${t.from ? `• From: ${t.from}` : ""}` : ""}</div>
                            </td>
                            <td className="py-3 px-3 align-top text-sm text-gray-300">{t.id || "-"}</td>
                            <td className="py-3 px-3 align-top text-right text-sm">
                              <span className={`${t.type?.toLowerCase() === "credit" ? "text-green-400" : "text-red-400"} font-semibold`}>
                                {t.type === "Credit" ? "+" : "-"}{formatCurrency(t.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top text-sm text-gray-400">{t.type || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-sm text-gray-400">Showing {(page - 1) * ROWS_PER_PAGE + 1} - {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}</div>

          <div className="flex items-center space-x-2">
            <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <div className="text-sm text-gray-300">Page {page} / {totalPages}</div>
            <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statement;
