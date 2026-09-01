import axios from 'axios';

const API_BASE_URL = 'https://vylop.onrender.com';

/**
 * Runs the code against all test cases for a given problem.
 */
export const evaluateSubmission = async (problem, activeFile, language, code, fileData, envVars) => {
    if (!problem?.testcases?.length) {
        return {
            status: 'ERROR',
            passedCount: 0,
            totalCases: 0,
            runtimeMs: 0,
            message: 'No test cases defined for this problem.'
        };
    }

    let passedCount = 0;
    const totalCases = problem.testcases.length;
    const startTime = performance.now();
    let failedCase = null;
    let actualFailOutput = "";

    for (const tc of problem.testcases) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/execute`,
                {
                    language,
                    code,
                    input: tc.rawInput ?? tc.input ?? "",
                    mainFile: activeFile,
                    files: fileData,
                    envVars
                },
                { transformResponse: [(data) => data] }
            );

            const output = (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).trim();
            const expected = String(tc.expectedOutput ?? tc.output ?? "").trim();

            if (output === expected) {
                passedCount += 1;
            } else {
                failedCase = tc;
                actualFailOutput = output;
                break;
            }
        } catch (error) {
            console.debug("Testcase execution runtime/network failure:", error);
            failedCase = tc;
            actualFailOutput = error.response?.data ? String(error.response.data) : (error.message || "Runtime Error");
            break;
        }
    }

    const endTime = performance.now();
    const runtimeMs = Math.round(endTime - startTime);

    if (passedCount === totalCases) {
        return {
            status: 'ACCEPTED',
            passedCount,
            totalCases,
            runtimeMs,
            failedCase: null,
            actualFailOutput: ""
        };
    }

    return {
        status: 'WRONG_ANSWER',
        passedCount,
        totalCases,
        runtimeMs,
        failedCase,
        actualFailOutput
    };
};