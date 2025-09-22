export default function GuestPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-green-500 rounded-3xl p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">g</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-4">Welcome, Guest!</h1>
          <p className="text-gray-400">You're browsing as a guest. Some features may be limited.</p>
        </div>

        <div className="space-y-4">
          <a
            href="/auth/signup"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl text-center block transition-colors"
          >
            Create Account
          </a>

          <a
            href="/auth/login"
            className="w-full text-green-400 hover:text-green-300 font-medium py-3 text-center block transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
