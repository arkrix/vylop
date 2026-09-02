package com.vylop.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CodeExecutionService {

    private static final Logger log = LoggerFactory.getLogger(CodeExecutionService.class);

    private static final String WANDBOX_API_URL = "https://wandbox.org/api/compile.json";
    private static final String WANDBOX_LIST_URL = "https://wandbox.org/api/list.json";
    private static final String BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    private static final String LANG_PYTHON = "python";
    private static final String LANG_JAVASCRIPT = "javascript";
    private static final String LANG_TYPESCRIPT = "typescript";
    private static final String QUOTE_COMMA_QUOTE = "\", \"";

    private static final Pattern PUBLIC_CLASS_PATTERN = Pattern.compile("public\\s+class\\s+(\\w+)");
    private static final Pattern CLASS_PATTERN = Pattern.compile("class\\s+(\\w+)");
    private static final Pattern JAVA_CLASS_INSERT_PATTERN = Pattern.compile("(class\\s+\\w+\\s*\\{)");

    private static final Map<String, String> LANG_TO_WANDBOX = Map.of(
        "java", "Java",
        LANG_PYTHON, "Python",
        "cpp", "C++",
        "c++", "C++",
        LANG_JAVASCRIPT, "JavaScript",
        LANG_TYPESCRIPT, "TypeScript",
        "go", "Go",
        "rust", "Rust"
    );

    private static final Map<String, String> WANDBOX_FALLBACKS = Map.of(
        "Java", "openjdk-head",
        "Python", "cpython-head",
        "C++", "gcc-head",
        "JavaScript", "nodejs-head",
        "TypeScript", "typescript-head",
        "Go", "go-head",
        "Rust", "rust-head"
    );

    private final RestTemplate restTemplate;
    private final JsonParser springJsonParser;
    private final Map<String, String> compilerCache = new ConcurrentHashMap<>();

    public CodeExecutionService() {
        this.restTemplate = new RestTemplate();
        this.springJsonParser = JsonParserFactory.getJsonParser();
    }

    public String executeCode(String language, String code, String input, String mainFileName, Map<String, String> files, Map<String, String> envVars) {
        try {
            String compiler = getDynamicCompilerName(language);
            if (compiler == null) {
                return "Error: Language '" + language + "' is not supported by the sandbox.";
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("compiler", compiler);
            
            if (input != null && !input.isEmpty()) {
                requestBody.put("stdin", input);
            }

            List<Map<String, String>> extraFiles = new ArrayList<>();
            Map<String, String> dotEnv = createDotEnvFile(envVars);
            if (!dotEnv.isEmpty()) {
                extraFiles.add(dotEnv);
            }

            Map<String, String> compiledInjector = createCompiledEnvInjector(language, envVars);
            if (!compiledInjector.isEmpty()) {
                extraFiles.add(compiledInjector);
            }

            extraFiles.addAll(extractWorkspaceFiles(language, mainFileName, files));

            if (language.equalsIgnoreCase("java")) {
                setupJavaExecution(code, envVars, requestBody, extraFiles);
            } else {
                String preparedCode = injectScriptEnvironment(language, code, envVars);
                requestBody.put("code", preparedCode);
            }

            if (!extraFiles.isEmpty()) {
                requestBody.put("codes", extraFiles);
            }

            ResponseEntity<String> response = sendExecutionRequest(requestBody);
            return parseExecutionResponse(response);

        } catch (Exception e) {
            return "Sandbox Connection Error: Failed to reach remote execution engine. Details: " + e.getMessage();
        }
    }

    private Map<String, String> createDotEnvFile(Map<String, String> envVars) {
        if (envVars == null || envVars.isEmpty()) {
            return Collections.emptyMap();
        }
        StringBuilder dotenv = new StringBuilder();
        for (Map.Entry<String, String> env : envVars.entrySet()) {
            dotenv.append(env.getKey()).append("=").append(env.getValue()).append("\n");
        }
        Map<String, String> envFileObj = new HashMap<>();
        envFileObj.put("file", ".env");
        envFileObj.put("code", dotenv.toString());
        return envFileObj;
    }

    private String injectScriptEnvironment(String language, String code, Map<String, String> envVars) {
        if (envVars == null || envVars.isEmpty()) {
            return code;
        }
        if (language.equalsIgnoreCase(LANG_PYTHON)) {
            StringBuilder pyEnv = new StringBuilder("import os\n");
            for (Map.Entry<String, String> env : envVars.entrySet()) {
                pyEnv.append("os.environ['").append(env.getKey()).append("'] = '")
                     .append(env.getValue().replace("'", "\\'")).append("'\n");
            }
            return pyEnv.toString() + code;
        }
        if (language.equalsIgnoreCase(LANG_JAVASCRIPT) || language.equalsIgnoreCase(LANG_TYPESCRIPT)) {
            StringBuilder jsEnv = new StringBuilder();
            for (Map.Entry<String, String> env : envVars.entrySet()) {
                jsEnv.append("process.env['").append(env.getKey()).append("'] = '")
                     .append(env.getValue().replace("'", "\\'")).append("';\n");
            }
            return jsEnv.toString() + code;
        }
        return code;
    }

    private Map<String, String> createCompiledEnvInjector(String language, Map<String, String> envVars) {
        if (envVars == null || envVars.isEmpty()) {
            return Collections.emptyMap();
        }
        if (language.equalsIgnoreCase("go")) {
            StringBuilder goEnv = new StringBuilder("package main\nimport \"os\"\nfunc init() {\n");
            for (Map.Entry<String, String> env : envVars.entrySet()) {
                goEnv.append("    os.Setenv(\"").append(env.getKey()).append(QUOTE_COMMA_QUOTE)
                     .append(env.getValue().replace("\"", "\\\"")).append("\")\n");
            }
            goEnv.append("}\n");
            Map<String, String> envFileObj = new HashMap<>();
            envFileObj.put("file", "vylop_env_injector.go");
            envFileObj.put("code", goEnv.toString());
            return envFileObj;
        }
        if (language.equalsIgnoreCase("c") || language.equalsIgnoreCase("cpp") || language.equalsIgnoreCase("c++")) {
            StringBuilder cppEnv = new StringBuilder("#include <stdlib.h>\n__attribute__((constructor)) static void _vylop_set_env() {\n");
            for (Map.Entry<String, String> env : envVars.entrySet()) {
                cppEnv.append("    setenv(\"").append(env.getKey()).append(QUOTE_COMMA_QUOTE)
                      .append(env.getValue().replace("\"", "\\\"")).append("\", 1);\n");
            }
            cppEnv.append("}\n");
            Map<String, String> envFileObj = new HashMap<>();
            String ext = language.equalsIgnoreCase("c") ? ".c" : ".cpp";
            envFileObj.put("file", "vylop_env_injector" + ext);
            envFileObj.put("code", cppEnv.toString());
            return envFileObj;
        }
        return Collections.emptyMap();
    }

    private List<Map<String, String>> extractWorkspaceFiles(String language, String mainFileName, Map<String, String> files) {
        List<Map<String, String>> extraFiles = new ArrayList<>();
        if (files == null || files.isEmpty()) {
            return extraFiles;
        }
        for (Map.Entry<String, String> entry : files.entrySet()) {
            String fName = entry.getKey();
            if (!fName.equals(mainFileName) && isRelatedFile(fName, language)) {
                Map<String, String> fileObj = new HashMap<>();
                fileObj.put("file", fName);
                fileObj.put("code", entry.getValue());
                extraFiles.add(fileObj);
            }
        }
        return extraFiles;
    }

    private void setupJavaExecution(String code, Map<String, String> envVars, Map<String, Object> requestBody, List<Map<String, String>> extraFiles) {
        String actualClassName = extractJavaClassName(code);
        String finalCode = code;

        if (envVars != null && !envVars.isEmpty()) {
            StringBuilder javaEnv = new StringBuilder("static { ");
            for (Map.Entry<String, String> env : envVars.entrySet()) {
                javaEnv.append("System.setProperty(\"").append(env.getKey()).append(QUOTE_COMMA_QUOTE)
                       .append(env.getValue().replace("\"", "\\\"")).append("\"); ");
            }
            javaEnv.append("} ");
            finalCode = JAVA_CLASS_INSERT_PATTERN.matcher(finalCode).replaceFirst("$1 " + javaEnv);
        }

        String delegatorCode = "public class prog { public static void main(String[] args) throws Exception { " + actualClassName + ".main(args); } }";
        requestBody.put("code", delegatorCode);

        Map<String, String> mainFileObj = new HashMap<>();
        mainFileObj.put("file", actualClassName + ".java");
        mainFileObj.put("code", finalCode);
        extraFiles.add(mainFileObj);
    }

    private ResponseEntity<String> sendExecutionRequest(Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.USER_AGENT, BROWSER_USER_AGENT);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        return restTemplate.exchange(
                WANDBOX_API_URL,
                HttpMethod.POST,
                entity,
                String.class
        );
    }

    private String parseExecutionResponse(ResponseEntity<String> response) {
        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            return "Error: Sandbox API returned an unexpected response.";
        }

        Map<String, Object> body = springJsonParser.parseMap(response.getBody());
        String status = String.valueOf(body.getOrDefault("status", "1"));
        String programMessage = (String) body.getOrDefault("program_message", "");
        String compilerMessage = (String) body.getOrDefault("compiler_message", "");

        if (!"0".equals(status)) {
            return !compilerMessage.isEmpty() ? "Compilation Error:\n" + compilerMessage : "Runtime Error:\n" + programMessage;
        }

        return programMessage.isEmpty() ? compilerMessage : programMessage;
    }

    String extractJavaClassName(String code) {
        Matcher matcher = PUBLIC_CLASS_PATTERN.matcher(code);
        if (matcher.find()) {
            return matcher.group(1);
        }

        Matcher fallbackMatcher = CLASS_PATTERN.matcher(code);
        if (fallbackMatcher.find()) {
            return fallbackMatcher.group(1);
        }

        return "Main";
    }

    boolean isRelatedFile(String fileName, String language) {
        if (fileName == null) return false;
        String lower = fileName.toLowerCase();
        switch (language.toLowerCase()) {
            case "java": return lower.endsWith(".java");
            case LANG_PYTHON: return lower.endsWith(".py");
            case "cpp", "c++": return lower.endsWith(".cpp") || lower.endsWith(".c") || lower.endsWith(".h") || lower.endsWith(".hpp");
            case LANG_JAVASCRIPT: return lower.endsWith(".js");
            case LANG_TYPESCRIPT: return lower.endsWith(".ts");
            case "go": return lower.endsWith(".go");
            case "rust": return lower.endsWith(".rs");
            default: return true;
        }
    }

    private String getDynamicCompilerName(String frontendLang) {
        String wandboxLang = LANG_TO_WANDBOX.get(frontendLang.toLowerCase());
        if (wandboxLang == null) {
            return null;
        }

        if (compilerCache.containsKey(wandboxLang)) {
            return compilerCache.get(wandboxLang);
        }

        String remoteCompiler = fetchRemoteCompiler(wandboxLang);
        if (remoteCompiler != null) {
            compilerCache.put(wandboxLang, remoteCompiler);
            return remoteCompiler;
        }

        return WANDBOX_FALLBACKS.get(wandboxLang);
    }

    private String fetchRemoteCompiler(String wandboxLang) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.USER_AGENT, BROWSER_USER_AGENT);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    WANDBOX_LIST_URL,
                    HttpMethod.GET,
                    entity,
                    String.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return findCompilerInList(response.getBody(), wandboxLang);
            }
        } catch (Exception e) {
            log.warn("Could not dynamically fetch compilers: {}", e.getMessage());
        }
        return null;
    }

    private String findCompilerInList(String responseBody, String wandboxLang) {
        List<Object> compilers = springJsonParser.parseList(responseBody);
        String selectedName = null;
        
        for (Object obj : compilers) {
            @SuppressWarnings("unchecked")
            Map<String, Object> compiler = (Map<String, Object>) obj;
            
            if (wandboxLang.equalsIgnoreCase((String) compiler.get("language"))) {
                String name = (String) compiler.get("name");
                selectedName = name; 
                
                if (!name.contains("head")) {
                    return selectedName; 
                }
            }
        }
        return selectedName;
    }
}