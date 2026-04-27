import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/supabase.js'

export default function MarketingDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const payload = await apiFetch('/api/marketing', { method: 'GET' })
        setData(payload)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-forest-night text-forest-sand">Loading Engine Data...</div>
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-forest-night text-red-500">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-forest-night text-forest-sand p-8 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-forest-sand/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-forest-sand">Banyan Marketing Engine</h1>
            <p className="text-forest-sand/60 mt-2">V1 ROI Tracker & Analytics</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-forest-sand/40">Status: Live</p>
          </div>
        </div>

        {/* Cumulative Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Spend" value={`$${data.cumulative.totalSpend.toFixed(2)}`} />
          <StatCard title="Total Revenue" value={`$${data.cumulative.totalRevenue.toFixed(2)}`} />
          <StatCard 
            title="Net Profit" 
            value={`$${data.cumulative.net.toFixed(2)}`} 
            highlight={data.cumulative.net >= 0 ? 'text-green-400' : 'text-red-400'} 
          />
          <StatCard 
            title="Global ROAS" 
            value={`${data.cumulative.roas}x`} 
            highlight={Number(data.cumulative.roas) >= 1 ? 'text-green-400' : 'text-yellow-400'}
          />
        </div>

        {/* Product Breakdown */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-forest-sand/90">Campaign Performance</h2>
          <div className="overflow-x-auto rounded-lg border border-forest-sand/10 bg-forest-night/50">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-forest-sand/5 text-forest-sand/70 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Platform</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Spend</th>
                  <th className="px-6 py-4 font-medium">Revenue</th>
                  <th className="px-6 py-4 font-medium">ROAS</th>
                  <th className="px-6 py-4 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-sand/10">
                {data.products.map((row) => (
                  <tr key={`${row.product_id}-${row.campaign_id}`} className="hover:bg-forest-sand/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{row.product_name}</td>
                    <td className="px-6 py-4 capitalize">{row.platform}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-forest-sand/10 text-forest-sand/70'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">${Number(row.total_spend || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">${Number(row.total_revenue || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono">{Number(row.roas || 0).toFixed(2)}x</td>
                    <td className="px-6 py-4">
                      <SignalBadge signal={row.recommended_action} />
                    </td>
                  </tr>
                ))}
                {data.products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-forest-sand/50">
                      No campaigns active. Drop a product payload to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ title, value, highlight = "text-forest-sand" }) {
  return (
    <div className="p-6 rounded-lg border border-forest-sand/10 bg-forest-night/50">
      <h3 className="text-sm font-medium text-forest-sand/60">{title}</h3>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${highlight}`}>{value}</p>
    </div>
  )
}

function SignalBadge({ signal }) {
  const styles = {
    SCALE: 'bg-green-400/10 text-green-400 border-green-400/20',
    HOLD: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    KILL: 'bg-red-400/10 text-red-400 border-red-400/20',
    PENDING: 'bg-forest-sand/10 text-forest-sand/50 border-forest-sand/10'
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[signal] || styles.PENDING}`}>
      {signal}
    </span>
  )
}
