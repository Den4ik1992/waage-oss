import { useState } from 'react';
import Plot from 'react-plotly.js';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWeight, FaChartLine, FaCog, FaPlay, FaExclamation, FaWaveSquare } from 'react-icons/fa';
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
  const [scaleResolution, setScaleResolution] = useState(0.1);
  const [measurementNoiseStdDev, setMeasurementNoiseStdDev] = useState(0);

  const [weightOptionsError, setWeightOptionsError] = useState<string | null>(null);
  const [weightDistributionError, setWeightDistributionError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(true); // Assume initial values are valid

  const [simulationResults, setSimulationResults] = useState<{
    actualCount: number[];
    displayedCount: number[];
    deviation: number[];
    xAxis: number[];
    maxDeviation: number;
    maxDeviationPercent: number;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const parseNumbersString = (value: string, fieldName: string): { numbers: number[] | null, error: string | null } => {
    if (!value.trim()) {
      return { numbers: null, error: `${fieldName} darf nicht leer sein.` };
    }
    const parts = value.split(',');
    const numbers: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const num = parseFloat(parts[i].trim());
      if (isNaN(num)) {
        return { numbers: null, error: `Ungültiger Wert '${parts[i].trim()}' im Feld ${fieldName}. Bitte nur Zahlen und Kommas verwenden.` };
      }
      numbers.push(num);
    }
    if (numbers.length === 0 && value.trim() !== "") { // Handles cases like just " " or ","
        return { numbers: null, error: `Keine gültigen Zahlen im Feld ${fieldName} gefunden. Bitte nur Zahlen und Kommas verwenden.` };
    }
    return { numbers, error: null };
  };
  
  const validateInputs = (
    currentWeightOptions: string,
    currentWeightDistribution: string,
    currentDistributionType: 'discrete' | 'normal'
  ): boolean => {
    let optionsError: string | null = null;
    let distributionError: string | null = null;
    let overallValid = true;

    const { numbers: optionsNumbers, error: woError } = parseNumbersString(currentWeightOptions, "Gewichtsoptionen");
    if (woError) {
      optionsError = woError;
      overallValid = false;
    }

    const { numbers: distNumbers, error: wdError } = parseNumbersString(currentWeightDistribution, "Gewichtsverteilung");
    if (wdError && currentDistributionType === 'discrete') { // Only validate distribution string if discrete
      distributionError = wdError;
      overallValid = false;
    }

    if (currentDistributionType === 'discrete' && optionsNumbers && distNumbers) {
      if (optionsNumbers.length === 0) {
        optionsError = optionsError || "Gewichtsoptionen dürfen nicht leer sein, wenn Verteilungstyp Diskret ist.";
        overallValid = false;
      }
      if (distNumbers.length === 0) {
        distributionError = distributionError || "Gewichtsverteilung darf nicht leer sein, wenn Verteilungstyp Diskret ist.";
        overallValid = false;
      }
      if (optionsNumbers.length > 0 && distNumbers.length > 0 && optionsNumbers.length !== distNumbers.length) {
        distributionError = distributionError || "Anzahl der Gewichtsoptionen und Verteilungswerte muss übereinstimmen.";
        overallValid = false;
      }
    }
    
    setWeightOptionsError(optionsError);
    setWeightDistributionError(distributionError);
    setIsFormValid(overallValid);
    return overallValid;
  };

  const handleWeightOptionsChange = (value: string) => {
    setWeightOptions(value);
    validateInputs(value, weightDistribution, distributionType);
  };

  const handleWeightDistributionChange = (value: string) => {
    setWeightDistribution(value);
    validateInputs(weightOptions, value, distributionType);
  };

  const handleDistributionTypeChange = (value: 'discrete' | 'normal') => {
    setDistributionType(value);
    validateInputs(weightOptions, weightDistribution, value);
  };
  
  // Initial validation run for pre-filled values
  useState(() => {
      validateInputs(weightOptions, weightDistribution, distributionType);
  }, []);

  const roundToResolution = (value: number, resolution: number): number => {
    if (resolution <= 0) return value; // Avoid division by zero or negative resolution
    return Math.round(value / resolution) * resolution;
  };

  const generateMeasurementNoise = (stdDev: number): number => {
    if (stdDev === 0) return 0;
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev;
  };

  const runSimulation = async () => {
    if (!validateInputs(weightOptions, weightDistribution, distributionType)) {
      return;
    }
    setIsSimulating(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const partRanges = Array.from({ length: Math.floor(totalParts / 100) }, (_, i) => (i + 1) * 100);
    const actualCount: number[] = [];
    const displayedCount: number[] = [];
    const deviation: number[] = [];

    const weights = weightOptions.split(',').map(Number);
    let distribution = weightDistribution.split(',').map(Number);

    if (distributionType === 'discrete') {
      const sumDist = distribution.reduce((a, b) => a + b, 0);
      if (sumDist > 0 && sumDist !== 1) { // Avoid division by zero and unnecessary mapping if already normalized
        distribution = distribution.map(d => d / sumDist);
      }
    }

    partRanges.forEach(partCount => {
      let parts: number[];
      if (distributionType === 'discrete') {
        parts = Array.from({ length: partCount }, () => {
          const rand = Math.random();
          let sum = 0;
          // Ensure weights and distribution are not empty to prevent errors.
          // Fallback to a default weight if arrays are empty or lengths don't match,
          // though UI/input validation should ideally prevent this.
          if (weights.length === 0) return normalMean || 1; // Default to normalMean or 1 if weights is empty
          for (let i = 0; i < distribution.length; i++) {
            sum += distribution[i];
            if (rand <= sum) return weights[i] !== undefined ? weights[i] : weights[0];
          }
          return weights[weights.length - 1];
        });
      } else {
        parts = Array.from({ length: partCount }, () => 
          normalMean + normalStd * Math.sqrt(-2 * Math.log(Math.random())) * 
          Math.cos(2 * Math.PI * Math.random())
        );
      }

      const actualCalibrationSize = Math.min(calibrationParts, partCount);
      const sampleForCalibration = parts.slice(0, actualCalibrationSize);
      
      // Ensure actualCalibrationSize is not zero to prevent division by zero.
      // Given calibrationParts >= 1 and partCount >= 100 (from partRanges),
      // actualCalibrationSize will be >= 1, so division by zero is not expected here.
      // Defaulting to 1 for calibrationSample if actualCalibrationSize is 0,
      // though this path should ideally not be hit with current constraints.
      const trueCalibrationSampleSum = sampleForCalibration.reduce((sum, weight) => sum + weight, 0);
      const measuredCalibrationSampleSum = trueCalibrationSampleSum + generateMeasurementNoise(measurementNoiseStdDev);
      
      let currentCalibrationSample = actualCalibrationSize > 0 
          ? measuredCalibrationSampleSum / actualCalibrationSize 
          : 1; 
      
      const effectiveCalibrationSample = roundToResolution(currentCalibrationSample, scaleResolution);

      const trueTotalWeight = parts.reduce((sum, weight) => sum + weight, 0);
      let measuredTotalWeight = trueTotalWeight + generateMeasurementNoise(measurementNoiseStdDev);
      const effectiveTotalWeight = roundToResolution(measuredTotalWeight, scaleResolution);
      
      const calculatedCount = effectiveCalibrationSample !== 0
        ? Math.round(effectiveTotalWeight / effectiveCalibrationSample)
        : (effectiveTotalWeight > 0 ? Infinity : 0);

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

        <AnimatePresence mode="wait">
          <Tab.Panels>
            <Tab.Panel
              as={motion.div}
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-xl shadow-lg p-6"> {/* Removed motion.div from here as Tab.Panel is now motion component */}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FaWaveSquare className="text-blue-500" />
                      Messrauschen (StdAbw g)
                    </label>
                    <input
                      type="number"
                      value={measurementNoiseStdDev}
                      onChange={(e) => setMeasurementNoiseStdDev(Math.max(0, parseFloat(e.target.value) || 0))}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
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
                      onChange={(e) => handleWeightOptionsChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out ${weightOptionsError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder="2.1,2.2,2.3"
                    />
                    {weightOptionsError && <p className="text-red-500 text-xs mt-1">{weightOptionsError}</p>}
                  </div>

                  {distributionType === 'discrete' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FaChartLine className="text-blue-500" />
                        Gewichtsverteilung (Diskret)
                      </label>
                      <input
                        type="text"
                        value={weightDistribution}
                        onChange={(e) => handleWeightDistributionChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out ${weightDistributionError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder="0.1,0.2,0.7"
                      />
                      {weightDistributionError && <p className="text-red-500 text-xs mt-1">{weightDistributionError}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FaChartLine className="text-blue-500" />
                      Verteilungstyp
                    </label>
                    <select
                      value={distributionType}
                      onChange={(e) => handleDistributionTypeChange(e.target.value as 'discrete' | 'normal')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
                    >
                      <option value="discrete">Diskret</option>
                      <option value="normal">Normalverteilung</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FaCog className="text-blue-500" /> {/* Using FaCog as a generic settings icon */}
                      Waagenauflösung (g)
                    </label>
                    <input
                      type="number"
                      value={scaleResolution}
                      onChange={(e) => setScaleResolution(Math.max(0.001, parseFloat(e.target.value) || 0.1))}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
                    />
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors duration-200 ease-in-out"
                        />
                      </div>
                    </>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runSimulation}
                  disabled={isSimulating || !isFormValid}
                  className={`w-full mt-6 px-4 py-3 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-colors duration-150 ease-in-out
                    ${(isSimulating || !isFormValid)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <FaPlay className={(isSimulating || !isFormValid) && isSimulating ? 'animate-spin' : ''} />
                  {isSimulating ? 'Simulation läuft...' : 'Simulation starten'}
                </motion.button>
              </div>
            </Tab.Panel>

            <Tab.Panel
              as={motion.div}
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {simulationResults && (
                <div className="space-y-6"> {/* Removed motion.div from here */}
                  <div className="bg-white rounded-xl shadow-lg p-6 h-[450px]">
                    <Plot
              <div className="space-y-6">
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
