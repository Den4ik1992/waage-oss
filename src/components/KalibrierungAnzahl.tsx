import React, { useState } from 'react';

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
    setCounts(neueAnzahl);
    onChange(neueAnzahl);
  };

  return (
    <div className="flex flex-col gap-2">
      <label 
        htmlFor="kalibrierungAnzahl" 
        className="text-sm font-medium text-gray-700"
      >
        Kalibrierung Anzahl
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
    </div>
  );
}
