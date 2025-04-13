"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaSpinner, FaMagic } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';


function Page() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState('url');
  const [selectedLLMs, setSelectedLLMs] = useState(['chatgpt-4o', 'gemini-2.5']);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState(0);

  const progressRef = useRef(0); // ✅ must be outside useEffect

  useEffect(() => {
    if (!jobId) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-status/${jobId}`);
        const data = await res.json();

        if (data.status === 'completed' && data.result) {
          progressRef.current = 100;
          setProgress(100);
          router.push(`/dashboard/${jobId}`);
          clearInterval(poll);
          clearInterval(tick);
        } else if (data.status === 'failed') {
          console.error('Job failed:', data);
          setLoading(false);
          clearInterval(poll);
          clearInterval(tick);
        } else if (typeof data.progress === 'number') {
          if (data.progress > progressRef.current) {
            progressRef.current = data.progress;
            setProgress(data.progress);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);

    const tick = setInterval(() => {
      if (progressRef.current < 95) {
        progressRef.current += 1;
        setProgress(progressRef.current);
      }
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [jobId, router]);

  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setJobId('');
    setProgress(0);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, inputType, selectedLLMs }),
      });
      const data = await response.json();
      if (data.success && data.jobId) {
        setJobId(data.jobId);
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const models = [
    { id: 'chatgpt-4o', name: 'ChatGPT 4o', color: 'bg-purple-500' },
    { id: 'gemini-2.5', name: 'Gemini', color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
            AI SEO Rank Tracker
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Monitor how your brand performs across major AI platforms like Llama, Gemini, and more.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaMagic className="mr-2 text-indigo-500" />
                Track Your Performance
              </h2>
              <div className="flex mb-5">
                <button
                  type="button"
                  onClick={() => setInputType('url')}
                  className={`px-5 py-3 text-sm font-medium rounded-lg transition-all ${
                    inputType === 'url'
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Website URL
                </button>
                {/* <button
                  type="button"
                  onClick={() => setInputType('brand')}
                  className={`px-5 py-3 text-sm font-medium rounded-r-lg transition-all ${
                    inputType === 'brand'
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Brand Name
                </button> */}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    inputType === 'url'
                      ? 'Enter website URL...'
                      : 'Enter brand name...'
                  }
                  className="w-full px-5 py-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 text-lg shadow-sm"
                  required
                />
                <div className="absolute right-4 top-4 text-gray-400">
                  <FaSearch size={16} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-md font-semibold mb-4 text-gray-700">
                Choose AI Models to Analyze:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      if (selectedLLMs.includes(model.id)) {
                        setSelectedLLMs(selectedLLMs.filter((l) => l !== model.id));
                      } else {
                        setSelectedLLMs([...selectedLLMs, model.id]);
                      }
                    }}
                    className={`
                      cursor-pointer rounded-lg p-4 transition-all hover:shadow-md
                      ${
                        selectedLLMs.includes(model.id)
                          ? 'bg-white border-2 border-indigo-300 shadow-md'
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${model.color} text-white`}>
                        {model.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{model.name}</div>
                        <div className={`text-xs ${selectedLLMs.includes(model.id) ? 'text-indigo-500' : 'text-gray-400'}`}>
                          {selectedLLMs.includes(model.id) ? 'Selected' : 'Not selected'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:from-indigo-700 hover:to-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-all disabled:opacity-70 flex items-center justify-center shadow-lg text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" size={16} />
                  Analyzing... {progress}%
                </>
              ) : (
                'Generate AI SEO Insights'
              )}
            </motion.button>
          </form>
        </motion.div>

       
      </div>
    </div>
  );
}

export default Page;
