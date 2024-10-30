import React, { useState } from 'react';

interface KalibrierungAnzahlProps {
  onChange: (anzahl: number) => void;
  initialAnzahl?: number;
}

export function KalibrierungAnzahl({ onChange, initialAnzahl = 1 }: KalibrierungAnzahlProps) {
  const [anzahl, setAnzahl] = useState(initialAnzahl);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const neueAnzahl = Math.max(1, parseInt(event.target.value) || 1);
    setAnzahl(neueAnzahl);
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
        value={anzahl}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        aria-label="Anzahl der Teile zur Kalibrierung"
      />
      <p className="text-sm text-gray-500">
        Aktuelle Anzahl: {anzahl} {anzahl === 1 ? 'Teil' : 'Teile'}
      </p>
    </div>
  );
}