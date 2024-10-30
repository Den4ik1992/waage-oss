import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { motion } from 'framer-motion';
import { FaWeight, FaChartLine, FaCog, FaPlay, FaExclamation } from 'react-icons/fa';
import { Tab } from '@headlessui/react';

interface WeightSimulationProps {
  initialParts?: number;
  initialCalibration?: number;
}

export function WeightSimulation({ initialParts = 10000, initialCalibration = 100 }: WeightSimulationProps) {
  const [totalParts, setTotalParts] = useState(initialParts);
  const [calibrationParts, setCalibrationParts] = useState(initialCalibration);
  const [weightOptions, setWeightOptions] = useState("2.1,2.2,2.3");
  const [weightDistribution, setWeightDistribution] = useState("0.1,0.2,0.7");
  const [distributionType, setDistributionType] = useState<'discrete' | 'normal'>('discrete');
  const [normalMean, setNormalMean] = useState(2.2);
  const [normalStd, setNormalStd] = useState(0.1);
  const [simulationResults, setSimulationResults] = useState<{
    actualCount: number[];
    displayedCount: number[];
    deviation: number[];
    xAxis: number[];
    maxDeviation: number;
    maxDeviationPercent: number;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const partRanges = Array.from({ length: Math.floor(totalParts / 100) }, (_, i) => (i + 1) * 100);
    const actualCount: number[] = [];
    const displayedCount: number[] = [];
    const deviation: number[] = [];

    const weights = weightOptions.split(',').map(Number);
    const distribution = weightDistribution.split(',').map(Number);

    partRanges.forEach(partCount => {
      let parts: number[];
      if (distributionType === 'discrete') {
        parts = Array.from({ length: partCount }, () => {
          const rand = Math.random();
          let sum = 0;
          for (let i = 0; i < distribution.length; i++) {
            sum += distribution[i];
            if (rand <= sum) return weights[i];
          }
          return weights[weights.length - 1];
        });
      } else {
        parts = Array.from({ length: partCount }, () => 
          normalMean + normalStd * Math.sqrt(-2 * Math.log(Math.random())) * 
          Math.cos(2 * Math.PI * Math.random())
        );
      }

      const calibrationSample = parts
        .slice(0, calibrationParts)
        .reduce((sum, weight) => sum + weight, 0) / calibrationParts;

      const totalWeight = parts.reduce((sum, weight) => sum + weight, 0);
      const calculatedCount = Math.round(totalWeight / calibrationSample);

      actualCount.push(partCount);
      displayedCount.push(calculatedCount);
      deviation.push(calculatedCount - partCount);
    });

    const maxDeviation = Math.max(...deviation.map(Math.abs));
    const maxDeviationPercent = (maxDeviation / actualCount[deviation.map(Math.abs).indexOf(maxDeviation)]) * 100;

    setSimulationResults({
      actualCount,
      displayedCount,
      deviation,
      xAxis: partRanges,
      maxDeviation,
      maxDeviationPercent
    });
    
    setIsSimulating(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
             ${selected 
               ? 'bg-white text-blue-700 shadow'
               : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
             } flex items-center justify-center gap-2`
          }>
            <FaCog /> Einstellungen
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
             ${selected 
               ? 'bg-white text-blue-700 shadow'
               : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
             } flex items-center justify-center gap-2`
          }>
            <FaChartLine /> Ergebnisse
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaWeight className="text-blue-500" />
                    Anzahl Teile
                  </label>
                  <input
                    type="number"
                    value={totalParts}
                    onChange={(e) => setTotalParts(Math.max(100, parseInt(e.target.value) || 100))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaCog className="text-blue-500" />
                    Kalibrierung Anzahl
                  </label>
                  <input
                    type="number"
                    value={calibrationParts}
                    onChange={(e) => setCalibrationParts(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaWeight className="text-blue-500" />
                    Gewichtsoptionen
                  </label>
                  <input
                    type="text"
                    value={weightOptions}
                    onChange={(e) => setWeightOptions(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2.1,2.2,2.3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaChartLine className="text-blue-500" />
                    Gewichtsverteilung
                  </label>
                  <input
                    type="text"
                    value={weightDistribution}
                    onChange={(e) => setWeightDistribution(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.1,0.2,0.7"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaChartLine className="text-blue-500" />
                    Verteilungstyp
                  </label>
                  <select
                    value={distributionType}
                    onChange={(e) => setDistributionType(e.target.value as 'discrete' | 'normal')}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="discrete">Diskret</option>
                    <option value="normal">Normalverteilung</option>
                  </select>
                </div>

                {distributionType === 'normal' && (
                  <>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FaChartLine className="text-blue-500" />
                        Normalverteilung Mittelwert
                      </label>
                      <input
                        type="number"
                        value={normalMean}
                        onChange={(e) => setNormalMean(parseFloat(e.target.value))}
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FaChartLine className="text-blue-500" />
                        Normalverteilung Standardabweichung
                      </label>
                      <input
                        type="number"
                        value={normalStd}
                        onChange={(e) => setNormalStd(parseFloat(e.target.value))}
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={runSimulation}
                disabled={isSimulating}
                className={`w-full mt-6 px-4 py-3 rounded-md text-white font-medium flex items-center justify-center gap-2
                  ${isSimulating 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <FaPlay className={isSimulating ? 'animate-spin' : ''} />
                {isSimulating ? 'Simulation läuft...' : 'Simulation starten'}
              </motion.button>
            </motion.div>
          </Tab.Panel>

          <Tab.Panel>
            {simulationResults && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl shadow-lg p-6 h-[450px]">
                  <Plot
                    data={[
                      {
                        x: simulationResults.xAxis,
                        y: simulationResults.actualCount,
                        type: 'scatter',
                        name: 'Tatsächliche Stückzahl',
                        line: { color: '#2563eb' },
                      },
                      {
                        x: simulationResults.xAxis,
                        y: simulationResults.displayedCount,
                        type: 'scatter',
                        name: 'Angezeigte Stückzahl',
                        line: { color: '#dc2626' },
                      },
                    ]}
                    layout={{
                      title: 'Tatsächliche vs. Angezeigte Stückzahl',
                      xaxis: { title: 'Anzahl Teile' },
                      yaxis: { title: 'Stückzahl' },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      margin: { t: 50 },
                    }}
                    style={{ width: '100%', height: '100%' }}
                    config={{ responsive: true }}
                  />
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 h-[450px]">
                  <Plot
                    data={[
                      {
                        x: simulationResults.xAxis,
                        y: simulationResults.deviation,
                        type: 'scatter',
                        name: 'Verzählung',
                        line: { color: '#059669' },
                        fill: 'tozeroy',
                      },
                    ]}
                    layout={{
                      title: 'Verzählung',
                      xaxis: { title: 'Anzahl Teile' },
                      yaxis: { title: 'Verzählung' },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      margin: { t: 50 },
                    }}
                    style={{ width: '100%', height: '100%' }}
                    config={{ responsive: true }}
                  />
                </div>

                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-500">Tatsächliche Stückzahl</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {simulationResults.actualCount[simulationResults.actualCount.length - 1].toLocaleString()}
                    </p>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-500">Angezeigte Stückzahl</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {simulationResults.displayedCount[simulationResults.displayedCount.length - 1].toLocaleString()}
                    </p>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-500">Absolute Abweichung</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {simulationResults.deviation[simulationResults.deviation.length - 1].toLocaleString()}
                    </p>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-500">Relative Abweichung</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {((simulationResults.deviation[simulationResults.deviation.length - 1] / 
                        simulationResults.actualCount[simulationResults.actualCount.length - 1]) * 100).toFixed(2)}%
                    </p>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <div className="flex items-center gap-2">
                      <FaExclamation className="text-amber-500" />
                      <h4 className="text-sm font-medium text-gray-500">Maximale Abweichung</h4>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                      {simulationResults.maxDeviation.toLocaleString()}
                      <span className="text-base font-normal text-amber-500 ml-1">
                        ({simulationResults.maxDeviationPercent.toFixed(2)}%)
                      </span>
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </motion.div>
  );
}