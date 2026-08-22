package com.vylop.backend.dto;

import java.util.Map;

public class ExecuteRequest {

    private String language;
    private String code;
    private String stdin;
    private String input;
    private String mainFile;
    private Map<String, String> files;
    private Map<String, String> envVars;

    public ExecuteRequest() {
    }

    public ExecuteRequest(String language, String code, String stdin, String input, String mainFile, Map<String, String> files, Map<String, String> envVars) {
        this.language = language;
        this.code = code;
        this.stdin = stdin;
        this.input = input;
        this.mainFile = mainFile;
        this.files = files;
        this.envVars = envVars;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getStdin() {
        return stdin != null ? stdin : input;
    }

    public void setStdin(String stdin) {
        this.stdin = stdin;
    }

    public String getInput() {
        return input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getMainFile() {
        return mainFile;
    }

    public void setMainFile(String mainFile) {
        this.mainFile = mainFile;
    }

    public Map<String, String> getFiles() {
        return files;
    }

    public void setFiles(Map<String, String> files) {
        this.files = files;
    }

    public Map<String, String> getEnvVars() {
        return envVars;
    }

    public void setEnvVars(Map<String, String> envVars) {
        this.envVars = envVars;
    }
}