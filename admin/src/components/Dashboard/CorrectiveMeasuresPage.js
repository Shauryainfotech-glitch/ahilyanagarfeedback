import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import '../../styles/AnalyticsPage.css';
import '../../styles/CorrectiveMeasures.css';
import '../../styles/CorrectiveMeasuresEnhanced.css';
import '../../styles/DepartmentCards.css';
import '../../styles/BarChartResponsive.css'; // Mobile responsive styles for chart
import { useLanguage } from '../../context/LanguageContext';

// API URL from environment variable or default to localhost
const API_URL = process.env.REACT_APP_API_URL;

// Improvement threshold - departments scoring below this need attention
const IMPROVEMENT_THRESHOLD = 5;

// Colors for the chart
const NEEDS_IMPROVEMENT_COLOR = '#F44336'; // Red for departments needing improvement
const GOOD_STANDING_COLOR = '#4CAF50'; // Green for departments in good standing

const CorrectiveMeasuresPage = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Standard department list (English names)
  const standardDepartments = ['Traffic', 'Women Safety', 'Narcotic Drugs', 'Cyber Crime'];

  // Function to normalize text for better matching (trim spaces, convert to lowercase)
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text).trim().toLowerCase();
  };

  // Function to get standardized English department name from any language variant
  const getStandardDepartmentName = (deptName) => {
    if (!deptName) return deptName;
    
    const normalizedDeptName = normalizeText(deptName);
    
    // Direct mapping for Marathi department names
    const marathiMapping = {
      'वाहतूक': 'Traffic',
      'महिला सुरक्षा': 'Women Safety',
      'अमली पदार्थ': 'Narcotic Drugs',
      'सायबर गुन्हे': 'Cyber Crime'
    };
    
    // Additional direct English/alias mappings
    const aliasMapping = {
      'narcotics': 'Narcotic Drugs',
      'narcotic': 'Narcotic Drugs',
      'narcotic drugs': 'Narcotic Drugs',
      'narcotics drugs': 'Narcotic Drugs',
      'narcoticsdepartment': 'Narcotic Drugs',
      'narcotics department': 'Narcotic Drugs',
      'narcoticdepartment': 'Narcotic Drugs',
      'narcotic department': 'Narcotic Drugs',
      'action against narcotics': 'Narcotic Drugs',
      'narcotics control': 'Narcotic Drugs'
    };
    
    // Check direct Marathi mapping first
    if (marathiMapping[deptName]) {
      return marathiMapping[deptName];
    }

    // Check alias mapping for English/plural variations
    if (aliasMapping[normalizedDeptName]) {
      return aliasMapping[normalizedDeptName];
    }
    
    // Check if the input matches any of our i18n translated department names
    for (const englishName of standardDepartments) {
      const deptKey = englishName.toLowerCase().replace(/ /g, '');
      const translatedName = t(deptKey, englishName);
      
      if (normalizeText(englishName) === normalizedDeptName || 
          normalizeText(translatedName) === normalizedDeptName) {
        return englishName;
      }
      
      // Check for partial matches
      if (normalizedDeptName.includes(normalizeText(englishName)) || 
          normalizedDeptName.includes(normalizeText(translatedName))) {
        return englishName;
      }
    }
    
    // Last resort - try to match any part of the department name against known translations
    const deptWords = deptName.split(/\s+/);
    for (const word of deptWords) {
      if (word.length < 3) continue;
      
      for (const englishName of standardDepartments) {
        const deptKey = englishName.toLowerCase().replace(/ /g, '');
        const translatedName = t(deptKey, englishName);
        
        if (translatedName.includes(word) || englishName.includes(word)) {
          return englishName;
        }
      }
    }
    
    return deptName; // Return original if no mapping found
  };

  // Fetch department data
  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const response = await fetch(`${API_URL}/feedback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback data');
      }

      const feedbackData = await response.json();
      processDepartmentData(feedbackData);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching department data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processDepartmentData = (feedbackData) => {
    const specifiedDepartments = ['Traffic', 'Women Safety', 'Narcotic Drugs', 'Cyber Crime'];
    const departmentStats = {};
    specifiedDepartments.forEach(dept => {
      departmentStats[dept] = {
        sum: 0,
        count: 0,
        allRatings: []
      };
    });
    
    feedbackData.forEach(item => {
      let deptRatings = item.departmentRatings;
      
      if (!deptRatings) return;
      if (typeof deptRatings === 'string') {
        try { deptRatings = JSON.parse(deptRatings); } catch (e) { return; }
      }
      if (!Array.isArray(deptRatings)) return;
      
      deptRatings.forEach(dept => {
        if (!dept || !dept.department) return;
        
        const standardDeptName = getStandardDepartmentName(dept.department);
        
        if (specifiedDepartments.includes(standardDeptName)) {
          let rating = dept.rating;
          
          if (typeof rating === 'string') {
            rating = parseFloat(rating);
          }
          
          if (!isNaN(rating)) {
            departmentStats[standardDeptName].sum += rating;
            departmentStats[standardDeptName].count += 1;
            departmentStats[standardDeptName].allRatings.push(rating);
          }
        }
      });
    });
    
    const formattedData = Object.entries(departmentStats)
      .map(([department, stats]) => {
        const avgRating = stats.count > 0 ? parseFloat((stats.sum / stats.count).toFixed(1)) : 0;
        const deptKey = department.toLowerCase().replace(/ /g, '');
        return {
          name: department,
          displayName: t(deptKey, department),
          value: avgRating,
          count: stats.count,
          needsImprovement: stats.count === 0 ? true : avgRating < IMPROVEMENT_THRESHOLD,
        };
      })
      .sort((a, b) => a.value - b.value);
      
    setDepartmentData(formattedData);
  };

  useEffect(() => {
    fetchDepartmentData();
  }, [currentLanguage]);

  const getTranslatedDepartmentName = (deptName) => {
    const standardName = getStandardDepartmentName(deptName);
    if (!standardName) return deptName;
    
    let deptKey;
    
    if (standardName === 'Women Safety') {
      deptKey = 'womenSafety';
    } else if (standardName === 'Cyber Crime') {
      deptKey = 'cyberCrime';
    } else if (standardName === 'Narcotic Drugs') {
      deptKey = 'narcoticDrugs';
    } else if (standardName === 'Traffic') {
      deptKey = 'traffic';
    } else {
      deptKey = standardName.toLowerCase().replace(/ /g, '');
    }
    
    return t(deptKey, standardName);
  };

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = data.needsImprovement ? t('needsImprovement', 'Needs Improvement') : t('goodStanding', 'Good Standing');
      return (
        <div className="custom-tooltip">
          <p className="department-name">{getTranslatedDepartmentName(data.name)}</p>
          <p>{t('averageRating')}: <b>{data.value.toFixed(1)}/10</b></p>
          <p className="rating-status">
            {t('status')}: <span className={data.needsImprovement ? "needs-improvement" : "good-standing"}>
              {status}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getDepartmentsByThreshold = () => {
    const needsImprovement = departmentData.filter(dept => dept.needsImprovement);
    const goodStanding = departmentData.filter(dept => !dept.needsImprovement);
    return { needsImprovement, goodStanding };
  };

  const getDepartmentMeasures = (deptName) => {
    const standardName = getStandardDepartmentName(deptName);
    if (!standardName) return [];
    
    let translationKey;
    
    if (standardName === 'Women Safety') {
      translationKey = 'womenSafety_measures';
    } else if (standardName === 'Cyber Crime') {
      translationKey = 'cyberCrime_measures';
    } else if (standardName === 'Narcotic Drugs') {
      translationKey = 'narcoticDrugs_measures';
    } else if (standardName === 'Traffic') {
      translationKey = 'traffic_measures';
    } else {
      const deptKey = standardName.toLowerCase().replace(/ /g, '');
      translationKey = `${deptKey}_measures`;
    }
    
    const measures = t(translationKey, { returnObjects: true });
    
    if (Array.isArray(measures)) {
      return measures;
    }
    
    return [
      t('conductPerformanceReview'),
      t('provideTraining'),
      t('improveProcedures')
    ];
  };

  const renderNeedsImprovementSection = () => {
    const { needsImprovement } = getDepartmentsByThreshold();
    
    return (
      <div className="departments-section mb-5">
        <h3 className="departments-heading">
          <span className="header-icon">⚠️</span>
          {t('departmentsBelowThreshold').replace('{threshold}', IMPROVEMENT_THRESHOLD)}
        </h3>
        <div className="row">
          {needsImprovement.length > 0 ? (
            needsImprovement.map((dept) => (
              <div key={dept.name} className="col-md-6 col-lg-4 mb-4">
                <div className="department-card needs-improvement-card mb-5">
                  <div className="department-card-header">
                    <h5>{getTranslatedDepartmentName(dept.name)}</h5>
                    <span className="rating-badge danger">{dept.value}/10</span>
                  </div>
                  <div className="department-card-body">
                    <p className="action-title">{t('suggestedActions')}</p>
                    <ul className="action-list">
                      {
                        getDepartmentMeasures(dept.name).slice(0, 3).map((measure, idx) => (
                          <li key={idx}>{measure}</li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <p className="no-data">{t('noDepartmentsBelowThreshold')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGoodStandingSection = () => {
    const { goodStanding } = getDepartmentsByThreshold();
    
    return (
      <div className="departments-section mb-4">
        <h3 className="departments-heading">
          <span className="header-icon">✅</span>
          {t('departmentsAboveThreshold').replace('{threshold}', IMPROVEMENT_THRESHOLD)}
        </h3>
        <div className="row">
          {goodStanding.length > 0 ? (
            goodStanding.map((dept) => (
              <div key={dept.name} className="col-md-6 col-lg-4 mb-4">
                <div className="department-card good-standing-card mb-5">
                  <div className="department-card-header">
                    <h5>{getTranslatedDepartmentName(dept.name)}</h5>
                    <span className="rating-badge success">{dept.value}/10</span>
                  </div>
                  <div className="department-card-body">
                    <p className="action-title">{t('correctiveActions')}</p>
                    <ul className="action-list">
                      {
                        getDepartmentMeasures(dept.name).slice(0, 3).map((measure, idx) => (
                          <li key={idx}>{measure}</li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <p className="no-data">{t('noDepartmentsAboveThreshold')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChartSection = () => {
    return (
      <div className="departments-section mb-5">
        <h3 className="departments-heading">
          <span className="header-icon">📊</span>
          {t('departmentPerformanceOverview')}
        </h3>
        
        <p className="description mb-4">
          {t('departmentsAnalysis', { threshold: IMPROVEMENT_THRESHOLD })}
        </p>

        <div className="chart-card">
          {departmentData.length === 0 ? (
            <div className="no-data text-center p-5">
              <p>{t('noFeedbackData')}</p>
            </div>
          ) : (
            <div>
              <p id="last-updated-timestamp" className="last-updated-timestamp">
                {t('lastUpdated')} {lastUpdated?.toLocaleTimeString()}
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 15, right: 25, left: 120, bottom: 10 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={[0, 10]} 
                    label={{ 
                      value: t('averageRating'), 
                      position: 'insideBottom',
                      offset: -5
                    }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={110}
                    tick={props => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={-10} 
                            y={0} 
                            dy={4} 
                            textAnchor="end" 
                            fill="#333"
                            fontSize={12}
                            fontWeight="500"
                            className="department-label"
                          >
                            {getTranslatedDepartmentName(payload.value)}
                          </text>
                        </g>
                      );
                    }}
                    tickLine={false}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name={t('averageRating')} 
                    radius={[0, 4, 4, 0]}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.needsImprovement ? NEEDS_IMPROVEMENT_COLOR : GOOD_STANDING_COLOR} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImprovementChart = () => {
    return (
      <div>
        {renderChartSection()}
        {renderNeedsImprovementSection()}
        {renderGoodStandingSection()}
      </div>
    );
  };

  return (
    <div className="corrective-measures-page container-fluid pt-4">
      <h1 className="page-title mb-4 text-center">{t('correctiveMeasures')}</h1>
      
      <div className="corrective-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t('loadingData')}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button 
              className="retry-button" 
              onClick={() => fetchDepartmentData()}
            >
              <span className="mr-2">🔄</span> {t('tryAgain')}
            </button>
          </div>
        ) : (
          renderImprovementChart()
        )}
      </div>
    </div>
  );
};

export default CorrectiveMeasuresPage;