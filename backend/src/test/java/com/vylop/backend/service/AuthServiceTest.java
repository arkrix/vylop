package com.vylop.backend.service;

import com.vylop.backend.dto.LoginRequest;
import com.vylop.backend.dto.RegisterRequest;
import com.vylop.backend.model.User;
import com.vylop.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("shardool");
        registerRequest.setEmail("shardool@example.com");
        registerRequest.setPassword("plaintextPassword");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("shardool");
        loginRequest.setPassword("plaintextPassword");
    }

    @Test
    void registerUser_returnsError_whenUsernameAlreadyTaken() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(new User()));

        Map<String, String> result = authService.registerUser(registerRequest);

        assertThat(result).containsEntry("error", "Username is already taken!");
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerUser_returnsError_whenEmailAlreadyRegistered() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("shardool@example.com")).thenReturn(Optional.of(new User()));

        Map<String, String> result = authService.registerUser(registerRequest);

        assertThat(result).containsEntry("error", "Email is already registered!");
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerUser_succeeds_andHashesPasswordBeforeSaving() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("shardool@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("plaintextPassword")).thenReturn("hashed-value");

        Map<String, String> result = authService.registerUser(registerRequest);

        assertThat(result).containsEntry("message", "User registered successfully!");
        assertThat(result).containsEntry("username", "shardool");

        verify(userRepository).save(argThat(user ->
                user.getUsername().equals("shardool") &&
                user.getEmail().equals("shardool@example.com") &&
                user.getPassword().equals("hashed-value") // never the raw plaintext
        ));
    }

    @Test
    void loginUser_succeeds_withCorrectCredentials() {
        User existingUser = new User();
        existingUser.setUsername("shardool");
        existingUser.setPassword("hashed-value");

        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("plaintextPassword", "hashed-value")).thenReturn(true);

        Map<String, String> result = authService.loginUser(loginRequest);

        assertThat(result).containsEntry("message", "Logged in successfully!");
        assertThat(result).containsEntry("username", "shardool");
    }

    @Test
    void loginUser_fails_whenUserDoesNotExist() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.empty());

        Map<String, String> result = authService.loginUser(loginRequest);

        assertThat(result).containsEntry("error", "Invalid username or password!");
    }

    @Test
    void loginUser_fails_whenPasswordIsIncorrect() {
        User existingUser = new User();
        existingUser.setUsername("shardool");
        existingUser.setPassword("hashed-value");

        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("plaintextPassword", "hashed-value")).thenReturn(false);

        Map<String, String> result = authService.loginUser(loginRequest);

        assertThat(result).containsEntry("error", "Invalid username or password!");
    }

    @Test
    void loginUser_returnsIdenticalErrorMessage_forBothFailureCases() {
        // Verifies the deliberate anti-enumeration behavior: "user not found"
        // and "wrong password" must be indistinguishable to the caller.
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        LoginRequest ghostLogin = new LoginRequest();
        ghostLogin.setUsername("ghost");
        ghostLogin.setPassword("whatever");
        String errorForMissingUser = authService.loginUser(ghostLogin).get("error");

        User existingUser = new User();
        existingUser.setUsername("shardool");
        existingUser.setPassword("hashed-value");
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("plaintextPassword", "hashed-value")).thenReturn(false);
        String errorForWrongPassword = authService.loginUser(loginRequest).get("error");

        assertThat(errorForMissingUser).isEqualTo(errorForWrongPassword);
    }
}