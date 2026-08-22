export const resolveFileName = (rawFile, files) => {
    if (!rawFile) return rawFile;
    if (files[rawFile]) return rawFile;
    
    const cleaned = rawFile.replace(/^\.\//, '').replace(/^\//, '');
    if (files[cleaned]) return cleaned;
    
    const match = Object.keys(files).find(f => 
        f.endsWith('/' + cleaned) || f.endsWith('\\' + cleaned) || f === cleaned
    );
    return match || rawFile;
};

export const parseJavaErrors = (output, files) => {
    const errors = [];
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const regex = /([a-zA-Z0-9_/\\.-]+\.java):(\d+):\s*(error|warning):\s*(.+)/g;
    let match;
    while ((match = regex.exec(strOutput)) !== null) {
        errors.push({ 
            fileName: resolveFileName(match[1], files), 
            line: parseInt(match[2], 10), 
            col: 1, 
            message: match[4].trim(), 
            severity: match[3] === 'error' ? 'error' : 'warning' 
        });
    }
    return errors;
};

export const parsePythonErrors = (output, files) => {
    const errors = [];
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const regex = /File "([^"]+)",\s*line\s*(\d+)/g;
    const msgRegex = /^(\w+Error|\w+Exception):\s*(.+)/m;
    let match;
    while ((match = regex.exec(strOutput)) !== null) {
        const msgMatch = strOutput.slice(match.index).match(msgRegex);
        errors.push({ 
            fileName: resolveFileName(match[1], files), 
            line: parseInt(match[2], 10), 
            col: 1, 
            message: msgMatch ? `${msgMatch[1]}: ${msgMatch[2]}` : 'Error', 
            severity: 'error' 
        });
    }
    return errors;
};

export const parseCppErrors = (output, files) => {
    const errors = [];
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const regex = /([a-zA-Z0-9_/\\.-]+\.(?:cpp|cc|h|hpp)):(\d+):(\d+):\s*(error|warning|note):\s*(.+)/g;
    let match;
    while ((match = regex.exec(strOutput)) !== null) {
        errors.push({ 
            fileName: resolveFileName(match[1], files), 
            line: parseInt(match[2], 10), 
            col: parseInt(match[3], 10), 
            message: match[5].trim(), 
            severity: match[4] === 'error' ? 'error' : match[4] === 'warning' ? 'warning' : 'info' 
        });
    }
    return errors;
};

export const parseGoErrors = (output, files) => {
    const errors = [];
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const regex = /\.?\/?([\w/.-]+\.go):(\d+):(\d+):\s*(.+)/g;
    let match;
    while ((match = regex.exec(strOutput)) !== null) {
        errors.push({ 
            fileName: resolveFileName(match[1], files), 
            line: parseInt(match[2], 10), 
            col: parseInt(match[3], 10), 
            message: match[4].trim(), 
            severity: 'error' 
        });
    }
    return errors;
};

export const parseRustErrors = (output, files) => {
    const errors = [];
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const regex = /-+>\s*([\w/.-]+\.rs):(\d+):(\d+)/g;
    const msgRegex = /^(error|warning)(\[[\w]+\])?:\s*(.+)/m;
    let match;
    while ((match = regex.exec(strOutput)) !== null) {
        const before = strOutput.slice(Math.max(0, match.index - 200), match.index);
        const msgMatch = before.match(msgRegex);
        errors.push({ 
            fileName: resolveFileName(match[1], files), 
            line: parseInt(match[2], 10), 
            col: parseInt(match[3], 10), 
            message: msgMatch ? msgMatch[3].trim() : 'Error', 
            severity: msgMatch?.[1] === 'warning' ? 'warning' : 'error' 
        });
    }
    return errors;
};

export const parseErrors = (output, language, files) => {
    if (!output || output === 'Running...') return [];
    
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);
    const hasError = /(error|exception|traceback|failed|undefined|cannot|no such|warning)/i.test(strOutput);
    if (!hasError) return [];
    
    switch (language) {
        case 'java': return parseJavaErrors(strOutput, files);
        case 'python': return parsePythonErrors(strOutput, files);
        case 'cpp': return parseCppErrors(strOutput, files);
        case 'go': return parseGoErrors(strOutput, files);
        case 'rust': return parseRustErrors(strOutput, files);
        default: return [];
    }
};

export const getSeverityColor = (severity) => {
    if (severity === 'error') return '#ff6b6b';
    if (severity === 'warning') return '#f0883e';
    return '#58a6ff';
};