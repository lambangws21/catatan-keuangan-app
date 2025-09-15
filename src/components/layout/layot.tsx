
import Navbar from "@/components/navbar/navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr] bg-gray-900">
    
      <div className="flex flex-col md:ml-64">
        <Navbar />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
