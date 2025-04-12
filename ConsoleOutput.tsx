"use client"

interface ConsoleOutputProps {
  logs: string[]
}

export default function ConsoleOutput({ logs }: ConsoleOutputProps) {
  return (
    <div className="bg-black text-white p-4 h-32 overflow-auto font-mono text-sm">
      {logs.length === 0 ? (
        <div className="text-gray-500">No logs to display</div>
      ) : (
        logs.map((log, index) => <div key={index}>{log}</div>)
      )}
    </div>
  )
}
