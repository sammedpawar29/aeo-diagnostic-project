'use client'
import { useState } from 'react'

interface EngineResult {
  response: string
  analysis: {
    mentioned: boolean | null
    rank: number | null
    snippet: string | null
    error: boolean
    no_brand: boolean
  }
  top_brands: string[]
  logo: string
  status: string
}

interface Results {
  query: string
  your_brand: string | null
  fixed_query: string
  fixed_brand: string | null
  category: string
  search_intent: string
  no_brand: boolean
  overall: {
    score: number
    mentions: string
    grade: string
    color: string
    message: string
    tip: string
  }
  engines: {
    [key: string]: EngineResult
  }
}

const examples = [
  { query: "best magnesium supplement for seniors", brand: "Nature Made" },
  { query: "best protein powder for weight loss", brand: "Optimum Nutrition" },
  { query: "best collagen powder for skin", brand: "" },
  { query: "best vitamin D supplement", brand: "Thorne" },
]

const tips = [
  {
    icon: '📝',
    title: 'Optimize Listings',
    desc: 'Use benefit-focused language in your descriptions.',
    color: 'from-blue-500/10 to-transparent border-blue-500/20',
    details: [
      '✅ Use keywords shoppers actually search for',
      '✅ Add clear benefit statements in title',
      '✅ Include use cases in bullet points',
      '✅ Mention key ingredients prominently',
      '✅ Add comparison language vs competitors',
    ]
  },
  {
    icon: '⭐',
    title: 'Get More Reviews',
    desc: 'AI engines favor brands with high review counts.',
    color: 'from-yellow-500/10 to-transparent border-yellow-500/20',
    details: [
      '✅ Send follow-up emails after purchase',
      '✅ Use Amazon Vine program',
      '✅ Respond to all negative reviews',
      '✅ Fix issues customers mention',
      '✅ Aim for 4.5+ star rating',
    ]
  },
  {
    icon: '🔄',
    title: 'Track Weekly',
    desc: 'Run this diagnostic weekly to measure improvement.',
    color: 'from-purple-500/10 to-transparent border-purple-500/20',
    details: [
      '✅ Run diagnostic every Monday',
      '✅ Track grade changes over time',
      '✅ Compare vs 3 competitors weekly',
      '✅ Note which queries you rank for',
      '✅ Adjust strategy based on results',
    ]
  }
]

