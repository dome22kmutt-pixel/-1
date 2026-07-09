import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Phone, 
  Building2, 
  User, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  Briefcase, 
  Compass, 
  Send, 
  HelpCircle, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Mail,
  MapPin,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Contact {
  id: number;
  name: string;
  phone: string;
  department: string;
  position: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  matchingIds?: number[];
  timestamp: Date;
}

const PRESET_QUERIES = [
  "ขอรายชื่อพนักงานฝ่าย IT ทั้งหมด",
  "ใครฝ่ายบุคคลที่มีเบอร์ลงท้ายด้วย 4",
  "เบอร์ของวิศวกรฝ่ายปฏิบัติการคือใครบ้าง",
  "ค้นหาหัวหน้างานทั้งหมด",
  "มีพนักงานชื่อแดงอยู่ฝ่ายไหน"
];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // AI Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "สวัสดีครับ! ผมคือผู้ช่วย AI ประจำสมุดโทรศัพท์องค์กร ท่านสามารถถามคำถามหรือให้ผมค้นหาพนักงาน เช่น 'ใครบ้างอยู่ฝ่าย IT?' หรือ 'ค้นหาพนักงานตำแหน่งวิศวกร' ได้เลยครับ",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [aiActiveFilter, setAiActiveFilter] = useState<number[] | null>(null);

  // Copy State
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal Detail State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Contacts
  const loadContacts = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await fetch("/api/contacts");
      const data = await response.json();
      if (data.success) {
        setContacts(data.contacts);
      } else {
        throw new Error(data.error || "Failed to load directory");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Handle Contact Copy
  const handleCopyPhone = (contact: Contact) => {
    navigator.clipboard.writeText(contact.phone);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // List unique departments with counts
  const departments = React.useMemo(() => {
    const depts = contacts.map(c => c.department);
    const counts = depts.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { name: "All", label: "ทั้งหมด", count: contacts.length },
      ...Object.keys(counts).map(name => ({
        name,
        label: name,
        count: counts[name]
      }))
    ];
  }, [contacts]);

  // Filter contacts based on search query, selected department, and AI selection
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(contact => {
      // 1. AI Active Index Filter
      if (aiActiveFilter && !aiActiveFilter.includes(contact.id)) {
        return false;
      }

      // 2. Department Tab Filter
      if (selectedDept !== "All" && contact.department !== selectedDept) {
        return false;
      }

      // 3. Text Search Term Filter
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const idMatch = contact.id.toString() === term;
        const nameMatch = contact.name.toLowerCase().includes(term);
        const phoneMatch = contact.phone.includes(term);
        const deptMatch = contact.department.toLowerCase().includes(term);
        const posMatch = contact.position.toLowerCase().includes(term);
        return idMatch || nameMatch || phoneMatch || deptMatch || posMatch;
      }

      return true;
    });
  }, [contacts, searchTerm, selectedDept, aiActiveFilter]);

  // Handle AI Chat Submission
  const handleSendChat = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text })
      });
      const data = await response.json();

      if (data.success) {
        const aiMessage: ChatMessage = {
          id: Math.random().toString(),
          sender: "ai",
          text: data.text,
          matchingIds: data.matchingIds,
          timestamp: new Date()
        };

        setChatHistory(prev => [...prev, aiMessage]);

        // If AI returned matching IDs, apply filter automatically
        if (data.matchingIds && data.matchingIds.length > 0) {
          setAiActiveFilter(data.matchingIds);
        }
      } else {
        throw new Error(data.error || "AI Service failed");
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "ai",
          text: "ขออภัยครับ ระบบเชื่อมต่อกับผู้ช่วย AI ขัดข้องชั่วคราว แต่ท่านยังสามารถค้นหาพนักงานด้วยแถบเครื่องมือค้นหาปกติได้ครับ",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Clear AI Filter
  const clearAiFilter = () => {
    setAiActiveFilter(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Upper Navigation / Decorative Header */}
      <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between flex-none">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center shadow-xs">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight flex items-center gap-1">
              DirectoryPro<span className="text-blue-600">.</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              ระบบค้นหาเบอร์โทรศัพท์และแผนกภายในองค์กร
            </p>
          </div>
        </div>

        <nav className="hidden md:flex gap-6 text-xs sm:text-sm font-semibold text-slate-500">
          <button 
            onClick={() => setSelectedDept("All")}
            className={`py-5 transition-colors cursor-pointer ${selectedDept === "All" ? "text-blue-600 border-b-2 border-blue-600" : "hover:text-slate-900"}`}
          >
            รายชื่อพนักงาน
          </button>
          <a 
            href="https://docs.google.com/spreadsheets/d/1z_9YbNi2fzcmlKjdN4XeSSbCBS9kknWTVII5V8WEL8k/edit?pli=1&gid=0#gid=0"
            target="_blank" 
            rel="noreferrer" 
            className="hover:text-slate-900 py-5 flex items-center gap-1.5"
          >
            <span>ต้นฉบับ Sheet</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </nav>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => loadContacts(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Banner Section */}
        <div className="mb-6 bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden border border-slate-800 shadow-xs">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                เชื่อมต่อฐานข้อมูล Google Sheet สำเร็จ
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                ค้นหาเบอร์โทรศัพท์บุคลากร
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed">
                อำนวยความสะดวกในการค้นหาข้อมูลพนักงานและเบอร์ติดต่อภายในองค์กร แยกตามรายแผนก หรือเลือกใช้คำสั่งภาษาไทยพิมพ์สอบถามผู้ช่วยอัจฉริยะ (AI Assistant) เพื่อหาบุคคลที่ท่านต้องการได้อย่างรวดเร็ว
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl backdrop-blur-xs min-w-[280px]">
              <div className="text-center border-r border-slate-700/50 pr-2">
                <div className="text-xl font-bold font-mono text-blue-400">{contacts.length || "100"}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">พนักงานทั้งหมด</div>
              </div>
              <div className="text-center border-r border-slate-700/50 px-2">
                <div className="text-xl font-bold font-mono text-blue-400">{departments.length ? departments.length - 1 : "5"}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">แผนกงาน</div>
              </div>
              <div className="text-center pl-2">
                <div className="text-xl font-bold font-mono text-emerald-400">100%</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">สถานะคู่สาย</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Phone Directory List & Search Controls */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Search Controls Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="ค้นหาด้วย ชื่อ, นามสกุล, เบอร์โทรศัพท์ หรือ แผนก..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-sm font-medium transition-all outline-hidden text-slate-800"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/60 hover:bg-slate-200 px-1.5 py-0.5 rounded-md"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>

              {/* Department Tab Filtering */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  แยกตามฝ่ายงาน ({departments.length - 1})
                </label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => {
                    const isActive = selectedDept === dept.name;
                    return (
                      <button
                        key={dept.name}
                        onClick={() => setSelectedDept(dept.name)}
                        className={`text-xs px-3.5 py-1.5 rounded-md font-semibold transition-all border cursor-pointer ${
                          isActive 
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs" 
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {dept.label}
                        <span className={`ml-1.5 text-[10px] font-mono px-1 rounded-sm ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                          {dept.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Filters Display */}
              {(aiActiveFilter || searchTerm || selectedDept !== "All") && (
                <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>
                      {aiActiveFilter && `เปิดตัวกรอง AI อยู่ (${filteredContacts.length} พนักงานที่เกี่ยวข้อง)`}
                      {!aiActiveFilter && `กำลังแสดงพนักงานทั้งหมด ${filteredContacts.length} คน จากการค้นหาปกติ`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {aiActiveFilter && (
                      <button 
                        onClick={clearAiFilter}
                        className="font-bold underline hover:text-blue-950 cursor-pointer text-blue-700"
                      >
                        ปิดตัวกรอง AI
                      </button>
                    )}
                    {(searchTerm || selectedDept !== "All") && (
                      <button 
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedDept("All");
                        }}
                        className="font-bold underline hover:text-blue-950 cursor-pointer text-blue-700"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contacts Container */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  รายการบุคลากร ({filteredContacts.length} รายการ)
                </span>
                {selectedDept !== "All" && (
                  <span className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded-full">
                    ฝ่าย{selectedDept}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="bg-white rounded-xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                  <p className="text-slate-500 text-sm font-medium">กำลังดึงข้อมูลสมุดรายชื่อจาก Google Sheet...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 rounded-xl p-8 border border-red-100 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                  <button 
                    onClick={() => loadContacts()}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="bg-white rounded-xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-slate-700 font-bold text-sm">ไม่พบรายชื่อหรือแผนกที่ระบุ</h3>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    กรุณาตรวจสอบการสะกดชื่อ คำสำคัญ หรือลองเคลียร์ช่องค้นหาเพื่อดูพนักงานทั้งหมด
                  </p>
                  {(searchTerm || selectedDept !== "All" || aiActiveFilter) && (
                    <button 
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedDept("All");
                        clearAiFilter();
                      }}
                      className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-100/30 cursor-pointer"
                    >
                      ล้างตัวกรองเพื่อเริ่มใหม่
                    </button>
                  )}
                </div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredContacts.map((contact, index) => {
                      const hasName = contact.name.trim() !== "";
                      const displayName = hasName ? contact.name : `พนักงานลำดับที่ ${contact.id}`;
                      const isCopied = copiedId === contact.id;
                      
                      // Highlight matching search term in text
                      const highlightText = (text: string, search: string) => {
                        if (!search.trim()) return text;
                        const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                        const parts = text.split(regex);
                        return (
                          <span>
                            {parts.map((part, i) => 
                              part.toLowerCase() === search.toLowerCase() ? (
                                <mark key={i} className="bg-amber-100 text-amber-900 rounded-sm px-0.5">{part}</mark>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        );
                      };

                      // Color themes based on department for a clean professional look
                      let avatarBg = "bg-blue-50 text-blue-700";
                      if (contact.department === "IT") avatarBg = "bg-cyan-50 text-cyan-700";
                      else if (contact.department === "บุคคล") avatarBg = "bg-rose-50 text-rose-700";
                      else if (contact.department === "การเงิน") avatarBg = "bg-amber-50 text-amber-700";
                      else if (contact.department === "วิศวกรรม") avatarBg = "bg-indigo-50 text-indigo-700";
                      else if (contact.department === "ปฏิบัติการ") avatarBg = "bg-emerald-50 text-emerald-700";

                      return (
                        <motion.div
                          key={contact.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.15) }}
                          onClick={() => setSelectedContact(contact)}
                          className={`bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-md hover:border-blue-200 hover:bg-slate-50/30 transition-all duration-200 cursor-pointer group ${
                            aiActiveFilter?.includes(contact.id) ? "ring-2 ring-blue-500 bg-blue-50/10" : ""
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Card Top Block */}
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Ext. {contact.id}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                                contact.department === "IT" ? "bg-cyan-50 border-cyan-100 text-cyan-700" :
                                contact.department === "บุคคล" ? "bg-rose-50 border-rose-100 text-rose-700" :
                                contact.department === "การเงิน" ? "bg-amber-50 border-amber-100 text-amber-700" :
                                contact.department === "วิศวกรรม" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                                contact.department === "ปฏิบัติการ" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                "bg-slate-50 border-slate-100 text-slate-600"
                              }`}>
                                {contact.department}
                              </span>
                            </div>

                            {/* Info Container */}
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-transform group-hover:scale-105 duration-200 ${avatarBg}`}>
                                {hasName ? contact.name.trim().substring(0, 2) : "พน"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className={`text-sm font-bold truncate text-slate-900 group-hover:text-blue-600 transition-colors`}>
                                  {searchTerm ? highlightText(displayName, searchTerm) : displayName}
                                </h3>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {searchTerm ? highlightText(contact.position, searchTerm) : contact.position}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-slate-100 my-3"></div>

                          {/* Phone Section */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Phone className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-xs font-mono font-bold tracking-wide text-slate-600">
                                {contact.phone ? (
                                  contact.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
                                ) : (
                                  "ไม่มีข้อมูลเบอร์"
                                )}
                              </span>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyPhone(contact);
                                }}
                                title="คัดลอกเบอร์โทรศัพท์"
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isCopied 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <a
                                href={`tel:${contact.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                title="โทรออกโดยตรง"
                                className="p-1.5 bg-blue-50 border border-blue-100/50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>

          {/* RIGHT: AI Search Assistant (powered by Gemini) */}
          <div className="lg:col-span-5 flex flex-col h-[650px] lg:h-[calc(100vh-180px)] min-h-[500px]">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
              {/* Card Header */}
              <div className="bg-slate-900 p-4 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-500/20 text-blue-300 p-1.5 rounded-lg border border-blue-500/30">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">ผู้ช่วย AI ค้นหาเบอร์</h3>
                    <p className="text-[10px] text-blue-300 font-medium">Powered by Gemini 3.5 Flash</p>
                  </div>
                </div>

                {aiActiveFilter && (
                  <button 
                    onClick={clearAiFilter}
                    className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    ล้างการกรอง AI
                  </button>
                )}
              </div>

              {/* Chat Message Box */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">
                {chatHistory.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs ${
                      msg.sender === "user" 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                    }`}>
                      {msg.sender === "ai" && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">
                          <Sparkles className="h-3 w-3" />
                          <span>DIRECTORY AI ASSISTANT</span>
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      
                      {msg.matchingIds && msg.matchingIds.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            พบผลลัพธ์พนักงาน {msg.matchingIds.length} คน (กรองให้อัตโนมัติแล้ว):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {msg.matchingIds.map(id => {
                              const found = contacts.find(c => c.id === id);
                              if (!found) return null;
                              return (
                                <button 
                                  key={id}
                                  onClick={() => {
                                    setAiActiveFilter([id]);
                                    setSelectedDept("All");
                                  }}
                                  className="text-[9px] bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold transition-all text-left truncate max-w-[120px] cursor-pointer"
                                >
                                  #{id} {found.name || "ไม่ระบุชื่อ"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-xl rounded-bl-none p-4 max-w-[85%] shadow-xs space-y-2">
                      <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>กำลังประมวลผลข้อมูลสารสนเทศ...</span>
                      </div>
                      <div className="flex space-x-1.5 items-center py-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions Panel */}
              <div className="bg-white px-4 py-2 border-t border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Compass className="h-3 w-3" />
                  <span>คำถามแนะนำ (แตะเพื่อถาม)</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                  {PRESET_QUERIES.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSendChat(query)}
                      disabled={isChatLoading}
                      className="shrink-0 text-[10px] bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-slate-600 px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(chatInput);
                }}
                className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2"
              >
                <input 
                  type="text"
                  placeholder="ถาม AI เช่น 'มีวิศวกรกี่คน', 'หาพนักงานไอที'..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                  className="flex-1 bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden text-slate-800 disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs text-slate-400 font-medium">
            © 2026 DirectoryPro. ระบบค้นหาเบอร์โทรศัพท์บุคลากรภายในองค์กร • ออกแบบด้วยความประณีตสำหรับผู้ใช้งาน
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-medium">
            <span>ข้อกำหนดการใช้งาน</span>
            <span>•</span>
            <span>นโยบายความเป็นส่วนตัว</span>
            <span>•</span>
            <a 
              href="https://docs.google.com/spreadsheets/d/1z_9YbNi2fzcmlKjdN4XeSSbCBS9kknWTVII5V8WEL8k/edit?pli=1&gid=0#gid=0" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-blue-600 inline-flex items-center gap-0.5"
            >
              <span>ต้นฉบับ Google Sheet</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Employee Expanded Details Modal */}
      <AnimatePresence>
        {selectedContact && (() => {
          const hasName = selectedContact.name.trim() !== "";
          const displayName = hasName ? selectedContact.name : `พนักงานลำดับที่ ${selectedContact.id}`;
          
          // Get reporting manager
          const manager = selectedContact.department ? contacts.find(c => 
            c.department === selectedContact.department && 
            c.id !== selectedContact.id &&
            (c.position.includes("หัวหน้า") || c.position.includes("ผู้จัดการ") || c.position.includes("บริหาร") || c.position.includes("วิเคราะห์"))
          ) : null;

          // Office Location mapping
          let officeLocation = "อาคารสำนักงานใหญ่ ชั้น 1 (Main Headquarter)";
          if (selectedContact.department === "IT") officeLocation = "อาคาร A ชั้น 4 ห้องปฏิบัติการสนับสนุน (IT Support Room)";
          else if (selectedContact.department === "บุคคล") officeLocation = "อาคาร A ชั้น 2 สำนักงานทรัพยากรบุคคล (HR Office)";
          else if (selectedContact.department === "การเงิน") officeLocation = "อาคาร B ชั้น 3 ฝ่ายบัญชีและการเงิน (Accounting & Finance Dept)";
          else if (selectedContact.department === "วิศวกรรม") officeLocation = "อาคาร C ชั้น 2 ห้องวิจัยและพัฒนาวิศวกรรม (Engineering Lab)";
          else if (selectedContact.department === "ปฏิบัติการ") officeLocation = "อาคาร C ชั้น 1 แผนกปฏิบัติการทั่วไป (Operations Site)";

          // Email Generator
          const emailAddress = `emp.${selectedContact.id}@directorypro.co.th`;

          // Department theme coloring
          let themeColor = "from-blue-600 to-indigo-600 text-blue-600 bg-blue-50 border-blue-100";
          let avatarTheme = "bg-blue-100 text-blue-700";
          if (selectedContact.department === "IT") {
            themeColor = "from-cyan-600 to-teal-600 text-cyan-700 bg-cyan-50 border-cyan-100";
            avatarTheme = "bg-cyan-100 text-cyan-800";
          } else if (selectedContact.department === "บุคคล") {
            themeColor = "from-rose-500 to-pink-600 text-rose-700 bg-rose-50 border-rose-100";
            avatarTheme = "bg-rose-100 text-rose-800";
          } else if (selectedContact.department === "การเงิน") {
            themeColor = "from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-100";
            avatarTheme = "bg-amber-100 text-amber-800";
          } else if (selectedContact.department === "วิศวกรรม") {
            themeColor = "from-indigo-600 to-violet-600 text-indigo-700 bg-indigo-50 border-indigo-100";
            avatarTheme = "bg-indigo-100 text-indigo-800";
          } else if (selectedContact.department === "ปฏิบัติการ") {
            themeColor = "from-emerald-600 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-100";
            avatarTheme = "bg-emerald-100 text-emerald-800";
          }

          const handleCopyFullInfo = () => {
            const text = `รายชื่อบุคลากร: ${selectedContact.name || 'ไม่ระบุชื่อ'}
ตำแหน่ง: ${selectedContact.position || 'ไม่ระบุ'}
ฝ่ายงาน: ${selectedContact.department || 'ไม่ระบุ'}
เบอร์โทรศัพท์: ${selectedContact.phone || 'ไม่มีข้อมูล'} (Ext. ${selectedContact.id})
อีเมลบริษัท: ${emailAddress}
สถานที่ปฏิบัติงาน: ${officeLocation}
ผู้บังคับบัญชาสายตรง: ${manager ? `${manager.name} (${manager.position})` : 'ไม่มีข้อมูลหัวหน้าสายงานโดยตรง'}`;

            navigator.clipboard.writeText(text);
            const originalId = selectedContact.id;
            setCopiedId(originalId);
            setTimeout(() => setCopiedId(null), 2000);
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedContact(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col"
              >
                {/* Decorative Colorful Banner Header */}
                <div className={`h-24 bg-gradient-to-r ${themeColor.split(" ")[0]} ${themeColor.split(" ")[1]} relative flex items-end p-4`}>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
                    title="ปิดหน้าต่าง"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="px-6 pb-6 pt-12 relative flex-1">
                  {/* Floating Large Avatar */}
                  <div className="absolute -top-12 left-6">
                    <div className={`w-24 h-24 rounded-2xl shadow-md border-4 border-white flex items-center justify-center font-bold text-2xl tracking-wide ${avatarTheme}`}>
                      {hasName ? selectedContact.name.trim().substring(0, 2) : "พน"}
                    </div>
                  </div>

                  {/* Header Names */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-950">{displayName}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${themeColor.split(" ").slice(2).join(" ")}`}>
                        ฝ่าย{selectedContact.department}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        Ext. {selectedContact.id}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{selectedContact.position}</p>
                  </div>

                  {/* Info Divider */}
                  <div className="h-px bg-slate-100 my-5"></div>

                  {/* Fields Block */}
                  <div className="space-y-4">
                    {/* Phone Number Row */}
                    <div className="flex items-start gap-3 group/row">
                      <div className="bg-blue-50 text-blue-600 p-2 rounded-lg mt-0.5">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">เบอร์โทรศัพท์ติดต่อ</span>
                        <span className="text-sm font-mono font-bold text-slate-800">
                          {selectedContact.phone ? (
                            selectedContact.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
                          ) : (
                            "ไม่มีข้อมูลเบอร์"
                          )}
                        </span>
                      </div>
                      {selectedContact.phone && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedContact.phone);
                              setCopiedId(9999); // temporary custom copy visual flag
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                            title="คัดลอกเบอร์โทร"
                          >
                            {copiedId === 9999 ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <a
                            href={`tel:${selectedContact.phone}`}
                            className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
                            title="โทรออก"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Email Row */}
                    <div className="flex items-start gap-3 group/row">
                      <div className="bg-cyan-50 text-cyan-600 p-2 rounded-lg mt-0.5">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">อีเมลบริษัท (Corporate Email)</span>
                        <span className="text-sm font-semibold text-slate-800 block truncate">{emailAddress}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(emailAddress);
                            setCopiedId(8888); // custom copy visual flag
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                          title="คัดลอกอีเมล"
                        >
                          {copiedId === 8888 ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <a
                          href={`mailto:${emailAddress}`}
                          className="p-1.5 hover:bg-cyan-50 rounded-md text-cyan-600 transition-colors"
                          title="ส่งอีเมล"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Work Location Row */}
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg mt-0.5">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">สถานที่ปฏิบัติงาน (Office Location)</span>
                        <span className="text-xs font-semibold text-slate-700 leading-relaxed block">{officeLocation}</span>
                      </div>
                    </div>

                    {/* Reporting Manager Row */}
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mt-0.5">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ผู้บังคับบัญชาสายตรง (Reporting Manager)</span>
                        {manager ? (
                          <div 
                            onClick={() => setSelectedContact(manager)}
                            className="group/mgr mt-1 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-100 p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800 block truncate group-hover/mgr:text-indigo-600 transition-colors">{manager.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{manager.position}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover/mgr:text-indigo-600 group-hover/mgr:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic block mt-0.5">
                            ไม่มีข้อมูลหัวหน้าสายงานในแผนกโดยตรง
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="mt-8 pt-5 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={handleCopyFullInfo}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === selectedContact.id ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400 animate-bounce" />
                          <span>คัดลอกข้อมูลพนักงานสำเร็จ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>คัดลอกข้อมูลบุคลากรทั้งหมด</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedContact(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
