import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import 'chart.js/auto';

interface KalibrierungAnzahlProps {
  onChange: (anzahl: number) => void;
  initialAnzahl?: number;
}

export function KalibrierungAnzahl({ onChange, initialAnzahl = 1 }: KalibrierungAnzahlProps) {
  const [counts, setCounts] = useState<number[]>([1, 2, 7]);

  const calculateFactors = (counts: number[]) => {
    const total = counts.reduce((sum, count) => sum + count, 0);
    return counts.map(count => count / total);
  };

  const factors = calculateFactors(counts);

  const updateCount = (index: number, newCount: number) => {
    const newCounts = [...counts];
    newCounts[index] = newCount;
    setCounts(newCounts);
    // factors werden automatisch neu berechnet
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const neueAnzahl = Math.max(1, parseInt(event.target.value) || 1);
    setCounts([neueAnzahl, counts[1], counts[2]]);
    onChange(neueAnzahl);
  };

  // Daten für die Gewichtsverteilungschart
  const factorsData = {
    labels: ['Kategorie 1', 'Kategorie 2', 'Kategorie 3'],
    datasets: [
      {
        label: 'Gewichtsverteilung',
        data: factors,
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)'],
        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-2">
      <label 
        htmlFor="kalibrierungAnzahl" 
        className="text-sm font-medium text-gray-700"
      >
        Stückzahl der Gewichtsverteilung
      </label>
      <input
        id="kalibrierungAnzahl"
        type="number"
        min="1"
        value={counts[0]}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        aria-label="Anzahl der Teile zur Kalibrierung"
      />
      <p className="text-sm text-gray-500">
        Aktuelle Anzahl: {counts[0]} {counts[0] === 1 ? 'Teil' : 'Teile'}
      </p>

      {/* Verzählung Chart */}
      <Chart type="bar" data={verzaehlungData} options={verzaehlungOptions} />

      // Neuer Gewichtsverteilung Chart
      <Chart type="pie" data={factorsData} options={factorsOptions} />
    </div>
  );
}
