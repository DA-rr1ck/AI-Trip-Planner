import { Sparkles, Database } from 'lucide-react' 

function GenerationMethodSelector({ value, onChange }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">Choose Generation Method</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
       
        <button
          type="button"
          onClick={() => onChange('ai')}
          className={`p-5 border-2 rounded-xl text-left transition-all ${
            value === 'ai'
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              value === 'ai' ? 'bg-blue-500' : 'bg-gray-200'
            }`}>
              <Sparkles className={`h-5 w-5 ${
                value === 'ai' ? 'text-white' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">AI-Generated Trip</h4>
              <p className="text-sm text-gray-600 mb-2">
                Gemini AI creates a complete itinerary with wider variety
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✨ More diverse attractions and activities</li>
                <li>🌍 Includes hidden gems and local spots</li>
                <li>🤖 Fully AI-generated recommendations</li>
                <li>⚡ Faster generation (~10-20 seconds)</li>
              </ul>
            </div>
            
            {value === 'ai' && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">
                ✓
              </div>
            )}
          </div>
        </button>
        
      
        <button
          type="button"
          onClick={() => onChange('smart')}
          className={`p-5 border-2 rounded-xl text-left transition-all ${
            value === 'smart'
              ? 'border-purple-500 bg-purple-50 shadow-md'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              value === 'smart' ? 'bg-purple-500' : 'bg-gray-200'
            }`}>
              <Database className={`h-5 w-5 ${
                value === 'smart' ? 'text-white' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">Smart Database Trip</h4>
              <p className="text-sm text-gray-600 mb-2">
                Verified locations from our curated database
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✅ Pre-verified attractions and restaurants</li>
                <li>📍 Accurate coordinates and details</li>
                <li>⭐ Real ratings and operating hours</li>
                <li>🎯 More reliable information</li>
              </ul>
            </div>
            
            {value === 'smart' && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm">
                ✓
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
export default GenerationMethodSelector