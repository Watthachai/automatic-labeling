export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-gray-600">กำลังโหลด...</span>
      </div>
    </div>
  );
}