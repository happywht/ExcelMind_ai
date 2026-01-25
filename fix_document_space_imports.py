# -*- coding: utf-8 -*-
import sys
import re

# Read the file
with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the imports - remove all the erroneously added GenerationMode imports
# Replace the broken import section with correct imports

old_imports = '''import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  readExcelFile
} from '../../services/excelService';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  createTemplateFile,
  highlightPlaceholdersInHtml
} from '../../services/templateService';
import {  GenerationMode,  AggregateConfig,  AggregateRule, generateFieldMappingV2, generateFieldMapping } from '../../services/documentMappingService';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  DocxtemplaterService
} from '../../services/docxtemplaterService';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  downloadDocument,
  downloadDocumentsAsZip
} from '../../services/docxGeneratorService';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  FewShotEngine
} from '../../services/ai/fewShotEngine';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  allQueryExamples
} from '../../services/ai/queryExamples';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  AIOutputValidator
} from '../../services/quality';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  PerformanceTracker,
  recordMetric,
  initPerformanceMonitoring
} from '../../services/monitoring';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
import {  GenerationMode,  AggregateConfig} from '../../types/documentTypes';
  TemplateFile,
import {  executeAggregate,  inferAggregateConfig,  validateAggregateConfig} from '../../services/aggregateService';
  MappingScheme,
  GeneratedDocument,
  DocumentProcessingLog,
  SheetInfo
} from '../../types/documentTypes';
import {  GenerationMode,  AggregateConfig,  AggregateRule,
  DocumentSpaceState,
  DocumentSpaceTab,
  PerformanceMetrics
} from './types';'''

new_imports = '''import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  readExcelFile
} from '../../services/excelService';
import {
  createTemplateFile,
  highlightPlaceholdersInHtml
} from '../../services/templateService';
import { generateFieldMappingV2, generateFieldMapping } from '../../services/documentMappingService';
import {
  DocxtemplaterService
} from '../../services/docxtemplaterService';
import {
  downloadDocument,
  downloadDocumentsAsZip
} from '../../services/docxGeneratorService';
import {
  FewShotEngine
} from '../../services/ai/fewShotEngine';
import {
  allQueryExamples
} from '../../services/ai/queryExamples';
import {
  AIOutputValidator
} from '../../services/quality';
import {
  PerformanceTracker,
  recordMetric,
  initPerformanceMonitoring
} from '../../services/monitoring';
import {
  GenerationMode,
  AggregateConfig
} from '../../types/documentTypes';
import {
  TemplateFile,
  MappingScheme,
  GeneratedDocument,
  DocumentProcessingLog,
  SheetInfo
} from '../../types/documentTypes';
import {
  DocumentSpaceState,
  DocumentSpaceTab,
  PerformanceMetrics
} from './types';'''

if old_imports in content:
    content = content.replace(old_imports, new_imports)
    print("Fixed imports successfully")
else:
    # Try line by line replacement
    lines = content.split('\n')
    new_lines = []
    skip_until_types = False
    in_import_block = False

    for i, line in enumerate(lines):
        # Skip lines with erroneously added imports
        if 'import {  GenerationMode,  AggregateConfig' in line:
            # Extract the actual import (after the erroneous part)
            match = re.search(r'} from (.+);', line)
            if match:
                source = match.group(1)
                # Check if this is the documentTypes import (special case)
                if 'documentTypes' in source:
                    # We'll handle this specially
                    continue

        # Fix broken documentTypes import
        if "import {  GenerationMode,  AggregateConfig} from '../../types/documentTypes';" in line:
            line = "} from '../../types/documentTypes';"
            skip_until_types = True
        elif skip_until_types:
            if "} from '../../types/documentTypes';" in line:
                skip_until_types = False
            continue

        # Fix other broken imports
        if line.strip().startswith('import {  GenerationMode,  AggregateConfig,  AggregateRule,'):
            # Extract what's actually being imported
            match = re.search(r'AggregateRule,(.+?) from', line)
            if match:
                actual_imports = match.group(1).strip()
                line = f"import {{ {actual_imports} }} from '..."
        new_lines.append(line)

    content = '\n'.join(new_lines)
    print("Tried line-by-line fix")

# Write back
with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Import fix complete!")
