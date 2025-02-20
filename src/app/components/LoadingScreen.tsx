export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 rounded-full border-4 border-blue-100"></div>
          {/* Inner spinning ring */}
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <div className="mt-4 text-gray-600 font-medium text-sm">กำลังโหลด...</div>
      </div>
    </div>
  );
}