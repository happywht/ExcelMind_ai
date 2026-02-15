import pandas as pd
import numpy as np
import os
# Create a directory for test files
os.makedirs('stress_test', exist_ok=True)
# 1. File A: Dirty Orders (Type Mismatch & Missing Values)
orders_data = {
    'OrderID': ['1001', 1002, '1003', '1004', 1005], # Mixed types
    'CustomerID': [1, 2, 99, 3, 4], # ID 99 doesn't exist in customers
    'Amount': [100.5, 200, np.nan, 450, 50]
}
pd.DataFrame(orders_data).to_excel('stress_test/dirty_orders.xlsx', index=False)
# 2. File B: Customer Dimension (Normal)
cust_data = {
    'CustomerID': [1, 2, 3, 4],
    'Name': ['Alice', 'Bob', 'Charlie', 'David'],
    'Region': ['North', 'South', 'North', 'West']
}
pd.DataFrame(cust_data).to_excel('stress_test/customers.xlsx', index=False)
# 3. File C: Hidden Sheets (Sniffing Test)
with pd.ExcelWriter('stress_test/hidden_sniff.xlsx') as writer:
    pd.DataFrame({'Empty': []}).to_excel(writer, sheet_name='Sheet1')
    pd.DataFrame({'Trash': [1, 2, 3]}).to_excel(writer, sheet_name='Metadata_Old')
    pd.DataFrame({'Category': ['A', 'B'], 'Sales': [1000, 2000]}).to_excel(writer, sheet_name='REAL_SALES_DATA_2026')
print("Stress test files generated in ./stress_test/")