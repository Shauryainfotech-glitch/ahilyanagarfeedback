import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../../styles/AnalyticsPage.css';
import { useLanguage } from '../../context/LanguageContext';

// API URL from environment variable or default to localhost
const API_URL = process.env.REACT_APP_API_URL;

// Function to get color based on rating value (0-10 scale)
const getRatingColor = (rating) => {
  const numRating = Number(rating) || 0;
  if (numRating >= 8) return '#4CAF50'; // Green for high ratings
  if (numRating >= 6) return '#2196F3'; // Blue for good ratings
  if (numRating >= 4) return '#FF9800'; // Orange for average ratings
  return '#F44336'; // Red for low ratings
};


// Month names for displaying all 12 months
const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Colors for the donut chart sections
const DEPARTMENT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B8E23', '#9370DB'];

// Colors for departments needing improvement
const IMPROVEMENT_THRESHOLD = 5;
const IMPROVEMENT_COLOR = '#F44336'; // Red color for departments needing improvement
const GOOD_COLOR = '#4CAF50'; // Green color for departments in good standing

// Department name mappings between languages
const departmentNameMappings = {
  // English department names with multi-language variations
  'Traffic': ['Traffic', 'वाहतूक', 'ट्रॅफिक', 'वाहतूक विभाग'],
  'Women Safety': ['Women Safety', 'महिला सुरक्षा', 'महिला सुरक्षा विभाग'],
  'Narcotic Drugs': ['Narcotic Drugs', 'अमली पदार्थ', 'ड्रग्स', 'अमली पदार्थ विभाग'],
  'Cyber Crime': ['Cyber Crime', 'सायबर गुन्हे', 'सायबर', 'सायबर क्राईम', 'सायबर गुन्हे विभाग']
};

// Function to normalize text for better matching
const normalizeText = (text) => {
  if (!text) return '';
  return text.trim().toLowerCase();
};

