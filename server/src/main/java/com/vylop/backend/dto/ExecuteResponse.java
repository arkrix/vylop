package com.vylop.backend.dto;

public class ExecuteResponse {

    private String stdout;
    private String stderr;
    private int exitCode;
    private long executionTimeMs;

    public ExecuteResponse() {
    }

    public ExecuteResponse(String stdout, String stderr, int exitCode, long executionTimeMs) {
        this.stdout = stdout;
        this.stderr = stderr;
        this.exitCode = exitCode;
        this.executionTimeMs = executionTimeMs;
    }

    public String getStdout() {
        return stdout;
    }

    public void setStdout(String stdout) {
        this.stdout = stdout;
    }

    public String getStderr() {
        return stderr;
    }

    public void setStderr(String stderr) {
        this.stderr = stderr;
    }

    public int getExitCode() {
        return exitCode;
    }

    public void setExitCode(int exitCode) {
        this.exitCode = exitCode;
    }

    public long getExecutionTimeMs() {
        return executionTimeMs;
    }

    public void setExecutionTimeMs(long executionTimeMs) {
        this.executionTimeMs = executionTimeMs;
    }
}