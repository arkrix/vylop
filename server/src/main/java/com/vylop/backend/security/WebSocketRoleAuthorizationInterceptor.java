package com.vylop.backend.security;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.service.RoomService;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WebSocketRoleAuthorizationInterceptor implements ChannelInterceptor {

    private final RoomService roomService;

    // Matches /app/code/{roomId} or /app/yjs/{roomId}
    private static final Pattern CODE_OR_YJS_PATTERN = Pattern.compile("^/app/(code|yjs)/([^/]+)$");
    // Matches /app/room/{roomId}/roleChange or /app/room/{roomId}/kick
    private static final Pattern ADMIN_ACTION_PATTERN = Pattern.compile("^/app/room/([^/]+)/(roleChange|kick)$");

    public WebSocketRoleAuthorizationInterceptor(RoomService roomService) {
        this.roomService = roomService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null) {
                return message;
            }

            Principal user = accessor.getUser();
            String username = user != null ? user.getName() : null;

            // 1. Admin operations: HOST only
            Matcher adminMatcher = ADMIN_ACTION_PATTERN.matcher(destination);
            if (adminMatcher.matches()) {
                String roomId = adminMatcher.group(1);
                ParticipantRole role = getParticipantRole(roomId, username);
                if (role != ParticipantRole.HOST) {
                    throw new AccessDeniedException("Only the room HOST can perform administrative actions.");
                }
            }

            // 2. Code & Yjs CRDT changes: HOST or EDITOR only (deny READ_ONLY)
            Matcher codeMatcher = CODE_OR_YJS_PATTERN.matcher(destination);
            if (codeMatcher.matches()) {
                String roomId = codeMatcher.group(2);
                ParticipantRole role = getParticipantRole(roomId, username);
                if (role == ParticipantRole.READ_ONLY) {
                    throw new AccessDeniedException("READ_ONLY participants cannot mutate room code or CRDT state.");
                }
            }
        }

        return message;
    }

    private ParticipantRole getParticipantRole(String roomId, String username) {
        if (username == null) {
            return ParticipantRole.READ_ONLY;
        }
        return roomService.getRole(roomId, username).orElse(ParticipantRole.READ_ONLY);
    }
}