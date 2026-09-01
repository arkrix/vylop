/**
 * Maps error severities to UI diagnostic colors.
 */
export const getSeverityColor = (severity) => {
    if (severity === 'error') return '#f87171';
    if (severity === 'warning') return '#fbbf24';
    return '#38bdf8';
};

/**
 * Resolves raw file names/paths from compiler error logs against workspace files.
 */
export const resolveFileName = (rawFile, files = {}) => {
    if (!rawFile) return rawFile;
    if (files[rawFile]) return rawFile;

    const cleaned = rawFile.replace(/^\.\//, '').replace(/^\//, '');
    if (files[cleaned]) return cleaned;

    const fileKeys = Object.keys(files);
    const match = fileKeys.find((f) => 
        f.endsWith(`/${cleaned}`) || f.endsWith(`\\${cleaned}`) || f === cleaned
    );
    if (match) return match;

    const baseName = cleaned.split('/').pop()?.split('\\').pop();
    const baseMatch = fileKeys.find((f) => f.split('/').pop()?.split('\\').pop() === baseName);
    return baseMatch || rawFile;
};

const parseSeverity = (raw = '') => {
    const lower = raw.toLowerCase();
    if (lower.includes('warn')) return 'warning';
    if (lower.includes('note') || lower.includes('info')) return 'info';
    return 'error';
};

const safeParseInt = (val, fallback = 1) => {
    const parsed = Number.parseInt(val, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Parses GCC, Clang, and Java compiler error outputs deterministically without regex backtracking.
 */
const parseCompilerOrGcc = (line, files) => {
    if (!line?.includes(':')) return null;

    const colonIdx1 = line.indexOf(':');
    if (colonIdx1 <= 0) return null;

    const rawFile = line.slice(0, colonIdx1).trim();
    const rest = line.slice(colonIdx1 + 1);
    const colonIdx2 = rest.indexOf(':');
    if (colonIdx2 <= 0) return null;

    const lineStr = rest.slice(0, colonIdx2).trim();
    const lineNum = Number.parseInt(lineStr, 10);
    if (Number.isNaN(lineNum)) return null;

    const afterLine = rest.slice(colonIdx2 + 1);
    const colonIdx3 = afterLine.indexOf(':');

    let colNum = 1;
    let sevAndMsg = afterLine;

    if (colonIdx3 > 0) {
        const potentialCol = afterLine.slice(0, colonIdx3).trim();
        const parsedCol = Number.parseInt(potentialCol, 10);
        if (!Number.isNaN(parsedCol)) {
            colNum = parsedCol;
            sevAndMsg = afterLine.slice(colonIdx3 + 1);
        }
    }

    const colonIdxMsg = sevAndMsg.indexOf(':');
    let rawSev = 'error';
    let message = sevAndMsg.trim();

    if (colonIdxMsg > 0) {
        const potentialSev = sevAndMsg.slice(0, colonIdxMsg).trim().toLowerCase();
        if (potentialSev.includes('error') || potentialSev.includes('warn') || potentialSev.includes('note') || potentialSev.includes('info')) {
            rawSev = potentialSev;
            message = sevAndMsg.slice(colonIdxMsg + 1).trim();
        }
    }

    if (!message) return null;

    return {
        fileName: resolveFileName(rawFile, files),
        line: lineNum,
        col: colNum,
        severity: parseSeverity(rawSev),
        message
    };
};

/**
 * Parses Python tracebacks.
 */
const parsePython = (lines, index, files) => {
    const line = lines[index];
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('File "')) return null;

    const quoteEnd = trimmed.indexOf('"', 6);
    if (quoteEnd === -1) return null;

    const rawFile = trimmed.slice(6, quoteEnd);
    const afterFile = trimmed.slice(quoteEnd + 1);

    const lineKeywordIdx = afterFile.indexOf('line ');
    if (lineKeywordIdx === -1) return null;

    const lineNumStr = afterFile.slice(lineKeywordIdx + 5).trimStart().split(/[\s,]/)[0];
    const lineNum = safeParseInt(lineNumStr, 1);

    let errorMsg = "Python Runtime Exception";
    const maxScan = Math.min(index + 4, lines.length);

    for (let j = index + 1; j < maxScan; j += 1) {
        const candidate = lines[j].trim();
        if (candidate && !candidate.startsWith('File ') && !candidate.startsWith('^')) {
            errorMsg = candidate;
        }
    }

    return {
        fileName: resolveFileName(rawFile, files),
        line: lineNum,
        col: 1,
        severity: 'error',
        message: errorMsg
    };
};

/**
 * Parses Node.js / JavaScript runtime stack frames.
 */
const parseJavaScript = (lines, index, files) => {
    const line = lines[index];
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('at ')) return null;

    const lastColon = trimmed.lastIndexOf(':');
    if (lastColon === -1) return null;

    const secondLastColon = trimmed.lastIndexOf(':', lastColon - 1);
    if (secondLastColon === -1) return null;

    let colStr = trimmed.slice(lastColon + 1);
    if (colStr.endsWith(')')) {
        colStr = colStr.slice(0, -1);
    }
    const colNum = safeParseInt(colStr, 1);

    const lineStr = trimmed.slice(secondLastColon + 1, lastColon);
    const lineNum = safeParseInt(lineStr, 1);

    let filePart = trimmed.slice(0, secondLastColon);
    const openParen = filePart.lastIndexOf('(');
    if (openParen !== -1) {
        filePart = filePart.slice(openParen + 1);
    } else {
        const atIdx = filePart.indexOf('at ');
        filePart = filePart.slice(atIdx + 3).trim();
    }
    const rawFile = filePart.trim();
    if (!rawFile) return null;

    let errorMsg = lines[0] ? lines[0].trim() : "JavaScript Exception";
    if (errorMsg.startsWith("at ")) errorMsg = "Runtime Exception";

    return {
        fileName: resolveFileName(rawFile, files),
        line: lineNum,
        col: colNum,
        severity: 'error',
        message: errorMsg
    };
};

/**
 * Parses Rust compiler diagnostics.
 */
const parseRust = (lines, index, files) => {
    const line = lines[index];
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('-->')) return null;

    const rest = trimmed.slice(3).trim();
    const parts = rest.split(':');
    if (parts.length < 3) return null;

    const rawFile = parts[0].trim();
    const lineNum = safeParseInt(parts[1], 1);
    const colNum = safeParseInt(parts[2], 1);
    const prevLine = index > 0 ? lines[index - 1].trim() : "Rust Compiler Error";

    return {
        fileName: resolveFileName(rawFile, files),
        line: lineNum,
        col: colNum,
        severity: 'error',
        message: prevLine
    };
};

/**
 * Parses execution/compiler output into structured editor diagnostics.
 */
export const parseErrors = (outputText, language, files = {}) => {
    if (!outputText || typeof outputText !== 'string') return [];

    const lines = outputText.split(/\r?\n/);
    const diagnostics = [];

    for (let i = 0; i < lines.length; i += 1) {
        const diag = 
            parseCompilerOrGcc(lines[i], files) ||
            parsePython(lines, i, files) ||
            parseJavaScript(lines, i, files) ||
            parseRust(lines, i, files);

        if (diag) {
            diagnostics.push(diag);
        }
    }

    return diagnostics;
};