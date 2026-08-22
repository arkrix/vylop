package com.vylop.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EditorControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private EditorController editorController;
    private String roomId;

    @BeforeEach
    void setUp() {
        editorController = new EditorController(messagingTemplate);
        roomId = "test-room-" + System.nanoTime();
    }

    private SimpMessageHeaderAccessor createHeaderAccessor(String username, String roomId) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionAttributes(new HashMap<>());
        accessor.getSessionAttributes().put("username", username);
        accessor.getSessionAttributes().put("roomId", roomId);
        return accessor;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureLatestBroadcast() {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/users/" + roomId), captor.capture());
        return captor.getValue();
    }

    private void joinUser(String username) {
        Map<String, Object> payload = Map.of("username", username);
        editorController.joinRoom(roomId, payload, createHeaderAccessor(username, roomId));
    }

    @Test
    @SuppressWarnings("unchecked")
    void joinRoom_firstUser_becomesHost() {
        joinUser("alice");

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("JOIN");
        assertThat(broadcast.get("username")).isEqualTo("alice");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        assertThat(users).hasSize(1);
        assertThat(users.get(0).get("username")).isEqualTo("alice");
        assertThat(users.get(0).get("role")).isEqualTo("HOST");
    }

    @Test
    @SuppressWarnings("unchecked")
    void joinRoom_secondUser_becomesReadOnly() {
        joinUser("alice");
        joinUser("bob");

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("JOIN");
        assertThat(broadcast.get("username")).isEqualTo("bob");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        assertThat(users).hasSize(2);

        Map<String, Object> alice = users.stream()
                .filter(u -> "alice".equals(u.get("username")))
                .findFirst().orElseThrow();
        Map<String, Object> bob = users.stream()
                .filter(u -> "bob".equals(u.get("username")))
                .findFirst().orElseThrow();

        assertThat(alice.get("role")).isEqualTo("HOST");
        assertThat(bob.get("role")).isEqualTo("READ_ONLY");
    }

    @Test
    @SuppressWarnings("unchecked")
    void leaveRoom_hostLeaving_promotesAnotherUserToHost() {
        joinUser("alice");
        joinUser("bob");

        editorController.leaveRoom(roomId, Map.of("username", "alice"));

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("LEAVE");
        assertThat(broadcast.get("username")).isEqualTo("alice");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        assertThat(users).hasSize(1);
        assertThat(users.get(0).get("username")).isEqualTo("bob");
        assertThat(users.get(0).get("role")).isEqualTo("HOST");
    }

    @Test
    @SuppressWarnings("unchecked")
    void leaveRoom_nonHostLeaving_doesNotChangeHost() {
        joinUser("alice");
        joinUser("bob");

        editorController.leaveRoom(roomId, Map.of("username", "bob"));

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("LEAVE");
        assertThat(broadcast.get("username")).isEqualTo("bob");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        assertThat(users).hasSize(1);
        assertThat(users.get(0).get("username")).isEqualTo("alice");
        assertThat(users.get(0).get("role")).isEqualTo("HOST");
    }

    @Test
    @SuppressWarnings("unchecked")
    void changeRole_updatesRole() {
        joinUser("alice");
        joinUser("bob");

        Map<String, String> payload = Map.of("targetUser", "bob", "newRole", "EDITOR");
        editorController.changeRole(roomId, payload);

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("ROLE_UPDATE");
        assertThat(broadcast.get("username")).isEqualTo("bob");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        Map<String, Object> bob = users.stream()
                .filter(u -> "bob".equals(u.get("username")))
                .findFirst().orElseThrow();
        assertThat(bob.get("role")).isEqualTo("EDITOR");
    }

    @Test
    @SuppressWarnings("unchecked")
    void kickUser_removesUserFromRoom() {
        joinUser("alice");
        joinUser("bob");

        editorController.kickUser(roomId, Map.of("targetUser", "bob"));

        Map<String, Object> broadcast = captureLatestBroadcast();
        assertThat(broadcast.get("type")).isEqualTo("KICK");
        assertThat(broadcast.get("username")).isEqualTo("bob");

        List<Map<String, Object>> users = (List<Map<String, Object>>) broadcast.get("users");
        assertThat(users).noneMatch(u -> "bob".equals(u.get("username")));
    }

    @Test
    void relayEndpoints_broadcastToExpectedTopics() {
        Map<String, Object> message = Map.of("text", "hello");
        editorController.sendChat(roomId, message);
        verify(messagingTemplate).convertAndSend("/topic/chat/" + roomId, message);

        Map<String, Object> typing = Map.of("typing", true);
        editorController.sendTyping(roomId, typing);
        verify(messagingTemplate).convertAndSend("/topic/typing/" + roomId, typing);

        Map<String, Object> cursor = Map.of("x", 10, "y", 20);
        editorController.sendCursor(roomId, cursor);
        verify(messagingTemplate).convertAndSend("/topic/cursor/" + roomId, cursor);

        Map<String, Object> code = Map.of("code", "print(1)");
        editorController.sendCodeMeta(roomId, code);
        verify(messagingTemplate).convertAndSend("/topic/code/" + roomId, code);

        Map<String, Object> yjs = Map.of("update", "binary");
        editorController.syncYjs(roomId, yjs);
        verify(messagingTemplate).convertAndSend("/topic/yjs/" + roomId, yjs);
    }
}