const gradeConfig: Record<string, {
  bg: string; border: string; text: string
}> = {
  'A+': { bg: 'from-emerald-950/80 to-gray-950', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  'A':  { bg: 'from-emerald-950/60 to-gray-950', border: 'border-emerald-500/20', text: 'text-emerald-300' },
  'B':  { bg: 'from-blue-950/80 to-gray-950',    border: 'border-blue-500/30',    text: 'text-blue-400'    },
  'C':  { bg: 'from-yellow-950/80 to-gray-950',  border: 'border-yellow-500/30',  text: 'text-yellow-400'  },
  'F':  { bg: 'from-red-950/80 to-gray-950',     border: 'border-red-500/30',     text: 'text-red-400'     },
  '📊': { bg: 'from-blue-950/80 to-gray-950',    border: 'border-blue-500/30',    text: 'text-blue-400'    },
  '?':  { bg: 'from-gray-900 to-gray-950',       border: 'border-gray-700',       text: 'text-gray-400'    },
}

export default function Home() {
  const [query, setQuery]               = useState('')
  const [brand, setBrand]               = useState('')
  const [results, setResults]           = useState<Results | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showResponse, setShowResponse] = useState<string | null>(null)
  const [activeTip, setActiveTip]       = useState<number | null>(null)

  const runAnalysis = async (q: string, b: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    setResults(null)
    setShowResponse(null)
    setActiveTip(null)

    try {
      const res = await fetch('https://aeo-diagnostic-api.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          your_brand: b.trim() || null
        })
      })
      if (!res.ok) throw new Error('failed')
      const data: Results = await res.json()
      setResults(data)
    } catch {
      setError('Something went wrong! Make sure backend is running on port 8000')
    }
    setLoading(false)
  }

  // ── FORMAT AI RESPONSE BEAUTIFULLY ──
  const formatResponse = (response: string) => {
    return response.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-2" />
      const isNumbered = /^\d+[\.\)]/.test(line.trim())
      const cleanLine  = line.replace(/\*\*/g, '').trim()

      if (isNumbered) {
        const numMatch = cleanLine.match(/^(\d+[\.\)])\s*(.*)/)
        if (numMatch) {
          const num       = numMatch[1]
          const rest      = numMatch[2]
          const colonIdx  = rest.indexOf(':')
          const brandName = colonIdx > -1 ? rest.slice(0, colonIdx) : rest
          const reason    = colonIdx > -1 ? rest.slice(colonIdx + 1) : ''
          return (
            <div key={i} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
              <span className="text-purple-400 font-bold text-sm min-w-[24px]">
                {num}
              </span>
              <div className="flex-1">
                <span className="text-white font-semibold text-sm">
                  {brandName}
                </span>
                {reason && (
                  <span className="text-gray-400 text-sm">:{reason}</span>
                )}
              </div>
            </div>
          )
        }
      }

      return (
        <p key={i} className="text-gray-400 text-sm py-1 leading-relaxed">
          {cleanLine}
        </p>
      )
    })
  }

  const grade      = results?.overall.grade ?? 'F'
  const gc         = gradeConfig[grade] ?? gradeConfig['F']
  const allEngines = results ? Object.entries(results.engines) : []

  return (
    <div className="min-h-screen bg-[#080810] text-white">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080810]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <span className="font-bold text-lg tracking-tight">
              AEO Diagnostic
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {[
              { label: 'Groq',   color: 'bg-orange-400' },
              { label: 'Gemini', color: 'bg-blue-400'   },
              { label: 'Cohere', color: 'bg-green-400'  },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${e.color} animate-pulse inline-block`} />
                {e.label}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">

        {/* ── HERO ── */}
        {!results && !loading && (
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-xs mb-8 uppercase tracking-widest">
              ✦ AI Engine Optimization — 3 Free AI Engines
            </div>
            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-none tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
                Does AI recommend
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                your brand?
              </span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
              Search any product. Check your brand visibility across
              3 free AI engines simultaneously. Works with typos!
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-10">
              {[
                { label: 'AI Engines',     value: '3'    },
                { label: 'Response Time',  value: '~8s'  },
                { label: 'Cost',           value: 'Free' },
                { label: 'Brand Required', value: 'No!'  },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Engine Pills */}
            <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
              {[
                { logo: '⚡', name: 'Groq',   desc: 'Llama 3.3 70B',   color: 'border-orange-500/30 bg-orange-500/5 text-orange-400' },
                { logo: '✨', name: 'Gemini', desc: 'Gemini 2.0 Flash', color: 'border-blue-500/30 bg-blue-500/5 text-blue-400'       },
                { logo: '🔥', name: 'Cohere', desc: 'Command-R',        color: 'border-green-500/30 bg-green-500/5 text-green-400'    },
              ].map((e, i) => (
                <div key={i} className={`flex items-center gap-2 border rounded-full px-4 py-2 text-xs ${e.color}`}>
                  <span>{e.logo}</span>
                  <span className="font-semibold">{e.name}</span>
                  <span className="opacity-60">· {e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INPUT CARD ── */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 mb-8">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />

          {/* Example chips */}
          <div className="mb-5">
            <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">
              ⚡ Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(ex.query)
                    setBrand(ex.brand)
                  }}
                  disabled={loading}
                  className="text-xs bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 rounded-full px-3 py-1.5 text-gray-500 hover:text-purple-300 transition-all duration-200 disabled:opacity-40"
                >
                  {ex.query}
                  {ex.brand && (
                    <span className="ml-1 text-purple-500">· {ex.brand}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                🛍️ Shopper Query
                <span className="ml-2 text-red-400">*required</span>
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none transition-all text-sm"
                placeholder="best magnesium for seniors..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAnalysis(query, brand)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                🏷️ Your Brand
                <span className="ml-2 text-gray-600">(optional)</span>
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none transition-all text-sm"
                placeholder="Leave empty to see top brands..."
                value={brand}
                onChange={e => setBrand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAnalysis(query, brand)}
              />
              <p className="text-[10px] text-gray-700 mt-1 ml-1">
                💡 Add your brand to get a visibility grade
              </p>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={() => runAnalysis(query, brand)}
            disabled={loading || !query.trim()}
            className="relative w-full overflow-hidden rounded-xl py-3.5 font-semibold text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading || !query.trim()
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #7c3aed, #2563eb)'
            }}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Querying 3 AI engines simultaneously...
                </>
              ) : (
                <>
                  🚀 Run AEO Diagnostic
                  {!brand.trim() && (
                    <span className="text-xs opacity-70">(shows top brands)</span>
                  )}
                </>
              )}
            </span>
          </button>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-400 text-sm">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-12 text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  🔍
                </div>
              </div>
            </div>
            <h3 className="text-white font-semibold mb-2">
              Analyzing AI Visibility
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Searching for{' '}
              <span className="text-white font-medium">"{query}"</span>
              {brand && (
                <>
                  {' '}· Checking brand{' '}
                  <span className="text-white font-medium">"{brand}"</span>
                </>
              )}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {[
                { label: '⚡ Groq thinking...',   color: 'bg-orange-400' },
                { label: '✨ Gemini thinking...', color: 'bg-blue-400'   },
                { label: '🔥 Cohere thinking...', color: 'bg-green-400'  },
              ].map((step, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-400"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${step.color} animate-pulse`} />
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {results && !loading && (
          <div className="space-y-6">

            {/* Spell Correction Notice */}
            {(results.fixed_query !== results.query ||
              (results.fixed_brand &&
               results.your_brand &&
               results.fixed_brand !== results.your_brand)) && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <span className="text-xl">🤖</span>
                <div className="space-y-1">
                  <p className="text-blue-400 text-sm font-semibold">
                    AI understood your query as:
                  </p>
                  {results.fixed_query !== results.query && (
                    <p className="text-gray-300 text-sm">
                      🔍 Search:{' '}
                      <span className="line-through text-gray-600 mr-2">
                        "{results.query}"
                      </span>
                      <span className="text-white font-medium">
                        "{results.fixed_query}"
                      </span>
                    </p>
                  )}
                  {results.fixed_brand &&
                   results.your_brand &&
                   results.fixed_brand !== results.your_brand && (
                    <p className="text-gray-300 text-sm">
                      🏷️ Brand:{' '}
                      <span className="line-through text-gray-600 mr-2">
                        "{results.your_brand}"
                      </span>
                      <span className="text-white font-medium">
                        "{results.fixed_brand}"
                      </span>
                    </p>
                  )}
                  {results.category && (
                    <p className="text-gray-300 text-sm">
                      📦 Category:{' '}
                      <span className="text-white font-medium">
                        {results.category}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* No Brand Notice */}
            {results.no_brand && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-purple-400 text-sm font-semibold">
                    No brand entered
                  </p>
                  <p className="text-gray-400 text-sm">
                    Showing top brands AI recommends for{' '}
                    <span className="text-white">"{results.fixed_query}"</span>.
                    Enter your brand name to get a visibility grade!
                  </p>
                </div>
              </div>
            )}

            {/* ── SCORE CARD ── */}
            <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gc.bg} ${gc.border} p-8 shadow-2xl`}>
              <div
                className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{
                  background:
                    ['A+', 'A'].includes(grade) ? '#10b981' :
                    grade === 'B'               ? '#3b82f6' :
                    grade === 'C'               ? '#eab308' :
                    grade === '📊'              ? '#3b82f6' : '#ef4444'
                }}
              />

              <div className="relative flex items-start justify-between flex-wrap gap-8">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
                    {results.no_brand
                      ? `Top AI Results for "${results.fixed_query}"`
                      : `AI Visibility Score for "${results.your_brand}"`
                    }
                  </p>

                  <div className="flex items-end gap-6">
                    <div className={`font-black leading-none ${gc.text} ${
                      results.no_brand ? 'text-6xl' : 'text-[120px]'
                    }`}>
                      {results.overall.grade}
                    </div>
                    {!results.no_brand && (
                      <div className="mb-4">
                        <div className="text-5xl font-bold">
                          {results.overall.score}%
                        </div>
                        <div className="text-gray-500 text-sm mt-1">
                          {results.overall.mentions}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-white text-lg font-medium mt-2">
                    {results.overall.message}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    💡 {results.overall.tip}
                  </p>
                </div>

                {/* Engine Status Summary */}
                <div className="space-y-2 min-w-[240px]">
                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">
                    All Engine Results
                  </p>
                  {allEngines.map(([engine, data]) => (
                    <div
                      key={engine}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5"
                    >
                      <span className="text-lg">{data.logo}</span>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 font-medium">
                          {engine}
                        </div>
                        {data.analysis.rank && (
                          <div className="text-[10px] text-gray-600">
                            Position #{data.analysis.rank}
                          </div>
                        )}
                      </div>
                      {data.status === 'error' ? (
                        <span className="text-gray-500 text-xs">⚠️ Error</span>
                      ) : results.no_brand ? (
                        <span className="text-emerald-400 text-xs font-semibold">✅ Ready</span>
                      ) : data.analysis.mentioned ? (
                        <span className="text-emerald-400 text-xs font-semibold">✅ Found</span>
                      ) : (
                        <span className="text-red-400 text-xs font-semibold">❌ Missing</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 3 ENGINE CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allEngines.map(([engine, data]) => (
                <div
                  key={engine}
                  className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                        {data.logo}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{engine}</div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider">
                          Free AI Engine
                        </div>
                      </div>
                    </div>
                    {data.status === 'error' ? (
                      <div className="px-2 py-1 rounded-full text-[10px] font-semibold border bg-gray-500/10 border-gray-500/30 text-gray-400">
                        ⚠️ Error
                      </div>
                    ) : results.no_brand ? (
                      <div className="px-2 py-1 rounded-full text-[10px] font-semibold border bg-blue-500/10 border-blue-500/30 text-blue-400">
                        📊 Ready
                      </div>
                    ) : (
                      <div className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                        data.analysis.mentioned
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {data.analysis.mentioned ? '✅ Visible' : '❌ Hidden'}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">

                    {/* Brand Status */}
                    {!results.no_brand && !data.analysis.no_brand && (
                      <div className={`rounded-xl p-3 mb-4 text-xs border ${
                        data.analysis.mentioned
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/5 border-red-500/20 text-red-300'
                      }`}>
                        {data.analysis.mentioned
                          ? `"${results.your_brand}" appears${data.analysis.rank ? ` at #${data.analysis.rank}` : ''} in AI results`
                          : `"${results.your_brand}" NOT mentioned`
                        }
                      </div>
                    )}

                    {/* No brand */}
                    {results.no_brand && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4 text-xs text-blue-300">
                        📊 Top brands for "{results.fixed_query}"
                      </div>
                    )}

                    {/* Snippet */}
                    {data.analysis.snippet && (
                      <div className="bg-white/5 rounded-xl p-3 mb-4 text-xs text-gray-400 italic border border-white/5 leading-relaxed">
                        "{data.analysis.snippet}"
                      </div>
                    )}

                    {/* Top Brands */}
                    <div className="mb-4 flex-1">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
                        Top Brands
                      </p>
                      <div className="space-y-1">
                        {data.top_brands.slice(0, 7).map((b, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg ${
                              results.your_brand &&
                              b.toLowerCase().includes(
                                results.your_brand.toLowerCase()
                              )
                                ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                                : 'text-gray-600 hover:text-gray-400'
                            }`}
                          >
                            <span className="text-gray-700 w-4 text-center">
                              {i + 1}
                            </span>
                            <span className="flex-1">
                              {b.length > 50 ? b.slice(0, 50) + '...' : b}
                            </span>
                            {results.your_brand &&
                             b.toLowerCase().includes(
                               results.your_brand.toLowerCase()
                             ) && (
                              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* View Full Response Button */}
                    <button
                      onClick={() =>
                        setShowResponse(
                          showResponse === engine ? null : engine
                        )
                      }
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/15 text-purple-400 text-xs font-semibold transition-all mt-auto"
                    >
                      {showResponse === engine
                        ? '▲ Hide Response'
                        : '▼ View Full Response'
                      }
                    </button>
                  </div>

                  {/* Full Response Viewer */}
                  {showResponse === engine && (
                    <div className="border-t border-white/5">
                      <div className="flex items-center justify-between px-5 py-3 bg-black/30">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/60" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                            <div className="w-3 h-3 rounded-full bg-green-500/60" />
                          </div>
                          <span className="text-[10px] text-gray-600 ml-2 uppercase tracking-wider">
                            {engine}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-700">
                          {data.response.length} chars
                        </span>
                      </div>
                      <div className="p-5 bg-black/20 max-h-80 overflow-y-auto">
                        <div className="space-y-0.5">
                          {formatResponse(data.response)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── TIPS ── */}
            <div>
              <h3 className="text-xs text-gray-600 uppercase tracking-widest mb-4">
                📋 What To Do Next — Click to Expand
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tips.map((tip, i) => (
                  <div key={i}>
                    <button
                      onClick={() =>
                        setActiveTip(activeTip === i ? null : i)
                      }
                      className={`w-full text-left bg-gradient-to-br ${tip.color} border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        activeTip === i ? 'ring-1 ring-white/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-3xl mb-3">{tip.icon}</div>
                        <span className={`text-gray-500 text-xs mt-1 transition-transform duration-300 inline-block ${
                          activeTip === i ? 'rotate-180' : ''
                        }`}>
                          ▼
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-white mb-1">
                        {tip.title}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {tip.desc}
                      </div>
                    </button>

                    {activeTip === i && (
                      <div className="mt-2 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
                          Action Steps
                        </p>
                        <div className="space-y-2">
                          {tip.details.map((detail, j) => (
                            <div
                              key={j}
                              className="text-sm text-gray-300 py-1.5 border-b border-white/5 last:border-0"
                            >
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Run Again */}
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setResults(null)
                  setQuery('')
                  setBrand('')
                  setShowResponse(null)
                  setActiveTip(null)
                }}
                className="text-sm text-gray-500 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-8 py-3 transition-all hover:bg-white/5"
              >
                ← Run Another Search
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
