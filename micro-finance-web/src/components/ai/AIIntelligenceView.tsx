import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Zap,
  Key,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { Customer, Collateral } from '../../db/types';
import { AIService, type AIRiskAssessmentResult, type CashflowForecastMonth } from '../../services/aiService';
import { useToast } from '../layout/Toast';

interface AIIntelligenceViewProps {
  customers: Customer[];
  collaterals: Collateral[];
}

export const AIIntelligenceView: React.FC<AIIntelligenceViewProps> = ({
  customers,
  collaterals
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'risk_scorer' | 'forecast' | 'anomalies'>('chat');

  // Chat State
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: `👋 **Welcome to FinFlow AI Financial Copilot!**\n\nI am your senior AI Financial & Credit Risk Advisor. I monitor your portfolio health, predict cash flow, evaluate borrower default risks, and detect anomalies.\n\nHow can I assist you with your micro-finance operations today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Risk Scorer Simulator State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [simulatedAmount, setSimulatedAmount] = useState(750000);
  const [simulatedDuration, setSimulatedDuration] = useState(90);
  const [simulatedRate, setSimulatedRate] = useState(14.0);
  const [simulatedCollateralId, setSimulatedCollateralId] = useState('');
  const [riskResult, setRiskResult] = useState<AIRiskAssessmentResult | null>(null);

  // Forecast State
  const [forecastData, setForecastData] = useState<CashflowForecastMonth[]>([]);

  useEffect(() => {
    AIService.getCashflowForecast().then(setForecastData);
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await AIService.askAIAssistant(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      showToast('error', 'AI Assistant Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSimulator = async () => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;
    const col = collaterals.find((c) => c.id === simulatedCollateralId);

    const result = await AIService.evaluateLoanRisk({
      customer: cust,
      requestedAmount: simulatedAmount,
      durationDays: simulatedDuration,
      interestRate: simulatedRate,
      collateral: col
    });
    setRiskResult(result);
  };

  useEffect(() => {
    if (selectedCustomerId) handleRunSimulator();
  }, [selectedCustomerId, simulatedAmount, simulatedDuration, simulatedRate, simulatedCollateralId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>AI Financial Intelligence Hub</span>
          </h3>
          <p className="text-xs text-slate-500">
            Powered by Google Gemini & Built-in Autonomous Financial Intelligence Engine
          </p>
        </div>

        {/* Navigation Subtabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
          {[
            { id: 'chat', label: 'AI Copilot' },
            { id: 'risk_scorer', label: 'Risk Scorer' },
            { id: 'forecast', label: 'Cashflow Predictor' },
            { id: 'anomalies', label: 'Anomaly Detector' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: AI Copilot Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
          {/* Chat Main Window */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                    <span
                      className={`block text-[9px] mt-1.5 ${
                        m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400 text-left'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <span className="animate-pulse">FinFlow AI is analyzing financial models...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask about overdue exposure, customer risk, loan projections or Sinhala summary..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputPrompt.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Prompts Panel */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Quick Prompts</span>
              </h4>
              <div className="space-y-2">
                {[
                  'Analyze current overdue loan exposure & recovery priority',
                  'What is our projected net profit for next quarter?',
                  'Evaluate top tier customer credit expansion opportunities',
                  'මගේ micro-finance system එකේ සම්පූර්ණ විස්තරයක් දෙන්න (Sinhala)'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors border border-slate-100 dark:border-slate-700"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white text-xs border border-emerald-800/40">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Dual-Mode AI Engine</span>
              <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
                Connect your Google Gemini API key in <span className="text-emerald-400 font-semibold">Settings</span> for live cloud reasoning, or enjoy full zero-latency offline intelligence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Risk Scorer Simulator */}
      {activeTab === 'risk_scorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Borrower & Facility Parameters</h4>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Credit: {c.creditScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Loan Amount: LKR {simulatedAmount.toLocaleString()}
              </label>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={50000}
                value={simulatedAmount}
                onChange={(e) => setSimulatedAmount(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tenure: {simulatedDuration} Days ({Math.round(simulatedDuration / 30)} Months)
              </label>
              <input
                type="range"
                min={30}
                max={365}
                step={15}
                value={simulatedDuration}
                onChange={(e) => setSimulatedDuration(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Interest Rate: {simulatedRate}% p.a.
              </label>
              <input
                type="range"
                min={8}
                max={30}
                step={0.5}
                value={simulatedRate}
                onChange={(e) => setSimulatedRate(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Collateral Asset</label>
              <select
                value={simulatedCollateralId}
                onChange={(e) => setSimulatedCollateralId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none"
              >
                <option value="">-- No Collateral / Unsecured --</option>
                {collaterals.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} (Valued: LKR {col.estimatedValue.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Card */}
          {riskResult && (
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">AI Credit Analysis</span>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      Recommendation: <span className="text-emerald-600">{riskResult.recommendation}</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{riskResult.score}/100</span>
                    <span className="block text-[10px] font-bold text-emerald-600 uppercase">{riskResult.riskTier}</span>
                  </div>
                </div>

                {/* 4 Multi-Factor Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Credit History Factor</span>
                      <span className="text-emerald-600">{riskResult.factors.creditScoreFactor.score}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{riskResult.factors.creditScoreFactor.comment}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Debt-to-Income Factor</span>
                      <span className="text-emerald-600">{riskResult.factors.incomeCoverageFactor.score}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{riskResult.factors.incomeCoverageFactor.comment}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Collateral Coverage Factor</span>
                      <span className="text-emerald-600">{riskResult.factors.collateralCoverageFactor.score}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{riskResult.factors.collateralCoverageFactor.comment}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Repayment History Factor</span>
                      <span className="text-emerald-600">{riskResult.factors.historicalRepaymentFactor.score}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{riskResult.factors.historicalRepaymentFactor.comment}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {riskResult.keyInsights.map((ins, i) => (
                    <p key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{ins}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Max Safe Capital Allocation: <span className="font-bold">LKR {riskResult.maxRecommendedAmount.toLocaleString()}</span>
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  Suggested Rate: {riskResult.suggestedInterestRate}% p.a.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Cashflow Forecast */}
      {activeTab === 'forecast' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">6-Month Cashflow & Profit Projections</h4>
              <p className="text-xs text-slate-400">Predictive loan collections vs overhead expense forecasting</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`LKR ${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="expectedCollections" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCollect)" />
                <Area type="monotone" dataKey="projectedNetProfit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: Anomaly Detector */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Real-time Portfolio Anomaly Scan</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-rose-900 dark:text-rose-100">Overdue Risk Aging Flag</p>
                  <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                    Customer Nuwan Chathuranga (LN-1004) has accrued 14 days overdue with unpaid principal balance of LKR 375,500.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-100">Unsecured High-Value Loan Monitor</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                    1 facility above LKR 500,000 has no pledged physical collateral. Monitoring repayment schedule tightly.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">Zero Systemic Fraud Detected</p>
                  <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Cash ledger reconciliations and daily repayment receipts balance 100% against bank deposits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
