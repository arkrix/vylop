package com.vylop.backend.controller;

import com.vylop.backend.dto.ExecuteRequest;
import com.vylop.backend.service.CodeExecutionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/execute")
@CrossOrigin(origins = {"http://localhost:5173", "https://vylop-frontend.onrender.com"})
public class CodeExecutionController {

    private final CodeExecutionService executionService;

    // Memory-Based Rate Limiter: Stores the IP address and the timestamp of their last execution
    private final Map<String, Long> requestCounts = new ConcurrentHashMap<>();
    
    // Cooldown period in milliseconds (3000ms = 3 seconds)
    private static final long COOLDOWN_TIME = 3000;
    private static final int MAX_CODE_LENGTH = 65536; // 64 KB size limit

    public CodeExecutionController(CodeExecutionService executionService) {
        this.executionService = executionService;
    }

    @PostMapping(produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runCode(@RequestBody ExecuteRequest payload, HttpServletRequest request) {
        
        // 1. Rate Limiting Check
        String clientIp = request.getRemoteAddr();
        long currentTime = System.currentTimeMillis();
        
        if (requestCounts.containsKey(clientIp)) {
            long lastRequestTime = requestCounts.get(clientIp);
            if (currentTime - lastRequestTime < COOLDOWN_TIME) {
                long timeLeft = (COOLDOWN_TIME - (currentTime - lastRequestTime)) / 1000 + 1;
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body("Rate limit exceeded. Please wait " + timeLeft + " seconds before running code again.");
            }
        }
        
        // Update last request timestamp
        requestCounts.put(clientIp, currentTime);

        // 2. Validate Inputs & Size Constraints
        if (payload.getLanguage() == null || payload.getLanguage().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("Error: Language parameter is required.");
        }
        if (payload.getCode() == null || payload.getCode().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("Error: Code snippet cannot be empty.");
        }
        if (payload.getCode().length() > MAX_CODE_LENGTH) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("Error: Code payload exceeds maximum size limit (64 KB).");
        }

        String mainFile = payload.getMainFile() != null ? payload.getMainFile() : "Main.java";
        
        // 3. Execute via Cloud Sandbox API (passing all 6 parameters including envVars)
        String result = executionService.executeCode(
                payload.getLanguage(),
                payload.getCode(),
                payload.getStdin(),
                mainFile,
                payload.getFiles(),
                payload.getEnvVars()
        );
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(result);
    }
}