package com.vylop.backend.controller;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.model.RoomParticipant;
import com.vylop.backend.model.UserMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class EditorController {

    private final SimpMessagingTemplate messagingTemplate;

    // Static thread-safe store for room users across active sessions
    private static final Map<String, Map<String, RoomParticipant>> roomUsers = new ConcurrentHashMap<>();

    public EditorController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public static Map<String, Map<String, RoomParticipant>> getRoomUsers() {
        return roomUsers;
    }

    @MessageMapping("/join/{roomId}")
    public void joinRoom(@DestinationVariable String roomId,
                         @Payload UserMessage message,
                         SimpMessageHeaderAccessor headerAccessor) {
        
        String username = message.getSender();
        if (username == null || username.isBlank()) {
            return;
        }

        roomUsers.putIfAbsent(roomId, new ConcurrentHashMap<>());
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        // First user becomes HOST; subsequent users become READ_ONLY by default
        ParticipantRole assignedRole = usersInRoom.isEmpty() ? ParticipantRole.HOST : ParticipantRole.READ_ONLY;
        usersInRoom.put(username, new RoomParticipant(username, assignedRole));

        if (headerAccessor != null && headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", username);
            headerAccessor.getSessionAttributes().put("roomId", roomId);
        }

        UserMessage broadcast = new UserMessage(username, message.getContent(), "JOIN");
        messagingTemplate.convertAndSend("/topic/users/" + roomId, broadcast);
    }

    @MessageMapping("/leave/{roomId}")
    public void leaveRoom(@DestinationVariable String roomId,
                          @Payload UserMessage message) {
        
        String username = message.getSender();
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        if (usersInRoom != null && username != null) {
            RoomParticipant participant = usersInRoom.remove(username);

            // If the HOST leaves, promote the next available participant to HOST
            if (participant != null && participant.getRole() == ParticipantRole.HOST && !usersInRoom.isEmpty()) {
                RoomParticipant nextHost = usersInRoom.values().iterator().next();
                nextHost.setRole(ParticipantRole.HOST);
            }

            if (usersInRoom.isEmpty()) {
                roomUsers.remove(roomId);
            }
        }

        UserMessage broadcast = new UserMessage(username, message.getContent(), "LEAVE");
        messagingTemplate.convertAndSend("/topic/users/" + roomId, broadcast);
    }

    @MessageMapping("/change-role/{roomId}")
    public void changeRole(@DestinationVariable String roomId,
                           @Payload Map<String, String> payload,
                           SimpMessageHeaderAccessor headerAccessor) {
        
        String requester = getRequesterUsername(headerAccessor);
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        if (usersInRoom == null || requester == null) {
            return;
        }

        RoomParticipant requesterParticipant = usersInRoom.get(requester);
        
        // Authorization check: Only HOST can change user roles
        if (requesterParticipant != null && requesterParticipant.getRole() == ParticipantRole.HOST) {
            String targetUser = payload.get("targetUser");
            String newRoleStr = payload.get("newRole");

            if (targetUser != null && newRoleStr != null && usersInRoom.containsKey(targetUser)) {
                try {
                    ParticipantRole newRole = ParticipantRole.valueOf(newRoleStr.toUpperCase());
                    usersInRoom.get(targetUser).setRole(newRole);
                    messagingTemplate.convertAndSend("/topic/roles/" + roomId, usersInRoom);
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
    }

    @MessageMapping("/kick/{roomId}")
    public void kickUser(@DestinationVariable String roomId,
                         @Payload Map<String, String> payload,
                         SimpMessageHeaderAccessor headerAccessor) {
        
        String requester = getRequesterUsername(headerAccessor);
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        if (usersInRoom == null || requester == null) {
            return;
        }

        RoomParticipant requesterParticipant = usersInRoom.get(requester);

        // Authorization check: Only HOST can kick participants
        if (requesterParticipant != null && requesterParticipant.getRole() == ParticipantRole.HOST) {
            String targetUser = payload.get("targetUser");
            
            // Prevent host from kicking themselves
            if (targetUser != null && !targetUser.equals(requester)) {
                usersInRoom.remove(targetUser);
                messagingTemplate.convertAndSend("/topic/kicked/" + roomId, Map.of("kickedUser", targetUser));
            }
        }
    }

    private String getRequesterUsername(SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor != null && headerAccessor.getSessionAttributes() != null) {
            return (String) headerAccessor.getSessionAttributes().get("username");
        }
        return null;
    }
}