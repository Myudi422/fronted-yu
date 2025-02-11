"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayCircle, PauseCircle, Trash2, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress";
import { Cpu, HardDrive, MemoryStick, Clock, Play, Calendar } from "lucide-react";

// URL dasar API dan WebSocket
const PROTOCOL = window.location.protocol === "https:" ? "https" : "http";
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
const USE_PORT = !window.location.hostname.includes("app.github.dev");
const PORT = USE_PORT ? ":8000" : ""; 
const API_BASE = `${PROTOCOL}://${window.location.hostname.replace("3000", "8000")}${PORT}/api`;
const WS_URL = `${WS_PROTOCOL}://${window.location.hostname.replace("3000", "8000")}${PORT}/ws`;

function ServerStatsWidget() {
  // ... (kode widget server stats tidak berubah)
}

export default function YoutubeLivestreamManager() {
  // State untuk livestream manager
  const [driveUrl, setDriveUrl] = useState("")
  const [customName, setCustomName] = useState("")
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState("")
  const [youtubeKey, setYoutubeKey] = useState("")
  const [scheduleType, setScheduleType] = useState("now") // "now" atau "schedule"
  const [scheduleDate, setScheduleDate] = useState("")
  
  // State untuk platform
  const [platform, setPlatform] = useState("youtube")
  const [customRtmpUrl, setCustomRtmpUrl] = useState("")

  // Tambahkan state untuk memilih sumber input: "file" atau "obs"
  const [inputSource, setInputSource] = useState("file")

  const [streams, setStreams] = useState([])
  const [scheduledStreams, setScheduledStreams] = useState([])
  const [isDownloading, setIsDownloading] = useState(false)

  // Fungsi pembantu untuk re-fetch data
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/files`)
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching files:", error)
    }
  }

  const fetchStreams = async () => {
    try {
      const res = await fetch(`${API_BASE}/streams`)
      const data = await res.json()
      setStreams(data || [])
    } catch (error) {
      console.error("Error fetching streams:", error)
    }
  }

  const fetchScheduledStreams = async () => {
    try {
      const res = await fetch(`${API_BASE}/scheduled`)
      const data = await res.json()
      setScheduledStreams(data || [])
    } catch (error) {
      console.error("Error fetching scheduled streams:", error)
    }
  }

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

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => console.log("WebSocket connected.")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.files) {
          setFiles(data.files)
        }
        if (data.streams) {
          setStreams(data.streams)
        }
        if (data.scheduled_streams) {
          setScheduledStreams(data.scheduled_streams)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }
    ws.onerror = (error) => console.error("WebSocket error:", error)
    ws.onclose = () => console.log("WebSocket closed.")
    return () => ws.close()
  }, [])
  
  useEffect(() => {
    fetchFiles()
    fetchStreams()
    fetchScheduledStreams()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStreams();
      fetchScheduledStreams();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
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
          custom_name: customName.trim() || null
        })
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
      alert("Please select a file to delete.")
      return
    }
    if (!confirm(`Are you sure you want to delete ${selectedFile}?`)) {
      return
    }
    try {
      const response = await fetch(`${API_BASE}/files/${selectedFile}`, { method: "DELETE" })
      const data = await response.json()
      if (response.ok) {
        alert("File deleted successfully.")
        await fetchFiles()
        setSelectedFile("")
      } else {
        alert(`Error: ${data.detail}`)
      }
    } catch (error) {
      alert("Error deleting file.")
    }
  }

  const handleStartStream = async () => {
    if (inputSource === "file" && (!selectedFile || !youtubeKey)) {
      alert("Please select a file and enter your stream key.")
      return
    }
    if (inputSource === "obs" && !youtubeKey) {
      alert("Please enter your stream key.")
      return
    }

    const payload = {
      source: inputSource,
      file: inputSource === "file" ? selectedFile : "", // tidak diperlukan untuk OBS
      youtube_key: youtubeKey,
      platform,
      custom_rtmp_url: platform === "other" ? customRtmpUrl : null
    }

    if (scheduleType === "schedule") {
      if (!scheduleDate) {
        alert("Please select a date and time for scheduling.")
        return
      }
      payload.schedule_time = scheduleDate
      try {
        await fetch(`${API_BASE}/scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        alert(`Stream scheduled for: ${scheduleDate}`)
        setSelectedFile("")
        setYoutubeKey("")
        setScheduleDate("")
        await fetchScheduledStreams()
      } catch (error) {
        alert("Error scheduling stream")
      }
      return
    }

    try {
      await fetch(`${API_BASE}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      setSelectedFile("")
      setYoutubeKey("")
      await fetchStreams()
    } catch (error) {
      alert("Error starting stream")
    }
  }

  const handleToggleStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}/toggle`, { method: "PATCH" })
      await fetchStreams()
    } catch (error) {
      alert("Error toggling stream")
    }
  }

  const handleDeleteStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}`, { method: "DELETE" })
      await fetchStreams()
    } catch (error) {
      alert("Error deleting stream")
    }
  }

  const handleDeleteScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}`, { method: "DELETE" })
      await fetchScheduledStreams()
    } catch (error) {
      alert("Error deleting scheduled stream")
    }
  }

  const handleStartScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}/start`, { method: "POST" })
      await fetchScheduledStreams()
      await fetchStreams()
    } catch (error) {
      alert("Error starting scheduled stream")
    }
  }

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
          {/* Pilih Sumber Input: File atau OBS */}
          <div className="flex flex-col gap-2">
            <Select value={inputSource} onValueChange={(value) => setInputSource(value)} className="w-full">
              <SelectTrigger>
                <SelectValue placeholder="Select Input Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="obs">OBS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jika sumber input adalah file, tampilkan area download & file selection */}
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
                  onValueChange={(value) => setSelectedFile(value)}
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

          {/* Jika sumber input adalah OBS, tampilkan pesan instruksi */}
          {inputSource === "obs" && (
            <div className="p-2 bg-blue-100 rounded-md">
              <p className="text-sm">
                Configure OBS untuk streaming ke: <strong>{`${PROTOCOL}://${window.location.hostname.replace("3000", "8000")}`}</strong> (biasanya <code>rtmp://{window.location.hostname}:1935/live/obs</code>).
              </p>
            </div>
          )}

          {/* Input Stream Key */}
          <Input
            placeholder="Enter Stream Key"
            value={youtubeKey}
            onChange={(e) => setYoutubeKey(e.target.value)}
            className="w-full"
          />

          {/* Pilih Platform */}
          <Select value={platform} onValueChange={(value) => setPlatform(value)} className="w-full">
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

          {/* Pilih Jadwal */}
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
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full"
            />
          )}

          {/* Tombol Start Stream */}
          <Button onClick={handleStartStream} disabled={(inputSource === "file" && !selectedFile) || !youtubeKey}>
            <PlayCircle className="h-4 w-4" />
            <span className="ml-2">
              {scheduleType === "schedule" ? "Schedule Stream" : "Start Now"}
            </span>
          </Button>

          {/* Daftar Streaming Aktif */}
          <h3 className="font-semibold">Active Streams</h3>
          {streams.map((stream) => (
            <div key={stream.id} className="p-4 bg-gray-100 rounded-md flex items-center justify-between">
              <p className="truncate flex-1">
                {stream.file} ({stream.youtube_key})
              </p>
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

          {/* Daftar Streaming yang Dijadwalkan */}
          <h3 className="font-semibold">Scheduled Streams</h3>
          {scheduledStreams.map((stream) => (
            <div key={stream.id} className="p-4 bg-yellow-100 rounded-md flex items-center justify-between">
              <p className="truncate flex-1">
                {stream.file} -{" "}
                {new Date(stream.schedule_time).toLocaleString(navigator.language, {
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
  )
}
