package com.vylop.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketSecurityInterceptor webSocketSecurityInterceptor;

    public WebSocketConfig(WebSocketSecurityInterceptor webSocketSecurityInterceptor) {
        this.webSocketSecurityInterceptor = webSocketSecurityInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        //URL: http://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow React to connect
                .withSockJS(); //fallback options
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Messages sent TO the server start with /app
        registry.setApplicationDestinationPrefixes("/app");
        
        // Messages sent FROM the server to clients start with /topic
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketSecurityInterceptor);
    }
}