"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayCircle, PauseCircle, Trash2, Download } from "lucide-react"

// URL dasar API dan WebSocket
// Mengambil URL API dan WebSocket dari file .env
 const API_BASE = `http://${window.location.hostname}:8000/api`; 
const WS_URL = `ws://${window.location.hostname}:8000/ws`; 

// Komponen untuk menampilkan statistik server
function ServerStatsWidget() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE}/server-stats`)
        const data = await res.json()
        setStats(data)
      } catch (error) {
        console.error("Error fetching server stats:", error)
      }
    }

    // Ambil data segera saat komponen dimount dan perbarui tiap 5 detik
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return <div>Loading server stats...</div>

  return (
    <div className="border p-4 rounded-md mb-4">
      <h3 className="font-semibold mb-2">Server Stats</h3>
      <div className="text-sm">
        <p><strong>CPU Usage:</strong> {stats.cpu_percent}%</p>
        <p>
          <strong>Memory Usage:</strong> {stats.memory.percent}%{" "}
          (Used: {(stats.memory.used / (1024 * 1024)).toFixed(2)} MB / Total: {(stats.memory.total / (1024 * 1024)).toFixed(2)} MB)
        </p>
        <p>
          <strong>Disk Usage:</strong> {stats.disk.percent}%{" "}
          (Used: {(stats.disk.used / (1024 * 1024 * 1024)).toFixed(2)} GB / Total: {(stats.disk.total / (1024 * 1024 * 1024)).toFixed(2)} GB)
        </p>
        <p><strong>Uptime:</strong> {stats.uptime}</p>
        <p><strong>Active Streams:</strong> {stats.active_streams}</p>
        <p><strong>Scheduled Streams:</strong> {stats.scheduled_streams}</p>
        <p><strong>Downloaded Files:</strong> {stats.downloaded_files}</p>
      </div>
    </div>
  )
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

    // *** State tambahan untuk platform ***
  const [platform, setPlatform] = useState("youtube")
  const [customRtmpUrl, setCustomRtmpUrl] = useState("")

  const [streams, setStreams] = useState([])
  const [scheduledStreams, setScheduledStreams] = useState([])

  // Koneksi WebSocket untuk update realtime
  useEffect(() => {
    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.log("WebSocket connected.")
    }
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)
    // Hanya perbarui files jika ada data dan tidak kosong
    if (data.files && data.files.length > 0) {
      setFiles(data.files)
    }
    setStreams(data.streams || [])
    setScheduledStreams(data.scheduled_streams || [])
  } catch (error) {
    console.error("Error parsing WebSocket message:", error)
  }
}
    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }
    ws.onclose = () => {
      console.log("WebSocket closed.")
    }
    return () => ws.close()
  }, [])

  // Fetch data awal jika perlu
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const filesRes = await fetch(`${API_BASE}/files`)
        const filesData = await filesRes.json()
        setFiles(filesData.files || [])

        const streamsRes = await fetch(`${API_BASE}/streams`)
        const streamsData = await streamsRes.json()
        setStreams(streamsData || [])

        const scheduledRes = await fetch(`${API_BASE}/scheduled`)
        const scheduledData = await scheduledRes.json()
        setScheduledStreams(scheduledData || [])
      } catch (error) {
        console.error("Error fetching initial data:", error)
      }
    }
    fetchInitialData()
  }, [])

  // Fungsi API untuk download, stream, toggle, dan delete
  const handleDownload = async () => {
  if (!driveUrl.trim()) {
    alert("Please enter a Google Drive URL")
    return
  }

  try {
    const response = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drive_url: driveUrl,
        custom_name: customName.trim() || null // Jika kosong, kirim null
      })
    })

    const data = await response.json()
    if (response.ok) {
      alert(`File will be downloaded as: ${data.file_name}`)
    } else {
      alert(`Error: ${data.detail}`)
    }
  } catch (error) {
    console.error("Download failed:", error)
  }
}

// Fungsi hapus file (dari dropdown)
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
        // Perbarui state files (bisa juga bergantung pada update via WebSocket)
        setFiles(files.filter((file) => file !== selectedFile))
        setSelectedFile("")
      } else {
        alert(`Error: ${data.detail}`)
      }
    } catch (error) {
      alert("Error deleting file.")
    }
  }

    // Fungsi untuk memulai stream (langsung atau terjadwal)
  const handleStartStream = async () => {
    if (!selectedFile || !youtubeKey) {
      alert("Please select a file and enter your stream key.")
      return
    }
    // Jika platform "other", pastikan custom RTMP URL diisi
    if (platform === "other" && !customRtmpUrl.trim()) {
      alert("Please enter a custom RTMP URL for 'Other' platform.")
      return
    }

    // Siapkan payload yang mencakup file, stream key, platform, dan (jika ada) custom RTMP URL
    const payload = {
      file: selectedFile,
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
    } catch (error) {
      alert("Error starting stream")
    }
  }

  const handleToggleStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}/toggle`, { method: "PATCH" })
    } catch (error) {
      alert("Error toggling stream")
    }
  }

  const handleDeleteStream = async (id) => {
    try {
      await fetch(`${API_BASE}/streams/${id}`, { method: "DELETE" })
    } catch (error) {
      alert("Error deleting stream")
    }
  }

  const handleDeleteScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}`, { method: "DELETE" })
    } catch (error) {
      alert("Error deleting scheduled stream")
    }
  }

  const handleStartScheduledStream = async (id) => {
    try {
      await fetch(`${API_BASE}/scheduled/${id}/start`, { method: "POST" })
    } catch (error) {
      alert("Error starting scheduled stream")
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Widget Server Stats */}
      <ServerStatsWidget />

      <Card>
        <CardHeader>
          <CardTitle>Livestream Manager (Realtime, Multi-Stream & Scheduler)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
         {/* Input URL Google Drive */}
<div className="flex space-x-2">
  <Input
    placeholder="Enter Google Drive URL"
    value={driveUrl}
    onChange={(e) => setDriveUrl(e.target.value)}
  />
  <Input
    placeholder="Custom File Name (Optional)"
    value={customName}
    onChange={(e) => setCustomName(e.target.value)}
  />
  <Button onClick={handleDownload} disabled={!driveUrl}>
    <Download className="mr-2 h-4 w-4" /> Download
  </Button>
</div>


          {/* Pilih File dan tombol Delete */}
          <div className="flex space-x-2 items-center">
            <Select value={selectedFile} onValueChange={(value) => setSelectedFile(value)}>
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
            <Button onClick={handleDeleteFile} disabled={!selectedFile}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete File
            </Button>
          </div>

          {/* Input Stream Key (bisa untuk YouTube, Facebook, dll.) */}
          <Input
            placeholder="Enter Stream Key"
            value={youtubeKey}
            onChange={(e) => setYoutubeKey(e.target.value)}
          />

          {/* Pilih Platform */}
          <Select value={platform} onValueChange={(value) => setPlatform(value)}>
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
            />
          )}

          {/* Pilih Jadwal */}
          <Select value={scheduleType} onValueChange={setScheduleType}>
            <SelectTrigger>
              <SelectValue placeholder="Select Schedule Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Now</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
            </SelectContent>
          </Select>

          {scheduleType === "schedule" && (
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          )}

          <Button onClick={handleStartStream} disabled={!selectedFile || !youtubeKey}>
            <PlayCircle className="mr-2 h-4 w-4" /> {scheduleType === "schedule" ? "Schedule Stream" : "Start Now"}
          </Button>

          {/* Daftar Streaming Aktif */}
          <h3 className="font-semibold mt-4">Active Streams</h3>
          {streams.map((stream) => (
            <div key={stream.id} className="p-4 bg-gray-100 rounded-md flex justify-between items-center">
              <p>
                {stream.file} ({stream.youtube_key})
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => handleToggleStream(stream.id)}>
                  {stream.active ? (
                    <>
                      <PauseCircle className="mr-2 h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" /> Play
                    </>
                  )}
                </Button>
                <Button onClick={() => handleDeleteStream(stream.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}

          {/* Daftar Streaming yang Dijadwalkan */}
          <h3 className="font-semibold mt-4">Scheduled Streams</h3>
          {scheduledStreams.map((stream) => (
            <div key={stream.id} className="p-4 bg-yellow-100 rounded-md flex justify-between items-center">
              <p>
                {stream.file} -{" "}
                {new Date(stream.schedule_time).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta"
                })}
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => handleStartScheduledStream(stream.id)}>
                  <PlayCircle className="mr-2 h-4 w-4" /> Start Now
                </Button>
                <Button onClick={() => handleDeleteScheduledStream(stream.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

