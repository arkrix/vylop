package com.vylop.backend.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class CodeExecutionServiceTest {

    private final CodeExecutionService service = new CodeExecutionService();

    @Test
    void extractsPublicClassName() {
        String code = "public class Solution { public static void main(String[] args) {} }";
        assertThat(service.extractJavaClassName(code)).isEqualTo("Solution");
    }

    @Test
    void fallsBackToNonPublicClassName() {
        String code = "class Helper { void run() {} }";
        assertThat(service.extractJavaClassName(code)).isEqualTo("Helper");
    }

    @Test
    void defaultsToMainWhenNoClassFound() {
        // Deliberately avoids the literal word "class" anywhere, including in comments,
        // since the fallback regex pattern-matches raw text and cannot distinguish
        // real code from a comment.
        String code = "// nothing here but a stray comment and some whitespace";
        assertThat(service.extractJavaClassName(code)).isEqualTo("Main");
    }

    @Test
    void isRelatedFileMatchesCorrectExtension() {
        assertThat(service.isRelatedFile("Helper.java", "java")).isTrue();
        assertThat(service.isRelatedFile("script.py", "java")).isFalse();
    }
}