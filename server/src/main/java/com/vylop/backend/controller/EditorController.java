package com.vylop.backend.controller;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.model.RoomParticipant;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class EditorController {

    private final SimpMessagingTemplate messagingTemplate;
    private static final Map<String, Map<String, RoomParticipant>> roomUsers = new ConcurrentHashMap<>();

    public EditorController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    private void broadcastUserList(String roomId, String type, String username) {
        Map<String, RoomParticipant> usersMap = roomUsers.getOrDefault(roomId, Collections.emptyMap());
        List<Map<String, Object>> userList = new ArrayList<>();
        
        for (RoomParticipant p : usersMap.values()) {
            Map<String, Object> u = new HashMap<>();
            u.put("username", p.getUsername());
            u.put("role", p.getRole().name());
            userList.add(u);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("type", type);
        response.put("username", username);
        response.put("users", userList);

        messagingTemplate.convertAndSend("/topic/users/" + roomId, response);
    }

    @MessageMapping("/room/{roomId}/join")
    public void joinRoom(@DestinationVariable String roomId,
                         @Payload Map<String, Object> payload,
                         SimpMessageHeaderAccessor headerAccessor) {
        
        String username = (String) payload.get("username");
        if (username == null || username.isBlank()) return;

        roomUsers.putIfAbsent(roomId, new ConcurrentHashMap<>());
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        ParticipantRole assignedRole = usersInRoom.isEmpty() ? ParticipantRole.HOST : ParticipantRole.READ_ONLY;
        usersInRoom.put(username, new RoomParticipant(username, assignedRole));

        if (headerAccessor != null && headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", username);
            headerAccessor.getSessionAttributes().put("roomId", roomId);
        }

        broadcastUserList(roomId, "JOIN", username);
    }

    @MessageMapping("/room/{roomId}/leave")
    public void leaveRoom(@DestinationVariable String roomId,
                          @Payload Map<String, Object> payload) {
        
        String username = (String) payload.get("username");
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        if (usersInRoom != null && username != null) {
            RoomParticipant participant = usersInRoom.remove(username);

            if (participant != null && participant.getRole() == ParticipantRole.HOST && !usersInRoom.isEmpty()) {
                RoomParticipant nextHost = usersInRoom.values().iterator().next();
                nextHost.setRole(ParticipantRole.HOST);
            }

            if (usersInRoom.isEmpty()) {
                roomUsers.remove(roomId);
            }
        }

        broadcastUserList(roomId, "LEAVE", username);
    }

    @MessageMapping("/room/{roomId}/roleChange")
    public void changeRole(@DestinationVariable String roomId,
                           @Payload Map<String, String> payload) {
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);
        if (usersInRoom == null) return;

        String targetUser = payload.get("targetUser");
        String newRoleStr = payload.get("newRole");

        if (targetUser != null && newRoleStr != null && usersInRoom.containsKey(targetUser)) {
            try {
                ParticipantRole newRole = ParticipantRole.valueOf(newRoleStr.toUpperCase());
                usersInRoom.get(targetUser).setRole(newRole);
                broadcastUserList(roomId, "ROLE_UPDATE", targetUser);
            } catch (IllegalArgumentException ignored) {}
        }
    }

    @MessageMapping("/room/{roomId}/kick")
    public void kickUser(@DestinationVariable String roomId,
                         @Payload Map<String, String> payload) {
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);
        if (usersInRoom == null) return;

        String targetUser = payload.get("targetUser");
        if (targetUser != null) {
            usersInRoom.remove(targetUser);
            broadcastUserList(roomId, "KICK", targetUser);
        }
    }

    @MessageMapping("/chat/{roomId}")
    public void sendChat(@DestinationVariable String roomId, @Payload Map<String, Object> message) {
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, message);
    }

    @MessageMapping("/typing/{roomId}")
    public void sendTyping(@DestinationVariable String roomId, @Payload Map<String, Object> typing) {
        messagingTemplate.convertAndSend("/topic/typing/" + roomId, typing);
    }

    @MessageMapping("/cursor/{roomId}")
    public void sendCursor(@DestinationVariable String roomId, @Payload Map<String, Object> cursor) {
        messagingTemplate.convertAndSend("/topic/cursor/" + roomId, cursor);
    }

    @MessageMapping("/code/{roomId}")
    public void sendCodeMeta(@DestinationVariable String roomId, @Payload Map<String, Object> codeMeta) {
        messagingTemplate.convertAndSend("/topic/code/" + roomId, codeMeta);
    }

    @MessageMapping("/yjs/{roomId}")
    public void syncYjs(@DestinationVariable String roomId, @Payload Map<String, Object> yjsUpdate) {
        messagingTemplate.convertAndSend("/topic/yjs/" + roomId, yjsUpdate);
    }
}