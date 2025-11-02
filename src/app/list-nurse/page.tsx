import NurseLister from "@/components/nurse-list/nurse-lister";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <NurseLister />
    </main>
  );
}