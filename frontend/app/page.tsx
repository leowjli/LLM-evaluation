"use client"

import { useState, useEffect } from "react";
import axios from "axios";

interface LLMResponse {
  llm: string;
  response: string;
  accuracy: number;
  relevance: number;
  response_time: number;
}

interface Result {
  llm_name: string;
  prompt: string;
  accuracy: number;
  relevance: number;
  response_time: number;
  timestamp: string;
}

export default function Home() {
  const apiUrl = "http://localhost:5000";

  const [prompt, setPrompt] = useState<string>('');
  const [llmResponses, setLlmResponses] = useState<LLMResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchResults = async () => {
      setLoadingResults(true);
      try {
        const res = await axios.get(`${apiUrl}/get_results`);
        setResults(res.data);
      } catch (err) {
        console.log(err);
        setError('Error fetching results.');
      }
      setLoadingResults(false);
    };
    fetchResults();
  }, []);


  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${apiUrl}/evaluate`, { prompt });
      if (res.data && res.data.llm_responses) {
        setLlmResponses(res.data.llm_responses);
      } else {
        setError("No LLM responses found");
      }
    } catch (err) {
      setError('error fetching data from the backend');
      console.log(err);
    }
    setLoading(false);
  }

  return (
    <div className="p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">LLM Evaluation Platform</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="mb-6">
          <label htmlFor="prompt" className="block text-lg font-semibold mb-2">Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={1}
            required
            className="w-full p-4 border border-gray-300 text-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Evaluate
        </button>
      </form>

      {loading && <p className="mt-4 text-center">Loading...</p>}
      {error && <p className="mt-4 text-center text-red-600">{error}</p>}

      {/* Results Display */}
      {llmResponses.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Evaluation Results</h2>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full table-auto border border-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">LLM</th>
                  <th className="px-4 py-2 text-left">Response</th>
                  <th className="px-4 py-2 text-left">Accuracy</th>
                  <th className="px-4 py-2 text-left">Relevance</th>
                  <th className="px-4 py-2 text-left">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {llmResponses.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{result.llm}</td>
                    <td className="px-4 py-2">{result.response}</td>
                    <td className="px-4 py-2">{result.accuracy}</td>
                    <td className="px-4 py-2">{result.relevance}</td>
                    <td className="px-4 py-2">{result.response_time}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Performance Analytics</h2>
        
        {loadingResults ? (
          <p>Loading analytics...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full table-auto border border-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-black">LLM</th>
                  <th className="px-4 py-2 text-left text-black">Prompt</th>
                  <th className="px-4 py-2 text-left text-black">Accuracy</th>
                  <th className="px-4 py-2 text-left text-black">Relevance</th>
                  <th className="px-4 py-2 text-left text-black">Response Time (s)</th>
                  <th className="px-4 py-2 text-left text-black">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{result.llm_name}</td>
                    <td className="px-4 py-2">{result.prompt}</td>
                    <td className="px-4 py-2">{result.accuracy}</td>
                    <td className="px-4 py-2">{result.relevance}</td>
                    <td className="px-4 py-2">{result.response_time}</td>
                    <td className="px-4 py-2">{result.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
