package com.vylop.backend.controller;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.model.RoomParticipant;
import com.vylop.backend.service.RoomService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;

@Controller
public class EditorController {

    private static final String KEY_USERNAME = "username";

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomService roomService;

    public EditorController(SimpMessagingTemplate messagingTemplate, RoomService roomService) {
        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
    }

    private void broadcastUserList(String roomId, String type, String username) {
        Map<String, RoomParticipant> usersMap = roomService.getRoomUsers(roomId);
        List<Map<String, Object>> userList = new ArrayList<>();
        
        for (RoomParticipant p : usersMap.values()) {
            Map<String, Object> u = new HashMap<>();
            u.put(KEY_USERNAME, p.getUsername());
            u.put("role", p.getRole().name());
            userList.add(u);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("type", type);
        response.put(KEY_USERNAME, username);
        response.put("users", userList);

        messagingTemplate.convertAndSend("/topic/users/" + roomId, (Object) response);
    }

    @MessageMapping("/room/{roomId}/join")
    public void joinRoom(@DestinationVariable String roomId,
                         @Payload Map<String, Object> payload,
                         SimpMessageHeaderAccessor headerAccessor) {
        
        String username = (String) payload.get(KEY_USERNAME);
        if (username == null || username.isBlank()) return;

        roomService.addUser(roomId, username);

        if (headerAccessor != null) {
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            if (sessionAttributes != null) {
                sessionAttributes.put(KEY_USERNAME, username);
                sessionAttributes.put("roomId", roomId);
            }
        }

        broadcastUserList(roomId, "JOIN", username);
    }

    @MessageMapping("/room/{roomId}/leave")
    public void leaveRoom(@DestinationVariable String roomId,
                          @Payload Map<String, Object> payload) {
        
        String username = (String) payload.get(KEY_USERNAME);
        roomService.removeUser(roomId, username);
        broadcastUserList(roomId, "LEAVE", username);
    }

    @MessageMapping("/room/{roomId}/roleChange")
    public void changeRole(@DestinationVariable String roomId,
                           @Payload Map<String, String> payload) {
        String targetUser = payload.get("targetUser");
        String newRoleStr = payload.get("newRole");

        if (targetUser != null && newRoleStr != null) {
            try {
                ParticipantRole newRole = ParticipantRole.valueOf(newRoleStr.toUpperCase());
                if (roomService.updateRole(roomId, targetUser, newRole)) {
                    broadcastUserList(roomId, "ROLE_UPDATE", targetUser);
                }
            } catch (IllegalArgumentException ignored) {
                // Invalid participant role string is ignored safely
            }
        }
    }

    @MessageMapping("/room/{roomId}/kick")
    public void kickUser(@DestinationVariable String roomId,
                         @Payload Map<String, String> payload) {
        String targetUser = payload.get("targetUser");
        if (targetUser != null) {
            roomService.removeUser(roomId, targetUser);
            broadcastUserList(roomId, "KICK", targetUser);
        }
    }

    @MessageMapping("/chat/{roomId}")
    public void sendChat(@DestinationVariable String roomId, @Payload Map<String, Object> message) {
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, (Object) message);
    }

    @MessageMapping("/typing/{roomId}")
    public void sendTyping(@DestinationVariable String roomId, @Payload Map<String, Object> typing) {
        messagingTemplate.convertAndSend("/topic/typing/" + roomId, (Object) typing);
    }

    @MessageMapping("/cursor/{roomId}")
    public void sendCursor(@DestinationVariable String roomId, @Payload Map<String, Object> cursor) {
        messagingTemplate.convertAndSend("/topic/cursor/" + roomId, (Object) cursor);
    }

    @MessageMapping("/code/{roomId}")
    public void sendCodeMeta(@DestinationVariable String roomId, @Payload Map<String, Object> codeMeta) {
        messagingTemplate.convertAndSend("/topic/code/" + roomId, (Object) codeMeta);
    }

    @MessageMapping("/yjs/{roomId}")
    public void syncYjs(@DestinationVariable String roomId, @Payload Map<String, Object> yjsUpdate) {
        messagingTemplate.convertAndSend("/topic/yjs/" + roomId, (Object) yjsUpdate);
    }
}