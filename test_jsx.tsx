import React from 'react';

interface TestProps {
  enabledSheets: string[];
  availableFields: string[];
  generationMode: string;
}

export const TestComponent: React.FC<TestProps> = ({ enabledSheets, availableFields, generationMode }) => {
  return (
    <div>
      <TestComponent
        enabledSheets={enabledSheets}
        availableFields={availableFields}
        generationMode={generationMode}
      />
    </div>
  );
};
