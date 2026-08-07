package com.vylop.backend.controller;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.model.RoomParticipant;
import com.vylop.backend.model.UserMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EditorControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private EditorController editorController;

    private static final String ROOM_ID = "test-room-" + System.nanoTime();

    @BeforeEach
    void setUp() {
        editorController = new EditorController(messagingTemplate);
        // roomUsers is static and shared — always start each test from a clean slate
        EditorController.getRoomUsers().clear();
    }

    @AfterEach
    void tearDown() {
        EditorController.getRoomUsers().clear();
    }

    private SimpMessageHeaderAccessor accessorFor(String username, String roomId) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionAttributes(new HashMap<>());
        accessor.getSessionAttributes().put("username", username);
        accessor.getSessionAttributes().put("roomId", roomId);
        return accessor;
    }

    private UserMessage joinRoomAndCaptureBroadcast(String username) {
        editorController.joinRoom(ROOM_ID, new UserMessage(username, null, "JOIN"), accessorFor(username, ROOM_ID));

        ArgumentCaptor<UserMessage> captor = ArgumentCaptor.forClass(UserMessage.class);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/users/" + ROOM_ID), captor.capture());
        return captor.getValue();
    }

    @Test
    void joinRoom_firstUser_becomesHost() {
        UserMessage response = joinRoomAndCaptureBroadcast("alice");

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom.get("alice").getRole()).isEqualTo(ParticipantRole.HOST);
        assertThat(response.getType()).isEqualTo("JOIN");
    }

    @Test
    void joinRoom_secondUser_becomesReadOnly() {
        joinRoomAndCaptureBroadcast("alice");
        joinRoomAndCaptureBroadcast("bob");

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom.get("alice").getRole()).isEqualTo(ParticipantRole.HOST);
        assertThat(usersInRoom.get("bob").getRole()).isEqualTo(ParticipantRole.READ_ONLY);
    }

    @Test
    void leaveRoom_hostLeaving_promotesAnotherUserToHost() {
        joinRoomAndCaptureBroadcast("alice");
        joinRoomAndCaptureBroadcast("bob");

        editorController.leaveRoom(ROOM_ID, new UserMessage("alice", null, "LEAVE"));

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom).doesNotContainKey("alice");
        assertThat(usersInRoom.get("bob").getRole()).isEqualTo(ParticipantRole.HOST);
    }

    @Test
    void leaveRoom_nonHostLeaving_doesNotChangeHost() {
        joinRoomAndCaptureBroadcast("alice"); // HOST
        joinRoomAndCaptureBroadcast("bob");   // READ_ONLY

        editorController.leaveRoom(ROOM_ID, new UserMessage("bob", null, "LEAVE"));

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom).doesNotContainKey("bob");
        assertThat(usersInRoom.get("alice").getRole()).isEqualTo(ParticipantRole.HOST);
    }

    @Test
    void changeRole_succeeds_whenRequesterIsHost() {
        joinRoomAndCaptureBroadcast("alice"); // HOST
        joinRoomAndCaptureBroadcast("bob");   // READ_ONLY

        Map<String, String> payload = Map.of("targetUser", "bob", "newRole", "EDITOR");
        editorController.changeRole(ROOM_ID, payload, accessorFor("alice", ROOM_ID));

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom.get("bob").getRole()).isEqualTo(ParticipantRole.EDITOR);
    }

    @Test
    void changeRole_isRejected_whenRequesterIsNotHost() {
        joinRoomAndCaptureBroadcast("alice"); // HOST
        joinRoomAndCaptureBroadcast("bob");   // READ_ONLY

        Map<String, String> payload = Map.of("targetUser", "bob", "newRole", "EDITOR");
        editorController.changeRole(ROOM_ID, payload, accessorFor("bob", ROOM_ID)); // bob tries to promote himself

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom.get("bob").getRole()).isEqualTo(ParticipantRole.READ_ONLY); // unchanged
    }

    @Test
    void kickUser_succeeds_whenRequesterIsHost() {
        joinRoomAndCaptureBroadcast("alice"); // HOST
        joinRoomAndCaptureBroadcast("bob");   // READ_ONLY

        editorController.kickUser(ROOM_ID, Map.of("targetUser", "bob"), accessorFor("alice", ROOM_ID));

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom).doesNotContainKey("bob");
    }

    @Test
    void kickUser_isRejected_whenRequesterIsNotHost() {
        joinRoomAndCaptureBroadcast("alice"); // HOST
        joinRoomAndCaptureBroadcast("bob");   // READ_ONLY

        editorController.kickUser(ROOM_ID, Map.of("targetUser", "alice"), accessorFor("bob", ROOM_ID)); // bob tries to kick the host

        Map<String, RoomParticipant> usersInRoom = EditorController.getRoomUsers().get(ROOM_ID);
        assertThat(usersInRoom).containsKey("alice"); // still there, kick rejected
    }
}