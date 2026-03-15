import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function ChartComponent({ filteredData, formatXAxis, locale, currency, t, setSelectedPoint }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart 
        data={filteredData}
        onClick={(data: any) => {
          if (data && data.activePayload && data.activePayload.length > 0) {
            setSelectedPoint(data.activePayload[0].payload);
          }
        }}
        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="#1e2329" vertical={true} horizontal={true} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxis}
          stroke="#474d57" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          dy={10}
          minTickGap={30}
        />
        <YAxis 
          orientation="right"
          stroke="#474d57" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          domain={['auto', 'auto']} 
          tickFormatter={(val: any) => val.toLocaleString(locale)}
        />
        <Tooltip 
          content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const date = new Date(payload[0].payload.timestamp);
              return (
                <div className="bg-[#1e2329] border border-[#474d57] p-3 rounded shadow-2xl text-right text-[11px]">
                  <p className="text-white font-bold mb-1">{t('price')} <span className="text-primary">{payload[0].value.toLocaleString(locale, { minimumFractionDigits: 2 })} {currency}</span></p>
                  <p className="text-gray-400">{t('date')} {date.toLocaleDateString(locale)}</p>
                  <p className="text-gray-400">{t('time')} {date.toLocaleTimeString(locale)}</p>
                </div>
              );
            }
            return null;
          }}
          cursor={{ stroke: '#474d57', strokeWidth: 1 }}
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#D4AF37" 
          strokeWidth={2} 
          fillOpacity={1} 
          fill="url(#colorChart)" 
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
