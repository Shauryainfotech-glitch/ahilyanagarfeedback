import React from 'react';
import '../../styles/AnalyticsPage.css';

const SentimentPage = () => {
  // Sample data
  const data = [
    {
      id: 1,
      name: 'John Doe',
      mobile: '9876543210',
      description: 'Customer complaint about product quality'
    },
    {
      id: 2,
      name: 'Jane Smith',
      mobile: '8765432109',
      description: 'Service delivery delay issue'
    },
    {
      id: 3,
      name: 'Robert Johnson',
      mobile: '7654321098',
      description: 'Billing discrepancy complaint'
    },
  ];

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="data-table">
          {/* Table Header */}
          <thead className="table-header">
            <tr>
              <th className="header-cell">SR No</th>
              <th className="header-cell">Name</th>
              <th className="header-cell">Mobile No</th>
              <th className="header-cell">Description</th>
              <th className="header-cell">Actions</th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="table-body">
            {data.map((item) => (
              <tr key={item.id} className="table-row">
                <td className="table-cell">{item.id}</td>
                <td className="table-cell">{item.name}</td>
                <td className="table-cell">{item.mobile}</td>
                <td className="table-cell description-cell">{item.description}</td>
                <td className="table-cell actions-cell">
                  <div className="button-group">
                    <button
                      className="primary-button"
                      onClick={() => console.log('View Sentiment', item.id)}
                    >
                      View Sentiment
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => console.log('View Corrective Measures', item.id)}
                    >
                      View Corrective
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="empty-state">
          <p className="empty-text">No data available</p>
        </div>
      )}
    </div>
  );
};

export default SentimentPage;