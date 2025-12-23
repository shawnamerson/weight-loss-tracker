import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-white">AI-Powered • Automatic Updates • 100% Personalized</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 leading-tight">
              Transform Your
              <span className="block bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 text-transparent bg-clip-text">
                Body & Life
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Get AI-generated meal plans and workouts that automatically update every 7 days.
              No more guesswork. Just real results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/auth/signup"
                className="group relative bg-gradient-to-r from-primary-500 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                href="/auth/login"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/20 hover:border-white/40 transition-all duration-300"
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-20">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">7-Day</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Meal Plans</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">Auto</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Updates</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">AI</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Powered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-gray-400">
                Powered by advanced AI to help you achieve your goals
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-8 rounded-2xl hover:border-primary-500/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 transition-transform duration-300">
                    🎯
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Personalized Plans</h3>
                  <p className="text-gray-400 leading-relaxed">
                    AI creates custom meal plans and workouts tailored to your goals, dietary preferences, and fitness level.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-8 rounded-2xl hover:border-primary-500/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 transition-transform duration-300">
                    📊
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Smart Tracking</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Track your weight, meals, and workouts effortlessly. Visualize your progress with beautiful, detailed charts.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-8 rounded-2xl hover:border-primary-500/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 transition-transform duration-300">
                    🔄
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Auto-Refresh Plans</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Fresh meal plans automatically generated every 7 days. Stay motivated with variety and never get bored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary-600 to-purple-700 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-primary-100 mb-10">
              Join thousands achieving their fitness goals with AI-powered guidance
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-white text-primary-600 px-12 py-5 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-white/30 transition-all duration-300 transform hover:scale-105"
            >
              Get Started For Free
            </Link>
          </div>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-gray-950 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-6">
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              <strong className="text-yellow-100">Medical Disclaimer:</strong> This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider before starting any diet or exercise program.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
