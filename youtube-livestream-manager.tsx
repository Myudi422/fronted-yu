"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PlayCircle,
  PauseCircle,
  Trash2,
  Download,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  Play,
  Calendar,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// URL dasar API dan WebSocket
const PROTOCOL = window.location.protocol === "https:" ? "https" : "http";
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
const USE_PORT = !window.location.hostname.includes("app.github.dev");
const PORT = USE_PORT ? ":8000" : "";
const API_BASE = `${PROTOCOL}://${window.location.hostname.replace("3000", "8000")}${PORT}/api`;
const WS_URL = `${WS_PROTOCOL}://${window.location.hostname.replace("3000", "8000")}${PORT}/ws`;

// =========================================
// Komponen ServerStatsWidget (tetap sama)
// =========================================
function ServerStatsWidget() {
  const [stats, setStats] = useState({
    cpu_percent: 0,
    memory: { percent: 0, used: 0, total: 1 },
    disk: { percent: 0, used: 0, total: 1 },
    uptime: "N/A",
    active_streams: 0,
    scheduled_streams: 0,
    downloaded_files: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE}/server-stats`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching server stats:", error);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const statsData = [
    {
      icon: <Cpu className="w-6 h-6 text-blue-500" />,
      label: "CPU Usage",
      value: `${stats.cpu_percent}%`,
      progress: stats.cpu_percent,
    },
    {
      icon: <MemoryStick className="w-6 h-6 text-green-500" />,
      label: "Memory Usage",
      value: `${stats.memory.percent}% (${(stats.memory.used / (1024 * 1024)).toFixed(
        2
      )} MB / ${(stats.memory.total / (1024 * 1024)).toFixed(2)} MB)`,
      progress: stats.memory.percent,
    },
    {
      icon: <HardDrive className="w-6 h-6 text-red-500" />,
      label: "Disk Usage",
      value: `${stats.disk.percent}% (${(stats.disk.used / (1024 * 1024 * 1024)).toFixed(
        2
      )} GB / ${(stats.disk.total / (1024 * 1024 * 1024)).toFixed(2)} GB)`,
      progress: stats.disk.percent,
    },
    {
      icon: <Clock className="w-6 h-6 text-yellow-500" />,
      label: "Uptime",
      value: stats.uptime,
    },
    {
      icon: <Play className="w-6 h-6 text-purple-500" />,
      label: "Active Streams",
      value: stats.active_streams,
    },
    {
      icon: <Calendar className="w-6 h-6 text-orange-500" />,
      label: "Scheduled Streams",
      value: stats.scheduled_streams,
    },
    {
      icon: <Download className="w-6 h-6 text-teal-500" />,
      label: "Downloaded Files",
      value: stats.downloaded_files,
    },
  ];

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Server Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {statsData.slice(0, 3).map((stat, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
              {stat.icon}
              <div className="w-full">
                <p className="text-sm font-medium">
                  {stat.label}: {stat.value}
                </p>
                {stat.progress !== undefined && <Progress value={stat.progress} />}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 mt-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {statsData.slice(3).map((stat, index) => (
            <div key={index + 3} className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
              {stat.icon}
              <div className="w-full">
                <p className="text-sm font-medium">
                  {stat.label}: {stat.value}
                </p>
                {stat.progress !== undefined && <Progress value={stat.progress} />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================
// Komponen Login (dipisahkan)
// =========================================
function Login({ onLoginSuccess }) {
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = () => {
    if (loginPassword === "trial-yukstream") {
      onLoginSuccess();
    } else {
      setLoginError("Password salah. Coba lagi.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        <Input
          type="password"
          placeholder="Enter password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        {loginError && <p className="text-red-500 mt-2 text-center">{loginError}</p>}
        <Button onClick={handleLogin} className="mt-4 w-full">
          Login
        </Button>
      </div>
    </div>
  );
}

// =========================================
// Komponen Utama Livestream Manager
// (Semua hooks dan logika halaman utama ditempatkan di sini)
// =========================================
function YoutubeLivestreamManagerMain() {
  // State untuk livestream manager
  const [driveUrl, setDriveUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [scheduleType, setScheduleType] = useState("now"); // "now" atau "schedule"
  const [scheduleDate, setScheduleDate] = useState(""); // waktu mulai
  const [scheduleEndDate, setScheduleEndDate] = useState(""); // waktu berakhir
  const [inputSource, setInputSource] = useState("file");
  const [platform, setPlatform] = useState("youtube");
  const [customRtmpUrl, setCustomRtmpUrl] = useState("");
  const [streams, setStreams] = useState([]);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fungsi pembantu dan useEffect untuk localStorage, WebSocket, dan pengambilan data
  useEffect(() => {
    const storedDriveUrl = localStorage.getItem("driveUrl");
    if (storedDriveUrl) setDriveUrl(storedDriveUrl);
    const storedCustomName = localStorage.getItem("customName");
    if (storedCustomName) setCustomName(storedCustomName);
    const storedYoutubeKey = localStorage.getItem("youtubeKey");
    if (storedYoutubeKey) setYoutubeKey(storedYoutubeKey);
    const storedCustomRtmpUrl = localStorage.getItem("customRtmpUrl");
    if (storedCustomRtmpUrl) setCustomRtmpUrl(storedCustomRtmpUrl);
  }, []);

  useEffect(() => {
    localStorage.setItem("youtubeKey", youtubeKey);
  }, [youtubeKey]);

  useEffect(() => {
    localStorage.setItem("customRtmpUrl", customRtmpUrl);
  }, [customRtmpUrl]);

  // WebSocket untuk update realtime
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("WebSocket connected.");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.files) setFiles(data.files);
        if (data.streams) setStreams(data.streams);
        if (data.scheduled_streams) setScheduledStreams(data.scheduled_streams);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket closed.");
    return () => ws.close();
  }, []);

  // Fetch data awal
  useEffect(() => {
    fetchFiles();
    fetchStreams();
    fetchScheduledStreams();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStreams();
      fetchScheduledStreams();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const fetchStreams = async () => {
    try {
      const res = await fetch(`${API_BASE}/streams`);
      const data = await res.json();
      setStreams(data || []);
    } catch (error) {
      console.error("Error fetching streams:", error);
    }
  };

  const fetchScheduledStreams = async () => {
    try {
      const res = await fetch(`${API_BASE}/scheduled`);
      const data = await res.json();
      setScheduledStreams(data || []);
    } catch (error) {
      console.error("Error fetching scheduled streams:", error);
    }
  };

  // Helper untuk mengekstrak file ID dari URL Google Drive
  function extractFileId(url) {
    let match = url.match(/\/open\?id=([^&]+)/);
    if (match && match[1]) return match[1];
    match = url.match(/\/file\/d\/([^/]+)/);
    if (match && match[1]) return match[1];
    match = url.match(/\/uc\?id=([^&]+)/);
    if (match && match[1]) return match[1];
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("id");
    } catch (error) {
      return null;
    }
  }

  const handleDownload = async () => {
    if (!driveUrl.trim()) {
      alert("Please enter a Google Drive URL");
      return;
    }
    const fileId = extractFileId(driveUrl.trim());
    if (!fileId) {
      alert("Format URL Google Drive tidak valid.");
      return;
    }
    const normalizedDriveUrl = `https://drive.google.com/uc?id=${fileId}`;
    const validUrlPattern = /^https:\/\/drive\.google\.com\/uc\?id=[\w-]+$/;
    if (!validUrlPattern.test(normalizedDriveUrl)) {
      alert("Google Drive URL harus berformat:\nhttps://drive.google.com/uc?id=YOUR_FILE_ID");
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drive_url: normalizedDriveUrl,
          custom_name: customName.trim() || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(`File will be downloaded as: ${data.file_name}`);
        await fetchFiles();
      } else {
        alert(`Error: ${data.detail}`);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) {
      alert("Please select a file to delete.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedFile}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/files/${selectedFile}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok) {
        alert("File deleted successfully.");
        await fetchFiles();
        setSelectedFile("");
      } else {
        alert(`Error: ${data.detail}`);
      }
    } catch (error) {
      alert("Error deleting file.");
    }
  };

  const maskStreamKey = (key) => {
    if (!key) return "";
    const visibleChars = 4;
    const maskedPart = "*".repeat(key.length - visibleChars);
    return key.slice(0, visibleChars) + maskedPart;
  };

  const handleStartStream = async () => {
    if (inputSource === "file" && (!selectedFile || !youtubeKey)) {
      alert("Please select a file and enter your stream key.");
      return;
    }
    if (inputSource === "obs" && !youtubeKey) {
      alert("Please enter your stream key.");
      return;
    }
    if (scheduleType === "schedule") {
      if (!scheduleDate || !scheduleEndDate) {
        alert("Please select both start and end date and time for scheduling.");
        return;
      }
      const startTime = new Date(scheduleDate);
      const endTime = new Date(scheduleEndDate);
      const now = new Date();
      if (startTime < now) {
        alert("Start time must be in the future.");
        return;
      }
      if (endTime <= startTime) {
        alert("End time must be after start time.");
        return;
      }
    }
    const payload = {
      source: inputSource,
      file: inputSource === "file" ? selectedFile : "",
      youtube_key: youtubeKey,
      platform,
      custom_rtmp_url: platform === "other" ? customRtmpUrl : null,
    };
    if (scheduleType === "schedule") {
      payload.schedule_time = scheduleDate;
      payload.schedule_end_time = scheduleEndDate;
      try {
        await fetch(`${API_BASE}/scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        alert(`Stream scheduled from:\n${scheduleDate} until ${scheduleEndDate}`);
        setSelectedFile("");
        setYoutubeKey("");
        setScheduleDate("");
        setScheduleEndDate("");
        await fetchScheduledStreams();
      } catch (error) {
        alert("Error scheduling stream");
      }
      return;
    }
    try {
      await fetch(`${API_BASE}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSelectedFile("");
      setYoutubeKey("");
      await fetchStreams();
    } catch (error) {
      alert("Error starting stream");
    }
  };

  const handleToggleStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}/toggle`, { method: "PATCH" });
      await fetchStreams();
    } catch (error) {
      alert("Error toggling stream");
    }
  };

  const handleDeleteStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}`, { method: "DELETE" });
      await fetchStreams();
    } catch (error) {
      alert("Error deleting stream");
    }
  };

  const handleDeleteScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}`, { method: "DELETE" });
      await fetchScheduledStreams();
    } catch (error) {
      alert("Error deleting scheduled stream");
    }
  };

  const handleStartScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}/start`, { method: "POST" });
      await fetchScheduledStreams();
      await fetchStreams();
    } catch (error) {
      alert("Error starting scheduled stream");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {isDownloading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md shadow-md">
            <p className="text-lg font-semibold">Downloading... Please wait</p>
          </div>
        </div>
      )}

      <ServerStatsWidget />

      <Card>
        <CardHeader>
          <CardTitle>Livestream Manager - YukStream 💕</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Select value={inputSource} onValueChange={setInputSource} className="w-full">
              <SelectTrigger>
                <SelectValue placeholder="Select Input Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="obs">OBS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inputSource === "file" && (
            <>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Enter Google Drive URL"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full"
                />
                <Input
                  placeholder="Custom File Name (Optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full"
                />
                <Button onClick={handleDownload} disabled={!driveUrl} className="flex-none">
                  <Download className="h-4 w-4" />
                  <span className="ml-2">Download</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedFile}
                  onValueChange={setSelectedFile}
                  className="flex-1"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a file" />
                  </SelectTrigger>
                  <SelectContent>
                    {files.map((file) => (
                      <SelectItem key={file} value={file}>
                        {file}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleDeleteFile} disabled={!selectedFile} className="flex-none">
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Delete</span>
                </Button>
              </div>
            </>
          )}

          {inputSource === "obs" && (
            <div className="p-2 bg-blue-100 rounded-md">
              <p className="text-sm">
                Configure OBS to stream to: <code>rtmp://{window.location.hostname}/live/</code>.
              </p>
            </div>
          )}

          <Input
            placeholder="Enter Stream Key"
            value={youtubeKey}
            onChange={(e) => setYoutubeKey(e.target.value)}
            className="w-full"
          />

          <Select value={platform} onValueChange={setPlatform} className="w-full">
            <SelectTrigger>
              <SelectValue placeholder="Select Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {platform === "other" && (
            <Input
              placeholder="Enter Custom RTMP URL"
              value={customRtmpUrl}
              onChange={(e) => setCustomRtmpUrl(e.target.value)}
              className="w-full"
            />
          )}

          <Select value={scheduleType} onValueChange={setScheduleType} className="w-full">
            <SelectTrigger>
              <SelectValue placeholder="Select Schedule Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Now</SelectItem>
              <SelectItem value="schedule">Schedule - Local Time</SelectItem>
            </SelectContent>
          </Select>

          {scheduleType === "schedule" && (
            <>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full"
                placeholder="Start Date and Time"
              />
              <Input
                type="datetime-local"
                value={scheduleEndDate}
                onChange={(e) => setScheduleEndDate(e.target.value)}
                className="w-full"
                placeholder="End Date and Time"
              />
            </>
          )}

          <Button
            onClick={handleStartStream}
            disabled={inputSource === "file" ? (!selectedFile || !youtubeKey) : !youtubeKey}
          >
            <PlayCircle className="h-4 w-4" />
            <span className="ml-2">
              {scheduleType === "schedule" ? "Schedule Stream" : "Start Now"}
            </span>
          </Button>

          <h3 className="font-semibold">Active Streams</h3>
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="p-4 bg-gray-100 rounded-md flex items-center justify-between"
            >
              <div className="flex flex-col">
                <p className="truncate">
                  {stream.file} (<span>{maskStreamKey(stream.youtube_key)}</span>)
                </p>
                {stream.schedule_end_time && (
                  <p className="text-xs text-gray-500">
                    Ends at:{" "}
                    {new Date(stream.schedule_end_time).toLocaleString(navigator.language, {
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleToggleStream(stream.id)}>
                  {stream.active ? (
                    <>
                      <PauseCircle className="h-4 w-4" />
                      <span className="ml-2">Pause</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      <span className="ml-2">Play</span>
                    </>
                  )}
                </Button>
                <Button onClick={() => handleDeleteStream(stream.id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Delete</span>
                </Button>
              </div>
            </div>
          ))}

          <h3 className="font-semibold">Scheduled Streams</h3>
          {scheduledStreams.map((stream) => (
            <div
              key={stream.id}
              className="p-4 bg-yellow-100 rounded-md flex items-center justify-between"
            >
              <p className="truncate flex-1">
                {stream.file} -{" "}
                {new Date(stream.schedule_time).toLocaleString(navigator.language, {
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
                {" "} to {" "}
                {new Date(stream.schedule_end_time).toLocaleString(navigator.language, {
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => handleStartScheduledStream(stream.id)}>
                  <PlayCircle className="h-4 w-4" />
                  <span className="ml-2">Start Now</span>
                </Button>
                <Button onClick={() => handleDeleteScheduledStream(stream.id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <footer className="w-full py-4 bg-gray-900 text-white text-center text-sm mt-8">
        <p>
          Made with ❤️ by <span className="font-semibold">YukStream</span> &copy; 2025
        </p>
      </footer>
    </div>
  );
}

// =========================================
// Komponen Wrapper: Menggabungkan Login dan Halaman Utama
// =========================================
export default function YoutubeLivestreamManagerWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      {!isAuthenticated && <Login onLoginSuccess={() => setIsAuthenticated(true)} />}
      {isAuthenticated && <YoutubeLivestreamManagerMain />}
    </>
  );
}
