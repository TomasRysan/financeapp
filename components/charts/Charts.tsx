import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface PortfolioChartProps {
  data: Array<{
    name: string
    value: number
  }>
}

export function PortfolioAllocationChart({ data }: PortfolioChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-400 text-center py-8">Není dostáno dat</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => value.toFixed(2)} />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface PerformanceChartProps {
  data: Array<{
    name: string
    value: number
  }>
}

export function PerformanceBarChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-400 text-center py-8">Není dostáno dat</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#e2e8f0' }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface PriceHistoryProps {
  data: Array<{
    date: string
    price: number
  }>
}

export function PriceHistoryChart({ data }: PriceHistoryProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-400 text-center py-8">Není dostáno dat</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#e2e8f0' }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#3b82f6" 
          dot={false}
          strokeWidth={2}
          name="Cena"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface SectorDistributionProps {
  data: Array<{
    sektor: string
    count: number
  }>
}

export function SectorDistributionChart({ data }: SectorDistributionProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-400 text-center py-8">Není dostáno dat</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis type="number" stroke="#94a3b8" />
        <YAxis dataKey="sektor" type="category" stroke="#94a3b8" width={100} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#e2e8f0' }}
        />
        <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
