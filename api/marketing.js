import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role to bypass RLS if not logged in as admin, or we rely on authenticated user

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch data from the view we created
    const { data, error } = await supabase
      .from('marketing_roi')
      .select('*')
      .order('total_spend', { ascending: false })

    if (error) throw error

    // Fetch cumulative totals
    const cumulative = data.reduce((acc, row) => {
      acc.totalSpend += Number(row.total_spend || 0)
      acc.totalRevenue += Number(row.total_revenue || 0)
      acc.totalClicks += Number(row.total_clicks || 0)
      acc.totalConversions += Number(row.total_conversions || 0)
      return acc
    }, { totalSpend: 0, totalRevenue: 0, totalClicks: 0, totalConversions: 0 })

    cumulative.net = cumulative.totalRevenue - cumulative.totalSpend
    cumulative.roas = cumulative.totalSpend > 0 ? (cumulative.totalRevenue / cumulative.totalSpend).toFixed(2) : 0

    return res.status(200).json({
      products: data,
      cumulative
    })
  } catch (err) {
    console.error('Marketing API Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
