import React from 'react';

const TestComponent = () => {
  const excelData = {
    sheets: {
      test: [{ name: 'test' }]
    },
    currentSheetName: 'test'
  };

  return (
    <div>
      {Object.keys(excelData.sheets[excelData.currentSheetName]?.[0] || {})}
    </div>
  );
};

export default TestComponent;
