/**
 * DataMasker Verification Script
 * Run with ts-node or similar to verify masking logic.
 */
import { DataMasker } from './maskerService';

const masker = new DataMasker();

const testCases = [
    {
        name: "Standard Chinese Name Masking",
        input: "请核对张三和李四的账目。",
        expectedContains: ["ENTITY_001", "ENTITY_002"],
        expectedNotContains: ["张三", "李四"]
    },
    {
        name: "Preserving Accounting Keywords",
        input: "本月合计金额为1200元，凭证名称为发票。",
        expectedContains: ["合计", "金额", "1200", "名称", "发票"]
    },
    {
        name: "Context Masking (JSON)",
        input_json: [
            { name: "张三", amount: 500, note: "往来款项" },
            { name: "王五", amount: -100, note: "退货处理" }
        ]
    }
];

console.log("--- STARTING DATA MASKER VERIFICATION ---");

// Test 1: String Masking
console.log("\n[Test 1] String Masking & Unmasking:");
const s1 = "张三在李四的公司里借了5000元。";
const masked1 = masker.mask(s1);
const unmasked1 = masker.unmask("AI 说：ENTITY_001 在 ENTITY_002 的公司里借了 5000 元。");

console.log("Original:", s1);
console.log("Masked:", masked1);
console.log("Unmasked Explanation:", unmasked1);

// Test 2: Context Masking
console.log("\n[Test 2] Context (Sample Data) Masking:");
const sampleData = [
    { "姓名": "张三", "金额": 1000, "摘要": "工资发放" },
    { "姓名": "李四", "金额": 2000, "摘要": "差旅报销" }
];
const maskedContext = masker.maskContext({ sample: sampleData });
console.log("Original JSON:", JSON.stringify(sampleData, null, 2));
console.log("Masked JSON:", JSON.stringify(maskedContext, null, 2));

console.log("\n--- VERIFICATION COMPLETE ---");
