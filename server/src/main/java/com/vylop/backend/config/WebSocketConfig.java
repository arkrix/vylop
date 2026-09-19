package com.vylop.backend.config;

import com.vylop.backend.security.WebSocketRoleAuthorizationInterceptor;
import com.vylop.backend.security.WebSocketSecurityInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketSecurityInterceptor securityInterceptor;
    private final WebSocketRoleAuthorizationInterceptor roleAuthorizationInterceptor;

    public WebSocketConfig(WebSocketSecurityInterceptor securityInterceptor,
                           WebSocketRoleAuthorizationInterceptor roleAuthorizationInterceptor) {
        this.securityInterceptor = securityInterceptor;
        this.roleAuthorizationInterceptor = roleAuthorizationInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // http://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Authenticate the user from JWT, then check room-level role permissions
        registration.interceptors(securityInterceptor, roleAuthorizationInterceptor);
    }
}