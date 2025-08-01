import React, { useState } from 'react';
import { X, BarChart3, Table } from 'lucide-react';
import DateFilter from './DateFilter';
import CustomDateRange from './CustomDateRange';
import LoadingOverlay from './LoadingOverlay';
import GenderStatistics from './GenderStatistics';
import AdvancedStatsTable from './AdvancedStatsTable';

const StatsModal = ({
  showStatsModal,
  onCloseModal,
  selectedDate,
  dateFilters,
  onDateChange,
  customStartDate,
  customEndDate,
  customDatesApplied,
  isCustomDateLoading,
  onStartDateChange,
  onEndDateChange,
  onApplyFilters,
  loading,
  currentData,
  percentages,
  levelStats,
  levelTabs,
  lastUpdated
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  if (!showStatsModal) return null;

  const tabs = [
    { 
      id: 'basic', 
      label: 'Basic View', 
      icon: BarChart3
    },
    { 
      id: 'advanced', 
      label: 'Advanced View', 
      icon: Table
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onCloseModal}
      ></div>
      
      {/* Modal */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative border border-white/20">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 rounded-t-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Enquiry Statistics</h2>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Time Filter - Only show in Basic tab */}
              {activeTab === 'basic' && (
                <DateFilter 
                  selectedDate={selectedDate}
                  dateFilters={dateFilters}
                  onDateChange={onDateChange}
                  loading={loading}
                />
              )}
              
              <button
                onClick={onCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 relative">
          {/* Loading Overlay */}
          {loading && <LoadingOverlay />}
          
          {/* Custom Date Range in Modal */}
          {selectedDate === 'custom' && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Custom Date Range</h3>
              <CustomDateRange 
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                customDatesApplied={customDatesApplied}
                isCustomDateLoading={isCustomDateLoading}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
                onApplyFilters={onApplyFilters}
                loading={loading}
              />
            </div>
          )}
          
          {/* Tab Content */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                {/* Boys Statistics */}
                <GenderStatistics 
                  count={currentData.boys}
                  percentage={percentages.boysPercentage}
                  programs={currentData.programs?.boys || {}}
                  levelStats={levelStats}
                  levelTabs={levelTabs}
                  title="Boys"
                  bgColor="bg-gradient-to-r from-blue-500 to-blue-600"
                />
                
                {/* Girls Statistics */}
                <GenderStatistics 
                  count={currentData.girls}
                  percentage={percentages.girlsPercentage}
                  programs={currentData.programs?.girls || {}}
                  levelStats={levelStats}
                  levelTabs={levelTabs}
                  title="Girls"
                  bgColor="bg-gradient-to-r from-pink-500 to-red-500"
                />
              </div>
              
              {/* Summary Footer */}
              <div className="pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-6 rounded-xl">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{currentData.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 font-medium">Total Students</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{currentData.boys.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 font-medium">Boys ({percentages.boysPercentage.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{currentData.girls.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 font-medium">Girls ({percentages.girlsPercentage.toFixed(1)}%)</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">
                        Showing data for: <span className="font-semibold">{dateFilters.find(f => f.value === selectedDate)?.label}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <AdvancedStatsTable 
              data={currentData}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
