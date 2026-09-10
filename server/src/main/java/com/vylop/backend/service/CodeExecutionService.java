package com.vylop.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CodeExecutionService {

    private static final Logger log = LoggerFactory.getLogger(CodeExecutionService.class);

    private static final String LANG_PYTHON = "python";
    private static final String LANG_JAVASCRIPT = "javascript";
    private static final String LANG_TYPESCRIPT = "typescript";
    private static final String QUOTE_COMMA_QUOTE = "\", \"";

    private static final Pattern PUBLIC_CLASS_PATTERN = Pattern.compile("public\\s+class\\s+(\\w+)");
    private static final Pattern CLASS_PATTERN = Pattern.compile("class\\s+(\\w+)");
    private static final Pattern JAVA_CLASS_INSERT_PATTERN = Pattern.compile("(class\\s+\\w+\\s*\\{)");

    private static final Map<String, String> LANG_ALIASES = Map.ofEntries(
        Map.entry("python", "python"),
        Map.entry("py", "python"),
        Map.entry("javascript", "javascript"),
        Map.entry("js", "javascript"),
        Map.entry("node", "javascript"),
        Map.entry("c", "c"),
        Map.entry("cpp", "c++"),
        Map.entry("c++", "c++"),
        Map.entry("gcc", "c++"),
        Map.entry("java", "java"),
        Map.entry("go", "go"),
        Map.entry("rust", "rust")
    );

    @Value("${PISTON_URL:${piston.url:http://piston:2000/api/v2}}")
    private String pistonUrl;

    private final RestTemplate restTemplate;
    private final JsonParser springJsonParser;

    public CodeExecutionService() {
        this.restTemplate = new RestTemplate();
        this.springJsonParser = JsonParserFactory.getJsonParser();
    }

    public String executeCode(String language, String code, String stdin, String mainFileName, Map<String, String> files, Map<String, String> envVars) {
        try {
            String resolvedLang = LANG_ALIASES.getOrDefault(language.toLowerCase().trim(), language.toLowerCase().trim());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("language", resolvedLang);
            requestBody.put("version", "*");

            if (stdin != null && !stdin.isEmpty()) {
                requestBody.put("stdin", stdin);
            }

            // 1. Prepare virtual file array for Piston sandbox
            List<Map<String, String>> fileList = new ArrayList<>();
            String primaryFilename = determineMainFilename(resolvedLang, code, mainFileName);

            // 2. Prepare Code with Language-Specific Environment Injection
            String preparedCode;
            if ("java".equalsIgnoreCase(resolvedLang)) {
                preparedCode = injectJavaEnvironment(code, envVars);
            } else {
                preparedCode = injectScriptEnvironment(resolvedLang, code, envVars);
            }

            Map<String, String> primaryFile = new HashMap<>();
            primaryFile.put("name", primaryFilename);
            primaryFile.put("content", preparedCode);
            fileList.add(primaryFile);

            // 3. Inject Compiled Language Environment Files (.env / wrappers)
            Map<String, String> dotEnv = createDotEnvFile(envVars);
            if (!dotEnv.isEmpty()) {
                fileList.add(dotEnv);
            }

            Map<String, String> compiledInjector = createCompiledEnvInjector(resolvedLang, envVars);
            if (!compiledInjector.isEmpty()) {
                fileList.add(compiledInjector);
            }

            // 4. Attach Related Multi-File Workspace Assets
            fileList.addAll(extractWorkspaceFiles(resolvedLang, primaryFilename, files));

            requestBody.put("files", fileList);

            return sendPistonRequest(requestBody);

        } catch (Exception e) {
            log.error("Piston Sandbox Execution Failed: {}", e.getMessage());
            return "Execution Sandbox Error: " + e.getMessage();
        }
    }

    private String sendPistonRequest(Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String endpoint = pistonUrl.endsWith("/") ? pistonUrl + "execute" : pistonUrl + "/execute";

        ResponseEntity<String> response = restTemplate.exchange(
                endpoint,
                HttpMethod.POST,
                entity,
                String.class
        );

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            return "Error: Sandbox returned status " + response.getStatusCode();
        }

        return parsePistonResponse(response.getBody());
    }

    private String parsePistonResponse(String responseBody) {
        Map<String, Object> root = springJsonParser.parseMap(responseBody);

        // Check if there was a compilation stage failure (C++, Java, Go, Rust)
        if (root.containsKey("compile")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> compile = (Map<String, Object>) root.get("compile");
            int compileCode = ((Number) compile.getOrDefault("code", 0)).intValue();
            String compileStderr = (String) compile.getOrDefault("stderr", "");
            String compileOutput = (String) compile.getOrDefault("output", "");

            if (compileCode != 0) {
                return !compileStderr.isBlank() ? "Compilation Error:\n" + compileStderr : "Compilation Error:\n" + compileOutput;
            }
        }

        // Parse execution run output
        if (root.containsKey("run")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> run = (Map<String, Object>) root.get("run");
            String stdout = (String) run.getOrDefault("stdout", "");
            String stderr = (String) run.getOrDefault("stderr", "");
            String output = (String) run.getOrDefault("output", "");
            int exitCode = ((Number) run.getOrDefault("code", 0)).intValue();

            if (exitCode != 0 && !stderr.isBlank()) {
                return stdout.isBlank() ? "Runtime Error:\n" + stderr : stdout + "\nRuntime Error:\n" + stderr;
            }

            return !output.isBlank() ? output : (stdout + stderr);
        }

        if (root.containsKey("message")) {
            return "Sandbox Error: " + root.get("message");
        }

        return responseBody;
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
        envFileObj.put("name", ".env");
        envFileObj.put("content", dotenv.toString());
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

    private String injectJavaEnvironment(String code, Map<String, String> envVars) {
        if (envVars == null || envVars.isEmpty()) {
            return code;
        }
        StringBuilder javaEnv = new StringBuilder("static { ");
        for (Map.Entry<String, String> env : envVars.entrySet()) {
            javaEnv.append("System.setProperty(\"").append(env.getKey()).append(QUOTE_COMMA_QUOTE)
                   .append(env.getValue().replace("\"", "\\\"")).append("\"); ");
        }
        javaEnv.append("} ");
        return JAVA_CLASS_INSERT_PATTERN.matcher(code).replaceFirst("$1 " + javaEnv);
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
            envFileObj.put("name", "vylop_env_injector.go");
            envFileObj.put("content", goEnv.toString());
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
            envFileObj.put("name", "vylop_env_injector" + ext);
            envFileObj.put("content", cppEnv.toString());
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
            if (!fName.equalsIgnoreCase(mainFileName) && isRelatedFile(fName, language)) {
                Map<String, String> fileObj = new HashMap<>();
                fileObj.put("name", fName);
                fileObj.put("content", entry.getValue());
                extraFiles.add(fileObj);
            }
        }
        return extraFiles;
    }

    boolean isRelatedFile(String fileName, String language) {
        if (fileName == null) return false;
        String lower = fileName.toLowerCase();
        switch (language.toLowerCase()) {
            case "java": return lower.endsWith(".java");
            case LANG_PYTHON: return lower.endsWith(".py");
            case "cpp", "c++", "c": return lower.endsWith(".cpp") || lower.endsWith(".c") || lower.endsWith(".h") || lower.endsWith(".hpp");
            case LANG_JAVASCRIPT: return lower.endsWith(".js");
            case LANG_TYPESCRIPT: return lower.endsWith(".ts");
            case "go": return lower.endsWith(".go");
            case "rust": return lower.endsWith(".rs");
            default: return true;
        }
    }

    private String determineMainFilename(String language, String code, String mainFileName) {
        if ("java".equalsIgnoreCase(language)) {
            return extractJavaClassName(code) + ".java";
        }
        if ("python".equalsIgnoreCase(language)) {
            return "main.py";
        }
        if ("c++".equalsIgnoreCase(language) || "cpp".equalsIgnoreCase(language)) {
            return "main.cpp";
        }
        if ("c".equalsIgnoreCase(language)) {
            return "main.c";
        }
        if ("javascript".equalsIgnoreCase(language)) {
            return "index.js";
        }
        return (mainFileName != null && !mainFileName.isBlank()) ? mainFileName : "main.txt";
    }

    String extractJavaClassName(String code) {
        if (code == null) return "Main";
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
}