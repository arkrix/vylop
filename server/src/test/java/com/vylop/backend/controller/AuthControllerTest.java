package com.vylop.backend.controller;

import com.vylop.backend.dto.LoginRequest;
import com.vylop.backend.dto.RegisterRequest;
import com.vylop.backend.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("shardool");
        registerRequest.setEmail("shardool@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("shardool");
        loginRequest.setPassword("password123");
    }

    @Test
    void register_returns200_onSuccess() {
        when(authService.registerUser(registerRequest))
                .thenReturn(Map.of("message", "User registered successfully!", "username", "shardool"));

        ResponseEntity<Map<String, String>> response = authController.register(registerRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("username", "shardool");
    }

    @Test
    void register_returns400_onServiceError() {
        when(authService.registerUser(registerRequest))
                .thenReturn(Map.of("error", "Username is already taken!"));

        ResponseEntity<Map<String, String>> response = authController.register(registerRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("error", "Username is already taken!");
    }

    @Test
    void login_returns200_onSuccess() {
        when(authService.loginUser(loginRequest))
                .thenReturn(Map.of("message", "Logged in successfully!", "username", "shardool"));

        ResponseEntity<Map<String, String>> response = authController.login(loginRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("username", "shardool");
    }

    @Test
    void login_returns401_onServiceError() {
        when(authService.loginUser(loginRequest))
                .thenReturn(Map.of("error", "Invalid username or password!"));

        ResponseEntity<Map<String, String>> response = authController.login(loginRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).containsEntry("error", "Invalid username or password!");
    }
}