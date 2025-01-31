// app/page.jsx
"use client"
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <header className="w-full bg-blue-600 py-4 text-white text-center shadow-lg">
        <h1 className="text-3xl font-bold">Welcome to Video Connect</h1>
        <p className="text-sm mt-1">Join or create a video call room seamlessly</p>
      </header>

      <main className="flex flex-col items-center gap-6 mt-10">
        <button
          className="px-6 py-3 bg-green-500 text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-green-600 transition-all"
          onClick={() => (window.location.href = '/room/create')}
        >
          Create a Room
        </button>
        <button
          className="px-6 py-3 bg-blue-500 text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-blue-600 transition-all"
          onClick={() => (window.location.href = '/room/join')}
        >
          Join a Room
        </button>
      </main>

      <footer className="w-full text-center text-sm text-gray-500 mt-10">
        © 2025 Video Connect. All rights reserved.
      </footer>
    </div>
  );
}
