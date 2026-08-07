package com.vylop.backend.controller;

import com.vylop.backend.dto.AuthResponse;
import com.vylop.backend.dto.LoginRequest;
import com.vylop.backend.dto.RegisterRequest;
import com.vylop.backend.model.User;
import com.vylop.backend.repository.UserRepository;
import com.vylop.backend.security.JwtUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtils jwtUtils,
                          UserDetailsService userDetailsService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody RegisterRequest request) {
        Map<String, String> response = new HashMap<>();

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            response.put("error", "Username already taken.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            response.put("error", "Email already registered.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getUsername());
        response.put("token", token);
        response.put("username", user.getUsername());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest request) {
        Map<String, String> response = new HashMap<>();

        String identifier = request.getUsername() != null && !request.getUsername().isBlank()
                ? request.getUsername()
                : request.getEmail();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, request.getPassword())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(identifier);
        String token = jwtUtils.generateToken(userDetails.getUsername());

        response.put("token", token);
        response.put("username", userDetails.getUsername());

        return ResponseEntity.ok(response);
    }
}