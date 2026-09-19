package com.vylop.backend.service;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.model.RoomParticipant;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final Map<String, Map<String, RoomParticipant>> roomUsers = new ConcurrentHashMap<>();

    public Map<String, RoomParticipant> getRoomUsers(String roomId) {
        return roomUsers.getOrDefault(roomId, Collections.emptyMap());
    }

    public synchronized ParticipantRole addUser(String roomId, String username) {
        roomUsers.putIfAbsent(roomId, new ConcurrentHashMap<>());
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);

        ParticipantRole assignedRole = usersInRoom.isEmpty() ? ParticipantRole.HOST : ParticipantRole.READ_ONLY;
        usersInRoom.put(username, new RoomParticipant(username, assignedRole));
        return assignedRole;
    }

    public synchronized Optional<RoomParticipant> removeUser(String roomId, String username) {
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);
        if (usersInRoom == null || username == null) {
            return Optional.empty();
        }

        RoomParticipant removed = usersInRoom.remove(username);
        if (removed != null && removed.getRole() == ParticipantRole.HOST && !usersInRoom.isEmpty()) {
            RoomParticipant nextHost = usersInRoom.values().iterator().next();
            nextHost.setRole(ParticipantRole.HOST);
        }

        if (usersInRoom.isEmpty()) {
            roomUsers.remove(roomId);
        }
        return Optional.ofNullable(removed);
    }

    public synchronized boolean updateRole(String roomId, String targetUser, ParticipantRole newRole) {
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);
        if (usersInRoom != null && usersInRoom.containsKey(targetUser)) {
            usersInRoom.get(targetUser).setRole(newRole);
            return true;
        }
        return false;
    }

    public Optional<ParticipantRole> getRole(String roomId, String username) {
        Map<String, RoomParticipant> usersInRoom = roomUsers.get(roomId);
        if (usersInRoom == null || username == null) {
            return Optional.empty();
        }
        RoomParticipant participant = usersInRoom.get(username);
        return participant != null ? Optional.of(participant.getRole()) : Optional.empty();
    }
}