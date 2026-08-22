export const API_BASE_URL = 'http://localhost:8080';

export const CODE_SNIPPETS = {
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read inputs here...\n    }\n}`,
    python: `import sys\n\ndef main():\n    # Read inputs from sys.stdin.read().split()\n    pass\n\nif __name__ == "__main__":\n    main()`,
    cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Read inputs here...\n    return 0;\n}`,
    javascript: `const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\n\n// Read inputs here...`,
    typescript: `// Welcome to Vylop!\n\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);`,
    go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Read inputs here...\n}`,
    rust: `use std::io;\n\nfn main() {\n    // Read inputs here...\n}`,
    markdown: `# Welcome to Vylop!\n\nStart writing your markdown here...\n\n- Real-time collaboration\n- Live preview\n- Awesome features` 
};

export const MOCK_PROBLEMS = {
    "two-sum": {
        id: "two-sum",
        title: "1. Two Sum",
        difficulty: "Easy",
        topic: "Arrays & Hashing",
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n---\n**I/O Format (CodeChef Style):**\nLine 1: `N` (Size of array)\nLine 2: `N` space-separated integers\nLine 3: `target`",
        testcases: [
            { id: 1, name: "Case 1", displayInput: "nums = [2,7,11,15]\ntarget = 9", rawInput: "4\n2 7 11 15\n9", expectedOutput: "[0,1]" },
            { id: 2, name: "Case 2", displayInput: "nums = [3,2,4]\ntarget = 6", rawInput: "3\n3 2 4\n6", expectedOutput: "[1,2]" },
            { id: 3, name: "Case 3", displayInput: "nums = [3,3]\ntarget = 6", rawInput: "2\n3 3\n6", expectedOutput: "[0,1]" }
        ],
        constraints: [
            "2 <= nums.length <= 10^4", 
            "-10^9 <= nums[i] <= 10^9", 
            "-10^9 <= target <= 10^9", 
            "Only one valid answer exists."
        ]
    },
    "valid-parentheses": {
        id: "valid-parentheses",
        title: "20. Valid Parentheses",
        difficulty: "Easy",
        topic: "Stack",
        description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n---\n**I/O Format:**\nLine 1: The string `s`",
        testcases: [
            { id: 1, name: "Case 1", displayInput: "s = \"()\"", rawInput: "()", expectedOutput: "true" },
            { id: 2, name: "Case 2", displayInput: "s = \"()[]{}\"", rawInput: "()[]{}", expectedOutput: "true" },
            { id: 3, name: "Case 3", displayInput: "s = \"(]\"", rawInput: "(]", expectedOutput: "false" }
        ],
        constraints: [
            "1 <= s.length <= 10^4", 
            "s consists of parentheses only '()[]{}'."
        ]
    },
    "climbing-stairs": {
        id: "climbing-stairs",
        title: "70. Climbing Stairs",
        difficulty: "Medium",
        topic: "Dynamic Programming",
        description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n---\n**I/O Format:**\nLine 1: An integer `n`",
        testcases: [
            { id: 1, name: "Case 1", displayInput: "n = 2", rawInput: "2", expectedOutput: "2" },
            { id: 2, name: "Case 2", displayInput: "n = 3", rawInput: "3", expectedOutput: "3" },
            { id: 3, name: "Case 3", displayInput: "n = 5", rawInput: "5", expectedOutput: "8" }
        ],
        examples: [
            { input: "n = 2", output: "2", explanation: "1. 1 step + 1 step\n2. 2 steps" },
            { input: "n = 3", output: "3", explanation: "1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step" }
        ],
        constraints: [
            "1 <= n <= 45"
        ]
    }
};

export const CURSOR_COLORS = [
    '#FF007F', '#00E5FF', '#FFD700', '#00FF00', 
    '#9D00FF', '#FF7F50', '#00BFFF', '#FF1493'
];

export const getExtension = (lang) => {
    const map = { 
        java: 'java', python: 'py', cpp: 'cpp', javascript: 'js', 
        typescript: 'ts', go: 'go', rust: 'rs', markdown: 'md' 
    };
    return map[lang] || 'txt';
};

export const getLanguageFromExtension = (fileName) => {
    const ext = fileName.split('.').pop();
    const map = { 
        java: 'java', py: 'python', cpp: 'cpp', js: 'javascript', 
        ts: 'typescript', go: 'go', rs: 'rust', md: 'markdown' 
    };
    return map[ext] || 'plaintext';
};