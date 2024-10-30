import React from 'react';
import { WeightSimulation } from './components/WeightSimulation';
import { FaBalanceScale } from 'react-icons/fa';
import { motion } from 'framer-motion';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 mb-8"
        >
          <FaBalanceScale className="text-4xl text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Waagen-Simulation
          </h1>
        </motion.div>
        <WeightSimulation />
      </div>
    </div>
  );
}

export default App;