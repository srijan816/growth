'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, TrendingUp, Calculator, BarChart3, Users } from 'lucide-react';
import { useState } from 'react';

interface BreakdownData {
  dimension: string;
  score: number;
  components: {
    name: string;
    value: number;
    weight: number;
    contribution: number;
    source: string;
  }[];
  calculation: string;
  factors: {
    label: string;
    value: string | number;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
}

interface ScoreBreakdownProps {
  title: string;
  score: number;
  breakdownData: BreakdownData;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ScoreBreakdown({ 
  title, 
  score, 
  breakdownData, 
  studentName,
  isOpen, 
  onClose 
}: ScoreBreakdownProps) {
  const [activeTab, setActiveTab] = useState<'formula' | 'breakdown' | 'factors'>('breakdown');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{title} Score Breakdown</h2>
                  {studentName && (
                    <p className="text-blue-100">for {studentName}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Big Score Display */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold">{score}</span>
                <span className="text-xl opacity-80">/ 100</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'breakdown' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Component Breakdown
              </button>
              <button
                onClick={() => setActiveTab('formula')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'formula' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calculator className="w-4 h-4 inline mr-2" />
                Calculation Formula
              </button>
              <button
                onClick={() => setActiveTab('factors')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'factors' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Contributing Factors
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'breakdown' && (
                  <motion.div
                    key="breakdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h3 className="font-semibold text-gray-900 mb-3">Score Components</h3>
                    {breakdownData.components.map((component, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{component.name}</p>
                            <p className="text-sm text-gray-500">Source: {component.source}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {component.value.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Weight: {(component.weight * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Contribution Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Contribution to total</span>
                            <span className="font-medium">
                              +{component.contribution.toFixed(1)} points
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${(component.contribution / score) * 100}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.1 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total Calculation */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">Final Score</span>
                        <span className="text-2xl font-bold text-blue-600">{score}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'formula' && (
                  <motion.div
                    key="formula"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h3 className="font-semibold text-gray-900 mb-3">Calculation Method</h3>
                    
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                      <pre className="whitespace-pre-wrap">{breakdownData.calculation}</pre>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Step-by-step:</h4>
                      {breakdownData.components.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">{idx + 1}.</span>
                          <span className="font-medium">{comp.name}:</span>
                          <span className="text-blue-600">{comp.value.toFixed(1)}</span>
                          <span className="text-gray-500">×</span>
                          <span className="text-purple-600">{(comp.weight * 100).toFixed(0)}%</span>
                          <span className="text-gray-500">=</span>
                          <span className="font-bold">{comp.contribution.toFixed(1)}</span>
                        </div>
                      ))}
                      <div className="pt-3 mt-3 border-t flex items-center gap-2">
                        <span className="font-semibold">Total:</span>
                        <span className="text-gray-600">
                          {breakdownData.components
                            .map(c => c.contribution.toFixed(1))
                            .join(' + ')}
                        </span>
                        <span className="text-gray-500">=</span>
                        <span className="text-xl font-bold text-blue-600">{score}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'factors' && (
                  <motion.div
                    key="factors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h3 className="font-semibold text-gray-900 mb-3">Key Factors</h3>
                    
                    <div className="space-y-3">
                      {breakdownData.factors.map((factor, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              factor.impact === 'positive' ? 'bg-green-500' :
                              factor.impact === 'negative' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-gray-700">{factor.label}</span>
                          </div>
                          <span className={`font-semibold ${
                            factor.impact === 'positive' ? 'text-green-600' :
                            factor.impact === 'negative' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {factor.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Note:</strong> These factors show the key elements that contributed 
                        to the final score. Green indicates positive impact, red indicates areas 
                        for improvement.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>Compared to peer average: </span>
                  <span className={`font-semibold ${
                    score > 50 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {score > 50 ? `+${(score - 50).toFixed(0)}` : (score - 50).toFixed(0)} points
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper component for the question mark icon button
export function ScoreInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
      aria-label="Show score breakdown"
    >
      <HelpCircle className="w-3.5 h-3.5 text-gray-600" />
    </button>
  );
}