// Function to get standardized English department name from any language variant
const getStandardDepartmentName = (deptName) => {
  if (!deptName) return deptName;
  
  // Try exact match first
  for (const [englishName, translations] of Object.entries(departmentNameMappings)) {
    const normalizedDeptName = normalizeText(deptName);
    
    // Check for exact matches
    const normalizedTranslations = translations.map(t => normalizeText(t));
    if (normalizedTranslations.includes(normalizedDeptName)) {
      return englishName;
    }
    
    // Check for partial matches (if the department name contains one of our known translations)
    for (const translation of normalizedTranslations) {
      if (normalizedDeptName.includes(translation) || translation.includes(normalizedDeptName)) {
        return englishName;
      }
    }
  }
  
  return deptName; // Return original if no mapping found
}

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [departmentData, setDepartmentData] = useState([]);
  const [improvementData, setImprovementData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
  
      // Retrieve the JWT token from localStorage
      const token = localStorage.getItem('adminToken');
  
      // If no token exists, handle the error (e.g., redirect to login or show error message)
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }
  
      // Fetch feedback data from API with the Authorization header
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Add the JWT token here
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch feedback data');
      }
  
      const data = await response.json();
      processAnalyticsData(data);
      
      // Fetch department rating analysis
      await fetchDepartmentData(token);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  const fetchDepartmentData = async (token) => {
    try {
      // Get department frequency data from feedback entries
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch department data');
      }
  
      const feedbackData = await response.json();
      processDepartmentData(feedbackData);
    } catch (err) {
      console.error('Error fetching department data:', err);
    }
  };
  
  const processDepartmentData = (feedbackData) => {
    // List of specified departments we want to show
    const specifiedDepartments = ['Traffic', 'Women Safety', 'Narcotic Drugs', 'Cyber Crime'];
    
    // Initialize rating sums and counts for all specified departments
    const departmentStats = {};
    specifiedDepartments.forEach(dept => {
      departmentStats[dept] = {
        sum: 0,
        count: 0
      };
    });
    
    
    // Process ratings from feedback
    feedbackData.forEach(item => {
      let deptRatings = item.departmentRatings;
      
      if (!deptRatings) return;
      if (typeof deptRatings === 'string') {
        try { deptRatings = JSON.parse(deptRatings); } catch (e) { return; }
      }
      if (!Array.isArray(deptRatings)) return;
      
      deptRatings.forEach(dept => {
        if (!dept || !dept.department) return;
        
        // Standardize department name using the multilingual mapping
        const standardDeptName = getStandardDepartmentName(dept.department);
        console.log(`Processing analytics for: ${dept.department} → ${standardDeptName}`);
        
        // Only process specified departments
        if (specifiedDepartments.includes(standardDeptName)) {
          // Convert rating to number if it's a string
          const rating = typeof dept.rating === 'string' ? parseFloat(dept.rating) : dept.rating;
          
          if (!isNaN(rating)) {
            departmentStats[standardDeptName].sum += rating;
            departmentStats[standardDeptName].count++;
          }
        } else {
          console.log(`Department not found in standard list: ${standardDeptName}`);
        }
      });
    });
    
    // Generate formatted department data for chart
    const formattedData = Object.entries(departmentStats)
      .filter(([_, stats]) => stats.count > 0)
      .map(([department, stats]) => {
        const avgRating = parseFloat((stats.sum / stats.count).toFixed(1));
        return {
          name: department,
          value: avgRating,
          count: stats.count,
          needsImprovement: avgRating < IMPROVEMENT_THRESHOLD
        };
      });
    
    // Create data for improvement chart - sort by rating (ascending)
    const improvementData = [...formattedData]
      .sort((a, b) => a.value - b.value)
      .map(dept => ({
        ...dept,
        fillColor: dept.needsImprovement ? IMPROVEMENT_COLOR : GOOD_COLOR
      }));
    
    setDepartmentData(formattedData);
    setImprovementData(improvementData);
    setLoading(false);
    
    console.log('Real-time department ratings updated:', departmentData);
  };
  
  // Process feedback data into analytics metrics
  const processAnalyticsData = (feedbackData) => {
    // Get current date for today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count today's feedback
    const todayFeedback = feedbackData.filter(item => {
      if (!item.createdAt) return false;
      const feedbackDate = new Date(item.createdAt);
      feedbackDate.setHours(0, 0, 0, 0);
      return feedbackDate.getTime() === today.getTime();
    }).length;
    
    // Total feedback count
    const totalFeedback = feedbackData.length;
    
    // Calculate average rating (on 10 point scale)
    let totalRating = 0;
    let ratedItems = 0;
    
    feedbackData.forEach(item => {
      if (item.overallRating !== undefined && item.overallRating !== null) {
        totalRating += Number(item.overallRating);
        ratedItems++;
      }
    });
    
    const averageRating = ratedItems > 0 ? (totalRating / ratedItems).toFixed(1) : '0.0';
    
    // Generate monthly data for chart (all 12 months)
    const currentYear = today.getFullYear();
    
    // Initialize counts for all months
    const monthCounts = Array(12).fill(0);
    
    // Count feedback by month
    feedbackData.forEach(item => {
      if (item.createdAt) {
        const date = new Date(item.createdAt);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          monthCounts[month]++;
        }
      }
    });
    
    // Create chart data with all 12 months
    const monthlyTrends = monthNames.map((month, index) => ({
      month,
      count: monthCounts[index]
    }));
    
    // Set analytics state
    setAnalytics({
      todayFeedback,
      totalFeedback,
      averageRating,
      monthlyTrends
    });
    
    setLoading(false);
  };
  
  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up interval to refresh data every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 300000); // Refresh every 5 minutes (300,000 ms)
    
    return () => clearInterval(refreshInterval);
  }, [currentLanguage]); // Refetch when language changes

  const renderOverviewTab = () => (
    <div className="dashboard-cards">
      <div className="dashboard-card today-feedback">
        <div className="card-content">
          <h3>{t('todaysFeedback', "Today's Feedback")}</h3>
          <div className="card-value">{analytics?.todayFeedback || 0}</div>
        </div>
        <div className="card-icon">📬</div>
      </div>
      
      <div className="dashboard-card total-feedback">
        <div className="card-content">
          <h3>{t('totalFeedback', "Total Feedback")}</h3>
          <div className="card-value">{analytics?.totalFeedback || 0}</div>
        </div>
        <div className="card-icon">📋</div>
      </div>
      
      <div className="dashboard-card average-rating">
        <div className="card-content">
          <h3>{t('averageRating', "Average Rating")}</h3>
          <div className="card-value">{analytics?.averageRating || 0} / 10</div>
          <div className="rating-meter">
            <div 
              className="rating-meter-fill" 
              style={{ 
                width: `${(analytics?.averageRating / 10) * 100}%`,
                backgroundColor: getRatingColor(analytics?.averageRating) 
              }}
            ></div>
          </div>
        </div>
        <div className="card-icon">⭐</div>
      </div>
      
      <div className="trends-chart">
        <h3>{t('monthlyFeedbackTrends', "Monthly Feedback Trends")}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics?.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#0A2362" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Top Feedback Issues Donut Chart */}
      <div className="top-issues-chart">
        <h3>{t('departmentRatings', "Department Ratings")} <span className="real-time-indicator">• Auto-refresh</span></h3>
        <div className="donut-chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                innerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
                animationDuration={500} // Smoother transitions for real-time updates
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, {payload}) => [`Rating: ${value}/10 (${payload.count} feedbacks)`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="last-updated">
          Updated: {new Date().toLocaleTimeString()} (refreshes every 5 minutes)
        </div>
      </div>
      
      {/* Department Improvement Chart */}
    
    </div>
  );

  return (
    <div className="analytics-page">
      <h1>{t('feedbackAnalytics', 'Feedback Analytics')}</h1>

      <div className="analytics-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t('loadingAnalyticsData', 'Loading analytics data...')}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button 
              className="retry-button" 
              onClick={fetchAnalyticsData}
            >
              {t('retry', 'Try Again')}
            </button>
          </div>
        ) : (
          renderOverviewTab()
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
