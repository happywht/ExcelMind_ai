// Test parentheses in the problematic expression
const excelData: any = {
  sheets: {
    test: [{ name: 'test' }]
  },
  currentSheetName: 'test'
};

// This is the expression from line 815
const result = Object.keys(excelData.sheets[excelData.currentSheetName]?.[0] || {});

console.log(result);
