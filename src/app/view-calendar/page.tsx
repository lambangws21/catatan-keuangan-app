"use client";

import { useState, useEffect } from "react";

type Booking = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  start: { seconds: number };
};

export default function Home() {
  const [form, setForm] = useState({
    inviteeName: "",
    inviteeEmail: "",
    eventTitle: "",
    start: "",
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("");

  async function fetchBookings() {
    const res = await fetch("/api/visitDokter");
    const data = await res.json();
    setBookings(data);
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const method = editingId ? "PUT" : "POST";
    const body = editingId ? { id: editingId, ...form } : form;

    await fetch("/api/visitDokter", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    setForm({ inviteeName: "", inviteeEmail: "", eventTitle: "", start: "" });
    setEditingId(null);
    fetchBookings();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus booking ini?")) return;
    await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchBookings();
  }

  function handleEdit(booking: Booking) {
    setForm({
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      eventTitle: booking.eventTitle,
      start: new Date(booking.start.seconds * 1000).toISOString().slice(0, 16),
    });
    setEditingId(booking.id);
  }

  const filtered = filterDate
    ? bookings.filter(
        (b) =>
          new Date(b.start.seconds * 1000).toISOString().slice(0, 10) === filterDate
      )
    : bookings;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 bg-gray-50">
      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          🗓️ {editingId ? "Edit Booking" : "Buat Booking"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            placeholder="Nama"
            className="border p-2 rounded"
            value={form.inviteeName}
            onChange={(e) => setForm({ ...form, inviteeName: e.target.value })}
            required
          />
          <input
            placeholder="Email"
            type="email"
            className="border p-2 rounded"
            value={form.inviteeEmail}
            onChange={(e) => setForm({ ...form, inviteeEmail: e.target.value })}
            required
          />
          <input
            placeholder="Judul Event"
            className="border p-2 rounded"
            value={form.eventTitle}
            onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            className="border p-2 rounded"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            required
          />
          <button
            disabled={loading}
            className={`${
              editingId ? "bg-green-600" : "bg-blue-600"
            } text-white py-2 rounded hover:opacity-90 transition`}
          >
            {loading
              ? "Menyimpan..."
              : editingId
              ? "Simpan Perubahan"
              : "Simpan Booking"}
          </button>
        </form>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow-md w-full max-w-2xl">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">📅 Daftar Booking</h2>
          <input
            type="date"
            className="border p-2 rounded"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <table className="w-full border-collapse border text-sm">
          <thead className="bg-blue-50">
            <tr>
              <th className="border p-2">Nama</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Event</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-3 text-gray-500">
                  Tidak ada booking ditemukan
                </td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-gray-100">
                <td className="border p-2">{b.inviteeName}</td>
                <td className="border p-2">{b.inviteeEmail}</td>
                <td className="border p-2">{b.eventTitle}</td>
                <td className="border p-2">
                  {new Date(b.start.seconds * 1000).toLocaleString()}
                </td>
                <td className="border p-2 flex gap-2 justify-center">
                  <button
                    onClick={() => handleEdit(b)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
